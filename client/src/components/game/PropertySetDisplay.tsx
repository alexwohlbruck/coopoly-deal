import { useRef, useCallback, useState } from "react";
import {
  CardType,
  PropertyColor,
  PROPERTY_COLOR_HEX,
  SET_SIZE,
  isSetComplete,
} from "../../types/game";
import type { PropertySet, Card } from "../../types/game";
import { GameCard } from "../cards/GameCard";
import { motion, AnimatePresence } from "framer-motion";
import {
  findDropZoneAt,
  setActiveDropZone,
  type TouchDropSpec,
} from "../../utils/drop-zone";

const DRAG_THRESHOLD = 8; // px of movement before drag activates

interface PropertySetDisplayProps {
  set: PropertySet;
  onWildcardClick?: (card: Card, currentColor: PropertyColor) => void;
  isYou: boolean;
  isCurrentTurn: boolean;
  isDragOver?: boolean;
  useSocialistTheme?: boolean;
  cardWidth?: number;
  /** Drop-target visual cue: 'valid' = green ring, 'invalid' = red ring. */
  dropTarget?: "valid" | "invalid" | null;

  // ── Unified pointer-drag callbacks (mouse + touch) ────────────
  /** Fired when the user drags a wildcard to a drop zone. */
  onWildcardDrop?: (
    card: Card,
    sourceColor: PropertyColor,
    targetSpec: TouchDropSpec,
  ) => void;
  /** Fired when wildcard drag starts/ends, so parent can set draggingCard. */
  onDragActiveChange?: (isDragging: boolean, card: Card | null) => void;
}

/**
 * A stacked "house" of property cards in one color, mirroring the design's
 * skeuomorphic stack: cards overlap so each card's color banner peeks out
 * from underneath the one above it. Progress badge sits on top.
 */
