import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Card } from "../../types/game";
import { GameCard, CardBack } from "./GameCard";
import { useHaptics } from "../../hooks/useHaptics";

// ────────────────────────────────────────────────────────────────────
// FannedCards — collapsed-by-default fan that expands on hover/tap.
// Used in compact card displays (player areas, end-game stats, etc.).
// ────────────────────────────────────────────────────────────────────

interface FannedCardsProps {
  cards: Card[];
  cardWidth?: number; // Target card width (will scale down if needed)
  showBacks?: boolean;
  maxVisible?: number;
  onCardClick?: (card: Card) => void;
  onDragStart?: (e: React.DragEvent, card: Card) => void;
  onDragEnd?: () => void;
  draggable?: (card: Card) => boolean;
  orientation?: "top" | "bottom";
  getCardOrientation?: (card: Card) => "top" | "bottom" | undefined;
  useSocialistTheme?: boolean;
}

export function FannedCards({
  cards,
  cardWidth: targetCardWidth = 96, // Default target width
  showBacks = false,
  maxVisible = 10,
  onCardClick,
  onDragStart,
  onDragEnd,
  draggable,
  orientation,
  getCardOrientation,
  useSocialistTheme = false,
}: FannedCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [collapseTimeout, setCollapseTimeout] = useState<number | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const cardCount = cards.length;
  const visibleCount = Math.min(cardCount, maxVisible);

  // Detect touch device
  useEffect(() => {
    setIsTouchDevice(
      "ontouchstart" in window || navigator.maxTouchPoints > 0,
    );
  }, []);

  // Card dimensions (aspect ratio 2:3)
  const CARD_WIDTH = targetCardWidth;
  const CARD_HEIGHT = targetCardWidth * 1.5;
  const COLLAPSED_SPREAD = targetCardWidth * 0.125; // 12.5% of card width
  const EXPANDED_SPREAD = CARD_WIDTH + 4;
  const spread = isHovered || isExpanded ? EXPANDED_SPREAD : COLLAPSED_SPREAD;

  // Calculate scale to fit container
  useEffect(() => {
    if (!containerRef.current || visibleCount === 0) return;

    const updateScale = () => {
      const containerWidth = containerRef.current!.offsetWidth;
      const requiredWidth = CARD_WIDTH + (visibleCount - 1) * COLLAPSED_SPREAD;
      const newScale = Math.min(1, containerWidth / requiredWidth);
      setScale(newScale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [visibleCount, CARD_WIDTH, COLLAPSED_SPREAD]);

  const scaledCardWidth = CARD_WIDTH * scale;
  const scaledCardHeight = CARD_HEIGHT * scale;
  const scaledSpread = spread * scale;

  // Handle tap to expand on mobile
  const handleTap = () => {
    if (!isTouchDevice) return;

    if (isExpanded) {
      return;
    }

    setIsExpanded(true);
    if (collapseTimeout) {
      window.clearTimeout(collapseTimeout);
    }
    const timeout = window.setTimeout(() => {
      setIsExpanded(false);
    }, 3000);
    setCollapseTimeout(timeout);
  };

  const handleCardClick = (card: Card) => {
    if (isTouchDevice && !isExpanded) {
      handleTap();
      return;
    }
    if (onCardClick) {
      onCardClick(card);
    }
  };

  const getTransform = (index: number) => {
    const totalWidth = (visibleCount - 1) * scaledSpread;
    const centerOffset = -totalWidth / 2;
    const x = centerOffset + index * scaledSpread;

    return {
      x,
      y: 0,
      rotate: 0,
      scale: 1,
      zIndex: isHovered || isExpanded ? 100 + index : index,
    };
  };

  if (cardCount === 0) return null;

  const containerWidth =
    scaledCardWidth + (visibleCount - 1) * (COLLAPSED_SPREAD * scale);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center w-full"
      style={{
        minWidth: `${containerWidth}px`,
        height: `${scaledCardHeight}px`,
        zIndex: isHovered || isExpanded ? 100 : "auto",
      }}
      onMouseEnter={() => !isTouchDevice && setIsHovered(true)}
      onMouseLeave={() => !isTouchDevice && setIsHovered(false)}
      onClick={handleTap}
    >
      {cards.slice(0, maxVisible).map((card, index) => {
        const isDraggable = draggable ? draggable(card) : false;
        return (
          <motion.div
            key={card.id}
            className={`absolute ${isDraggable ? "cursor-grab active:cursor-grabbing touch-none" : ""}`}
            initial={{ opacity: 1 }}
            animate={getTransform(index)}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            draggable={isDraggable}
            onDragStart={(e) => {
              if (isDraggable && onDragStart) {
                onDragStart(e as unknown as React.DragEvent, card);
              }
            }}
            onDragEnd={() => {
              if (isDraggable && onDragEnd) {
                onDragEnd();
              }
            }}
            style={{
              transformOrigin: "center center",
              left: "50%",
              top: "50%",
              marginLeft: `${-scaledCardWidth / 2}px`,
              marginTop: `${-scaledCardHeight / 2}px`,
            }}
          >
            {showBacks ? (
              <CardBack
                scale={scale}
                useSocialistTheme={useSocialistTheme}
                width={CARD_WIDTH}
              />
            ) : (
              <GameCard
                card={card}
                onClick={onCardClick ? () => handleCardClick(card) : undefined}
                orientation={
                  getCardOrientation ? getCardOrientation(card) : orientation
                }
                scale={scale}
                useSocialistTheme={useSocialistTheme}
                width={CARD_WIDTH}
              />
            )}
          </motion.div>
        );
      })}

      {cardCount > maxVisible && (
        <div className="absolute -bottom-2 -right-2 bg-gray-800 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2 border-white z-50">
          +{cardCount - maxVisible}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// HoverFanHand — desktop hand display.
// Cards arc-fan along the bottom. As the cursor moves over the rail,
// the nearest card is "peeked": lifted, un-rotated, vertically centered
// in the fan. Non-peeked neighbors slide aside to make room.
// Spread is dynamic — more cards = tighter spacing — so the whole fan
// always fits within its container at any count.
// ────────────────────────────────────────────────────────────────────

export interface HandRenderItem {
  id: string;
  /** Pre-rendered card element (caller controls width/orientation/disabled). */
  node: React.ReactNode;
  /** Whether this card is legal to play this turn. Drives illegal styling AND blocks drag/click. */
  legal?: boolean;
  /** Drag/drop hooks (per-card, optional). */
  draggable?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

interface HoverFanHandProps {
  items: HandRenderItem[];
  spread?: number | null;
  selectedId?: string | null;
  cardWidth?: number;
  cardHeight?: number;
  /** Initial peek (0-indexed) for screenshots / non-pointer devices. */
  peekedDefault?: number | null;
  /** When this prop changes, the hand un-peeks. Wire it to a counter that
   *  ticks whenever a card is played, a dialog opens, etc. */
  resetSignal?: number | string | null;
}

/**
 * Hand of cards that "peeks" the nearest card under the cursor.
 *
 * @param items list of cards to render with per-card drag/click hooks
 * @param spread base px between fan centers (auto if null)
 * @param selectedId card id rendered "selected"
 * @param cardWidth card width in px (default 116 — desktop large)
 * @param cardHeight card height in px (default 174)
 */
export function HoverFanHand({
  items,
  spread = null,
  selectedId = null,
  cardWidth = 116,
  cardHeight = 174,
  peekedDefault = null,
  resetSignal = null,
}: HoverFanHandProps) {
  const n = items.length;
  const mid = (n - 1) / 2;
  const railRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(peekedDefault);

  useEffect(() => {
    setHovered(peekedDefault);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberate: only react to resetSignal
  }, [resetSignal]);
  const [railW, setRailW] = useState(700);

  const fanHeight = cardHeight + 44;

  // Measure rail width via ResizeObserver so the fan fits at any container size.
  useLayoutEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const measure = () => setRailW(el.getBoundingClientRect().width || 700);
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const sideMargin = 12;
  const effective = Math.max(240, railW - 2 * sideMargin);
  // Reserve enough horizontal headroom for the peek shove. We need to
  // push neighbors aside by AT LEAST cardWidth/2 + a comfort gap so the
  // peeked card doesn't overlap with its immediate neighbors.
  const pushHeadroom = Math.min(cardWidth * 0.7, effective * 0.18);
  const fitSpread =
    n <= 1 ? 0 : (effective - cardWidth - pushHeadroom * 2) / (n - 1);
  const fallbackSpread = Math.max(34, 96 - n * 5);
  const requested = spread != null ? spread : fallbackSpread;
  const baseSpread = Math.max(20, Math.min(requested, fitSpread));
  const tiltStep = 2.2;
  // The neighbor immediately next to the peeked card needs to clear
  // cardWidth/2 minus baseSpread (because base position is already
  // baseSpread away). Use that as the floor; bump up for comfort.
  const minPush = Math.max(0, cardWidth / 2 - baseSpread + 14);
  const pushAmount = Math.max(minPush, Math.min(baseSpread * 1.2 + 22, pushHeadroom));
  const cardLift = (fanHeight - cardHeight) / 2 + 6;

  const onMove = (e: React.MouseEvent) => {
    const el = railRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const center = r.width / 2;
    const offsetFromCenter = x - center;
    const i = Math.round(offsetFromCenter / Math.max(1, baseSpread) + mid);
    setHovered(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <div
      ref={railRef}
      data-fan-hand
      style={{
        position: "relative",
        height: fanHeight,
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
      }}
      onMouseMove={onMove}
      onMouseLeave={() => setHovered(peekedDefault)}
    >
      <AnimatePresence initial={false}>
        {items.map((item, i) => {
          const off = i - mid;
          const tilt = off * tiltStep;
          let x = off * baseSpread;
          let y = Math.abs(off) * 2;
          let extraTilt = 0;
          let z = i;

          if (hovered != null) {
            if (i === hovered) {
              y -= cardLift;
              extraTilt = -tilt;
              z = 100;
            } else {
              const dist = i - hovered;
              const sign = dist > 0 ? 1 : -1;
              // Sharper falloff: only the immediate neighbor on each
              // side gets a strong push; further cards barely move.
              const falloff = Math.pow(0.45, Math.abs(dist) - 1);
              x += sign * pushAmount * falloff;
            }
          } else if (selectedId === item.id) {
            y -= cardLift * 0.6;
          }

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onMouseEnter={() => setHovered(i)}
              draggable={item.draggable}
              onDragStart={(e) => item.onDragStart?.(e as unknown as React.DragEvent)}
              onDragEnd={() => item.onDragEnd?.()}
              onClick={item.onClick}
              style={{
                position: "absolute",
                bottom: 0,
                left: "50%",
                transform: `translateX(calc(-50% + ${x}px)) translateY(${y}px) rotate(${tilt + extraTilt}deg)`,
                transformOrigin: "bottom center",
                zIndex: z,
                transition:
                  "transform var(--d-base, 220ms) var(--ease-out-soft, cubic-bezier(.22,.9,.32,1))",
                cursor: item.onClick || item.draggable ? "pointer" : "default",
                filter:
                  hovered != null && hovered !== i
                    ? "brightness(0.88)"
                    : "none",
              }}
            >
              {item.node}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// DragPeekHand — mobile/touch hand display.
// Horizontal rail. Touch a card → it peeks. Drag horizontally → peek
// follows the finger across cards. Drag in any direction past the
// "lift" threshold → the peeked card detaches and follows the finger
// freely in 2D. Release over a [data-touch-drop] zone → the drop
// dispatches via onTouchDrop. Release elsewhere → tap → onClick.
// ────────────────────────────────────────────────────────────────────

/** Spec parsed from the [data-touch-drop] attribute on a drop zone. */
export type TouchDropSpec =
  | { kind: "bank" }
  | { kind: "set"; color: string }
  | { kind: "new-set" };

/** Find the topmost [data-touch-drop] ancestor at the given page point.
 *  Uses elementsFromPoint (plural) and walks the entire z-stack so we
 *  don't get stuck on the lifted card that follows the finger at
 *  z-index 200 — that card has no data-touch-drop, but it would block
 *  the simpler elementFromPoint hit-test from ever reaching the
 *  bank/property-set zones beneath. */
function findDropZoneAt(
  clientX: number,
  clientY: number,
): { el: HTMLElement; spec: TouchDropSpec } | null {
  const stack =
    typeof (
      document as unknown as { elementsFromPoint?: unknown }
    ).elementsFromPoint === "function"
      ? (document as Document & {
          elementsFromPoint: (x: number, y: number) => Element[];
        }).elementsFromPoint(clientX, clientY)
      : ([document.elementFromPoint(clientX, clientY)].filter(
          Boolean,
        ) as Element[]);
  for (const hit of stack) {
    let el: HTMLElement | null = hit as HTMLElement;
    while (el) {
      const raw = el.getAttribute?.("data-touch-drop");
      if (raw) {
        if (raw === "bank") return { el, spec: { kind: "bank" } };
        if (raw === "new-set") return { el, spec: { kind: "new-set" } };
        if (raw.startsWith("set:")) {
          return { el, spec: { kind: "set", color: raw.slice(4) } };
        }
        // Found a [data-touch-drop] but unknown spec — try the next
        // element down the stack rather than bailing.
        break;
      }
      el = el.parentElement;
    }
  }
  return null;
}

interface DragPeekHandProps {
  items: HandRenderItem[];
  peekedIdx?: number | null;
  selectedId?: string | null;
  cardWidth?: number;
  cardHeight?: number;
  /** When this prop changes, the hand un-peeks. Wire it to a counter that
   *  ticks whenever a card is played, a dialog opens, etc. so the lifted
   *  card returns to its slot. */
  resetSignal?: number | string | null;
  /** Fired when the user releases a dragged card over a drop zone. The
   *  spec comes from the zone's `data-touch-drop` attribute. */
  onTouchDrop?: (item: HandRenderItem, spec: TouchDropSpec) => void;
  /** Fired when a touch-drag enters lift mode (so the parent can mark
   *  the global "dragging" state, the same way HTML5 drag does on
   *  desktop). */
  onTouchDragStart?: (item: HandRenderItem) => void;
  /** Fired on touchend regardless of whether a drop happened. */
  onTouchDragEnd?: () => void;
}

export function DragPeekHand({
  items,
  peekedIdx = null,
  selectedId = null,
  cardWidth = 96,
  cardHeight = 144,
  resetSignal = null,
  onTouchDrop,
  onTouchDragStart,
  onTouchDragEnd,
}: DragPeekHandProps) {
  const n = items.length;
  const mid = (n - 1) / 2;
  const railRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(peekedIdx);
  const { haptic } = useHaptics();

  // Track the last index we fired a peek-tap haptic on so we only
  // pulse when the peek SLOT actually changes — not on every
  // touchmove that lands on the same card.
  const lastHapticIdx = useRef<number | null>(peekedIdx ?? null);

  // setHovered wrapper that fires a light haptic tap when the index
  // crosses to a different card. Used by all the peek-update paths
  // (touchmove scrub, mouse hover, card-touchstart).
  const setHoveredWithTap = (
    next: number | null | ((cur: number | null) => number | null),
  ) => {
    setHovered((cur) => {
      const resolved = typeof next === "function" ? next(cur) : next;
      if (
        resolved != null &&
        resolved !== lastHapticIdx.current &&
        // Don't pulse on the very first peek of the gesture — only
        // when the user crosses from one card to another. Use the
        // smallest tier ("micro") since these fire repeatedly across
        // a scrub gesture and would otherwise feel noisy.
        lastHapticIdx.current != null
      ) {
        haptic("micro");
      }
      lastHapticIdx.current = resolved;
      return resolved;
    });
  };

  // Clear peek state when resetSignal changes (parent triggers it on play /
  // dialog open).
  useEffect(() => {
    setHovered(peekedIdx);
    lastHapticIdx.current = peekedIdx ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberate: only react to resetSignal
  }, [resetSignal]);
  const [railW, setRailW] = useState(360);
  const sideMargin = 8;

  useLayoutEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const measure = () => setRailW(el.getBoundingClientRect().width || 360);
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const effective = Math.max(220, railW - 2 * sideMargin);
  const pushHeadroom = Math.min(36, effective * 0.08);
  const overlap =
    n <= 1
      ? 0
      : Math.max(
          20,
          Math.min(56, (effective - cardWidth - pushHeadroom * 2) / (n - 1)),
        );

  const railHeight = cardHeight + 24;
  const cardLift = (railHeight - cardHeight) / 2;
  const tiltStep = 1.6;
  const pushAmount = Math.min(overlap * 0.8 + 8, pushHeadroom);

  // ─── Touch gesture state machine ──────────────────────────────────
  // HTML5 drag is disabled (kills the ghost during peek scrubs) and we
  // run our own pointer logic:
  //
  //   touchstart on a card: lock the gesture to that card index, peek
  //   it. State enters "pending".
  //
  //   touchmove: until the gesture exceeds AXIS_DECISION_PX, we wait.
  //   At the threshold we commit immediately based on dominant axis:
  //     • |dx| > |dy| → "horizontal" (peek-scrub)
  //     • |dy| > |dx| AND dy < 0 → "lift" (card detaches and follows
  //       the finger in any direction; we hit-test [data-touch-drop]
  //       zones via elementsFromPoint for highlight + drop)
  //     • |dy| > |dx| AND dy > 0 → "horizontal" (downward isn't
  //       useful — drop zones are above the hand)
  //
  //   touchend:
  //     • lift over a drop zone → onTouchDrop(item, spec)
  //     • lift not over a zone → return card; treat as cancelled
  //     • horizontal → no action; peek remains sticky
  //     • pending → no movement; native onClick fires (= tap to play)
  //
  // Earlier versions had a separate LIFT_THRESHOLD that required
  // dy < -26 to enter lift, but the axis decision triggered at
  // |movement| > 8 so we always committed to horizontal before
  // hitting -26 → drag was never reachable. Decide at the threshold
  // based purely on dominant axis.
  const AXIS_DECISION_PX = 10;
  const swipeRef = useRef<{
    idx: number;
    startX: number;
    startY: number;
    dx: number;
    dy: number;
    kind: "pending" | "horizontal" | "lift";
    /** Currently-active drop-zone element (for highlight management). */
    activeZone: HTMLElement | null;
  } | null>(null);

  // Lift position tracked via ref + direct DOM mutation for 60fps
  // drag without React re-renders. The `liftActive` state triggers
  // a single re-render on lift start/end to apply z-index/filter.
  const liftXYRef = useRef<{ x: number; y: number } | null>(null);
  const [liftActive, setLiftActive] = useState(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const setActiveZone = (next: HTMLElement | null) => {
    const cur = swipeRef.current?.activeZone ?? null;
    if (cur === next) return;
    if (cur) cur.removeAttribute("data-touch-drop-active");
    if (next) next.setAttribute("data-touch-drop-active", "true");
    if (swipeRef.current) swipeRef.current.activeZone = next;
  };

  // Update peek index from a clientX coordinate (cross-card scrub).
  const peekFromClientX = (clientX: number) => {
    const el = railRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = clientX - r.left;
    const center = r.width / 2;
    const offsetFromCenter = x - center;
    const i = Math.round(offsetFromCenter / Math.max(1, overlap) + mid);
    setHoveredWithTap(Math.max(0, Math.min(n - 1, i)));
  };

  const onMouseMove = (e: React.MouseEvent) => peekFromClientX(e.clientX);

  const onCardTouchStart = (e: React.TouchEvent, i: number) => {
    const t = e.touches[0];
    if (!t) return;
    swipeRef.current = {
      idx: i,
      startX: t.clientX,
      startY: t.clientY,
      dx: 0,
      dy: 0,
      kind: "pending",
      activeZone: null,
    };
    // First touch starts the gesture — peek the card under the finger
    // but DON'T pulse. The tap haptic only fires when the user CROSSES
    // to a different card later.
    setHovered(i);
    lastHapticIdx.current = i;
    liftXYRef.current = null;
  };

  const onCardTouchMove = (e: React.TouchEvent) => {
    const s = swipeRef.current;
    const t = e.touches[0];
    if (!s || !t) return;
    s.dx = t.clientX - s.startX;
    s.dy = t.clientY - s.startY;

    if (s.kind === "pending") {
      const adx = Math.abs(s.dx);
      const ady = Math.abs(s.dy);
      if (adx > AXIS_DECISION_PX || ady > AXIS_DECISION_PX) {
        if (ady > adx && s.dy < 0) {
          s.kind = "lift";
          setLiftActive(true);
          const item = items[s.idx];
          if (item) onTouchDragStart?.(item);
        } else {
          s.kind = "horizontal";
        }
      }
    }

    if (s.kind === "lift") {
      // Direct DOM mutation for smooth 60fps drag
      liftXYRef.current = { x: s.dx, y: s.dy };
      const el = cardRefs.current[s.idx];
      if (el) {
        const off = s.idx - mid;
        const x = off * overlap;
        const y = -(cardLift) + Math.abs(off) * 1.5;
        el.style.transform = `translateX(calc(-50% + ${x + s.dx}px)) translateY(${y + s.dy}px) rotate(0deg)`;
        el.style.transition = "none";
      }
      const zone = findDropZoneAt(t.clientX, t.clientY);
      setActiveZone(zone?.el ?? null);
      if (e.cancelable) e.preventDefault();
    } else if (s.kind === "horizontal") {
      peekFromClientX(t.clientX);
      liftXYRef.current = null;
    }
  };

  const onCardTouchEnd = (e?: React.TouchEvent) => {
    const s = swipeRef.current;
    if (!s) return;
    if (s.kind === "lift") {
      const t = e?.changedTouches?.[0];
      const px = t?.clientX ?? s.startX + s.dx;
      const py = t?.clientY ?? s.startY + s.dy;
      const zone = findDropZoneAt(px, py);
      setActiveZone(null);
      // Reset the DOM element's inline style so CSS transition takes over
      const el = cardRefs.current[s.idx];
      if (el) {
        el.style.transform = "";
        el.style.transition = "";
      }
      if (zone) {
        const item = items[s.idx];
        if (item) {
          const itemRef = item;
          const specRef = zone.spec;
          Promise.resolve().then(() => onTouchDrop?.(itemRef, specRef));
        }
      }
      onTouchDragEnd?.();
    }
    swipeRef.current = null;
    liftXYRef.current = null;
    setLiftActive(false);
  };

  return (
    <div
      ref={railRef}
      style={{
        position: "relative",
        width: "100%",
        height: railHeight + 24,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        paddingBottom: 22,
        // While in lift mode the card may travel above the rail's box;
        // keep overflow visible. The drag layer below is fixed-position
        // anyway, so it isn't clipped here.
        overflow: "visible",
      }}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setHovered(peekedIdx)}
    >
      <div style={{ position: "relative", height: railHeight, width: "100%" }}>
        {items.map((item, i) => {
          const off = i - mid;
          const tilt = off * tiltStep;
          let x = off * overlap;
          let y = Math.abs(off) * 1.5;
          let extraTilt = 0;
          let z = i;

          const isPeeked = hovered === i;
          if (hovered != null) {
            if (isPeeked) {
              y -= cardLift;
              extraTilt = -tilt;
              z = 100;
            } else {
              const dist = i - hovered;
              const sign = dist > 0 ? 1 : -1;
              const falloff = 1 / Math.max(1, Math.abs(dist) * 0.55);
              x += sign * pushAmount * falloff;
            }
          } else if (selectedId === item.id) {
            y -= cardLift * 0.6;
          }

          // Lift mode: the actively-lifted card gets boosted z-index +
          // heavy shadow. Position is handled by direct DOM mutation in
          // touchmove for performance — no React re-render per frame.
          const isLifted = liftActive && swipeRef.current?.idx === i;

          return (
            <div
              key={item.id}
              ref={(el) => { cardRefs.current[i] = el; }}
              onMouseEnter={() => setHovered(i)}
              onTouchStart={(e) => onCardTouchStart(e, i)}
              onTouchMove={onCardTouchMove}
              onTouchEnd={(e) => onCardTouchEnd(e)}
              onTouchCancel={(e) => onCardTouchEnd(e)}
              draggable={false}
              onClick={item.onClick}
              style={{
                position: "absolute",
                bottom: 0,
                left: "50%",
                transform: `translateX(calc(-50% + ${x}px)) translateY(${y}px) rotate(${isLifted ? 0 : tilt + extraTilt}deg)`,
                transformOrigin: "bottom center",
                zIndex: isLifted ? 200 : z,
                transition: isLifted
                  ? "none"
                  : "transform var(--d-base, 220ms) var(--ease-out-soft, cubic-bezier(.22,.9,.32,1))",
                cursor: item.onClick ? "pointer" : "default",
                filter: isLifted
                  ? "drop-shadow(0 18px 28px rgba(0,0,0,0.7))"
                  : isPeeked
                    ? "drop-shadow(0 8px 16px rgba(0,0,0,0.6))"
                    : hovered != null
                      ? "brightness(0.92)"
                      : "none",
                WebkitTouchCallout: "none",
                WebkitUserSelect: "none",
                userSelect: "none",
                // We handle pans ourselves; tell the browser not to
                // interpret them as scroll/zoom gestures.
                touchAction: "none",
              }}
            >
              {item.node}
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 4,
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          color: "rgba(245,234,208,0.45)",
          letterSpacing: "0.08em",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        tap or drag card to play · drag to peek
      </div>
    </div>
  );
}
