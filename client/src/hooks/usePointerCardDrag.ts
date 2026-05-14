// Unified pointer-based card drag hook.
// Replaces the HTML5 drag-and-drop system with pointer events that
// work identically on mouse and touch. Creates a ghost clone that
// follows the pointer and uses the same [data-touch-drop] zone
// detection as the touch drag (DragPeekHand) and wildcard rearrangement
// (PropertySetDisplay).

import { useRef, useEffect, useCallback } from "react";
import type { Card } from "../types/game";
import {
  findDropZoneAt,
  setActiveDropZone,
  type TouchDropSpec,
} from "../utils/drop-zone";

const DRAG_THRESHOLD = 8; // px of movement before drag activates

interface DragState {
  card: Card;
  startX: number;
  startY: number;
  isDragging: boolean;
  ghostEl: HTMLElement | null;
  sourceEl: HTMLElement;
  activeZone: HTMLElement | null;
}

export interface PointerCardDragOptions {
  /** Called when the card is dropped on a valid zone. */
  onDrop?: (card: Card, spec: TouchDropSpec) => void;
  /** Called when drag activates (after threshold). */
  onDragStart?: (card: Card) => void;
  /** Called when drag ends (drop or cancel). */
  onDragEnd?: () => void;
  /** Card dimensions for ghost sizing/centering. */
  cardWidth?: number;
  cardHeight?: number;
}

/**
 * Returns a `startDrag` function to call from a card element's
 * `onPointerDown`. The hook manages document-level pointermove/up
 * listeners while a drag is active, so only the initiating element
 * needs an event handler.
 */
export function usePointerCardDrag({
  onDrop,
  onDragStart,
  onDragEnd,
  cardWidth = 116,
  cardHeight = 174,
}: PointerCardDragOptions) {
  // Keep callbacks in refs so the document-level listeners never
  // reference stale closures.
  const onDropRef = useRef(onDrop);
  const onDragStartRef = useRef(onDragStart);
  const onDragEndRef = useRef(onDragEnd);
  const cardWRef = useRef(cardWidth);
  const cardHRef = useRef(cardHeight);

  useEffect(() => {
    onDropRef.current = onDrop;
  }, [onDrop]);
  useEffect(() => {
    onDragStartRef.current = onDragStart;
  }, [onDragStart]);
  useEffect(() => {
    onDragEndRef.current = onDragEnd;
  }, [onDragEnd]);
  useEffect(() => {
    cardWRef.current = cardWidth;
  }, [cardWidth]);
  useEffect(() => {
    cardHRef.current = cardHeight;
  }, [cardHeight]);

  const stateRef = useRef<DragState | null>(null);

  const cleanup = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    if (s.ghostEl) {
      s.ghostEl.remove();
      s.ghostEl = null;
    }
    if (s.sourceEl) {
      s.sourceEl.style.opacity = "";
    }
    setActiveDropZone(s.activeZone, null);
    if (s.isDragging) {
      onDragEndRef.current?.();
    }
    stateRef.current = null;
  }, []);

  // Stable document-level listeners (never recreated).
  const handleMove = useCallback((e: PointerEvent) => {
    const s = stateRef.current;
    if (!s) return;

    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;

    if (!s.isDragging) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      // Activate drag
      s.isDragging = true;
      onDragStartRef.current?.(s.card);

      // Create ghost clone
      const ghost = s.sourceEl.cloneNode(true) as HTMLElement;
      const cw = cardWRef.current;
      ghost.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 9999;
        width: ${cw}px;
        opacity: 0.92;
        filter: drop-shadow(0 8px 16px rgba(0,0,0,0.45));
        transform-origin: center center;
        transform: translate(${e.clientX - cw / 2}px, ${e.clientY - cardHRef.current / 2}px) rotate(-3deg) scale(1.08);
        transition: none;
        will-change: transform;
      `;
      document.body.appendChild(ghost);
      s.ghostEl = ghost;

      // Dim the source card
      s.sourceEl.style.opacity = "0.35";
    }

    // Update ghost position
    if (s.ghostEl) {
      const cw = cardWRef.current;
      const ch = cardHRef.current;
      s.ghostEl.style.transform = `translate(${e.clientX - cw / 2}px, ${e.clientY - ch / 2}px) rotate(-3deg) scale(1.08)`;
    }

    // Detect drop zone under pointer
    const zone = findDropZoneAt(e.clientX, e.clientY);
    setActiveDropZone(s.activeZone, zone?.el ?? null);
    s.activeZone = zone?.el ?? null;
  }, []);

  const handleUp = useCallback(
    (e: PointerEvent) => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);

      const s = stateRef.current;
      if (!s) return;

      if (s.isDragging) {
        const zone = findDropZoneAt(e.clientX, e.clientY);
        const card = s.card;
        cleanup();
        if (zone) {
          onDropRef.current?.(card, zone.spec);
        }
      } else {
        // Short tap — no drag occurred. Clean up silently; the
        // element's onClick handler will fire normally.
        cleanup();
      }
    },
    [handleMove, cleanup],
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
      cleanup();
    };
  }, [handleMove, handleUp, cleanup]);

  /**
   * Call from a card element's `onPointerDown`. The element should have
   * `touch-action: none` to prevent the browser from interpreting the
   * gesture as scroll/back-swipe.
   */
  const startDrag = useCallback(
    (e: React.PointerEvent, card: Card) => {
      // Only primary button (left click / single touch)
      if (e.button !== 0) return;
      e.preventDefault();

      stateRef.current = {
        card,
        startX: e.clientX,
        startY: e.clientY,
        isDragging: false,
        ghostEl: null,
        sourceEl: e.currentTarget as HTMLElement,
        activeZone: null,
      };

      document.addEventListener("pointermove", handleMove);
      document.addEventListener("pointerup", handleUp);
    },
    [handleMove, handleUp],
  );

  return { startDrag };
}