export function PropertySetDisplay({
  set,
  onWildcardClick,
  isYou,
  isCurrentTurn,
  isDragOver,
  useSocialistTheme = false,
  cardWidth = 88,
  dropTarget = null,
  onWildcardDrop,
  onDragActiveChange,
}: PropertySetDisplayProps) {
  const cardW = cardWidth;
  const compact = cardWidth < 88;
  const overlap = compact ? 22 : 28;
  const cardH = Math.round(cardW * 1.5);
  const allCards = [
    ...set.cards,
    ...(set.house ? [set.house] : []),
    ...(set.hotel ? [set.hotel] : []),
  ];
  const complete = isSetComplete(set);
  const needed = SET_SIZE[set.color] ?? 3;
  const bandHex =
    PROPERTY_COLOR_HEX[set.color] ?? PROPERTY_COLOR_HEX[PropertyColor.Brown];
  const bandFg =
    set.color === PropertyColor.Yellow ||
    set.color === PropertyColor.LightBlue
      ? "#3a2a08"
      : "#fff";

  const getCardOrientation = (card: Card): "top" | "bottom" | undefined => {
    if (
      card.type !== CardType.PropertyWildcard ||
      !card.colors ||
      card.colors.length !== 2
    ) {
      return undefined;
    }
    return card.colors[1] === set.color ? "bottom" : "top";
  };

  // ── Drop ring ─────────────────────────────────────────────────
  const dropRing =
    dropTarget === "valid"
      ? "#7adb88"
      : dropTarget === "invalid"
        ? "#e26a6a"
        : isDragOver
          ? "#7adb88"
          : null;
  const completeShadow =
    "inset 0 0 0 1px rgba(212,168,96,0.28), inset 0 1px 0 rgba(255,225,170,0.12), 0 0 0 1px rgba(212,168,96,0.12)";
  const restShadow = "inset 0 0 0 1px rgba(255,255,255,0.04)";
  const finalShadow = dropRing
    ? `0 0 0 2px ${dropRing}, inset 0 0 0 1px rgba(255,255,255,0.05)`
    : complete
      ? completeShadow
      : restShadow;

  // ── Pointer-based wildcard drag ───────────────────────────────
  // Works on both mouse and touch via unified PointerEvent API.
  // Uses elementsFromPoint + [data-touch-drop] for zone detection,
  // the same system that DragPeekHand (hand cards) uses.

  const dragRef = useRef<{
    card: Card;
    pointerId: number;
    startX: number;
    startY: number;
    isDragging: boolean;
    ghostEl: HTMLElement | null;
    sourceEl: HTMLElement | null;
    activeZone: HTMLElement | null;
  } | null>(null);

  // Track which card id is being dragged (for dimming the source).
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);

  const cleanupDrag = useCallback(() => {
    const s = dragRef.current;
    if (!s) return;
    if (s.ghostEl) {
      s.ghostEl.remove();
      s.ghostEl = null;
    }
    if (s.sourceEl) {
      s.sourceEl.style.opacity = "";
    }
    setActiveDropZone(s.activeZone, null);
    s.activeZone = null;
    if (s.isDragging) {
      onDragActiveChange?.(false, null);
    }
    setDraggingCardId(null);
    dragRef.current = null;
  }, [onDragActiveChange]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, card: Card, sourceEl: HTMLElement | null) => {
      // Only primary button (left click / single touch)
      if (e.button !== 0) return;
      // Prevent text selection & browser default touch behaviors
      e.preventDefault();
      e.stopPropagation();

      dragRef.current = {
        card,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        isDragging: false,
        ghostEl: null,
        sourceEl,
        activeZone: null,
      };

      // Capture pointer so we get move/up events even if pointer
      // leaves the element (or the card is small).
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const s = dragRef.current;
      if (!s) return;

      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;

      if (!s.isDragging) {
        // Check threshold
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        // Activate drag
        s.isDragging = true;
        setDraggingCardId(s.card.id);
        onDragActiveChange?.(true, s.card);
        // Dim source card
        if (s.sourceEl) {
          s.sourceEl.style.opacity = "0.35";
        }
        // Create ghost by cloning the source card element
        if (s.sourceEl) {
          const ghost = s.sourceEl.cloneNode(true) as HTMLElement;
          ghost.style.cssText = `
            position: fixed;
            pointer-events: none;
            z-index: 9999;
            width: ${cardW}px;
            opacity: 0.9;
            filter: drop-shadow(0 8px 16px rgba(0,0,0,0.4));
            transform-origin: center center;
            transform: translate(${e.clientX - cardW / 2}px, ${e.clientY - cardH / 2}px) rotate(-3deg) scale(1.08);
            transition: none;
            will-change: transform;
          `;
          document.body.appendChild(ghost);
          s.ghostEl = ghost;
        }
      }

      // Update ghost position (direct DOM mutation for 60fps)
      if (s.ghostEl) {
        s.ghostEl.style.transform = `translate(${e.clientX - cardW / 2}px, ${e.clientY - cardH / 2}px) rotate(-3deg) scale(1.08)`;
      }

      // Detect drop zone under pointer
      const zone = findDropZoneAt(e.clientX, e.clientY);
      setActiveDropZone(s.activeZone, zone?.el ?? null);
      s.activeZone = zone?.el ?? null;
    },
    [cardW, cardH, onDragActiveChange],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const s = dragRef.current;
      if (!s) return;

      if (s.isDragging) {
        // Detect final drop zone
        const zone = findDropZoneAt(e.clientX, e.clientY);
        if (zone && onWildcardDrop) {
          onWildcardDrop(s.card, set.color, zone.spec);
        }
        cleanupDrag();
      } else {
        // Short tap (no drag) → fire click handler for flip dialog
        cleanupDrag();
        if (onWildcardClick) {
          onWildcardClick(s.card, set.color);
        }
      }
    },
    [set.color, onWildcardDrop, onWildcardClick, cleanupDrag],
  );

  const handlePointerCancel = useCallback(() => {
    cleanupDrag();
  }, [cleanupDrag]);

  // Card refs for cloning into ghost
  const cardElRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  return (
    <div
      data-property-drop-zone={set.color}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "6px 8px 4px",
        borderRadius: 10,
        background: complete ? "rgba(0,0,0,0.16)" : "rgba(0,0,0,0.08)",
        boxShadow: finalShadow,
        transition: "box-shadow var(--d-quick) var(--ease-out-soft)",
      }}
    >
      {/* progress badge */}
      {set.color !== PropertyColor.Unassigned && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "2px 8px",
            borderRadius: 999,
            background: complete ? bandHex : "rgba(0,0,0,0.4)",
            color: complete ? bandFg : "rgba(255,255,255,0.85)",
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: "0.06em",
            boxShadow: complete
              ? "inset 0 1px 0 rgba(255,255,255,0.2)"
              : "inset 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 2,
              background: complete ? "rgba(255,255,255,0.7)" : bandHex,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
              flexShrink: 0,
            }}
          />
          <span style={{ lineHeight: 1 }}>
            {set.cards.length}/{needed}
          </span>
          {complete && (
            <span
              style={{
                marginLeft: 2,
                fontSize: 8,
                lineHeight: 1,
                letterSpacing: "0.1em",
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <span style={{ fontSize: 9 }}>✓</span>
              <span>SET</span>
            </span>
          )}
        </div>
      )}

      {/* Card stack */}
      <div
        style={{
          position: "relative",
          width: cardW,
          height: cardH + Math.max(0, allCards.length - 1) * overlap,
        }}
      >
        <AnimatePresence initial={false}>
          {allCards.map((card, i) => {
            const tilt = (i % 2 === 0 ? -1 : 1) * 0.5;
            const isDraggable =
              isYou && isCurrentTurn && card.type === CardType.PropertyWildcard;
            return (
              <motion.div
                key={card.id ?? i}
                ref={(el) => {
                  if (el) cardElRefs.current.set(card.id, el);
                  else cardElRefs.current.delete(card.id);
                }}
                initial={{ opacity: 0, y: -18, scale: 0.94 }}
                animate={{
                  opacity:
                    draggingCardId === card.id ? 0.35 : 1,
                  y: 0,
                  scale: 1,
                  rotate: tilt,
                }}
                exit={{ opacity: 0, y: 14, scale: 0.94 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                style={{
                  position: "absolute",
                  left: 0,
                  top: i * overlap,
                  cursor: isDraggable ? "grab" : "default",
                  // Prevent browser gestures (scroll, back-swipe) while
                  // dragging a wildcard — required for pointer capture.
                  touchAction: isDraggable ? "none" : undefined,
                }}
                // Pointer-based drag for wildcards (mouse + touch)
                onPointerDown={
                  isDraggable
                    ? (e) =>
                        handlePointerDown(
                          e as unknown as React.PointerEvent,
                          card,
                          cardElRefs.current.get(card.id) ?? null,
                        )
                    : undefined
                }
                onPointerMove={
                  isDraggable
                    ? (e) =>
                        handlePointerMove(
                          e as unknown as React.PointerEvent,
                        )
                    : undefined
                }
                onPointerUp={
                  isDraggable
                    ? (e) =>
                        handlePointerUp(
                          e as unknown as React.PointerEvent,
                        )
                    : undefined
                }
                onPointerCancel={isDraggable ? handlePointerCancel : undefined}
              >
                <GameCard
                  card={card}
                  width={cardW}
                  orientation={getCardOrientation(card)}
                  useSocialistTheme={useSocialistTheme}
                  disableHover
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
