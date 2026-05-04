import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Card } from "../../types/game";
import { GameCard, CardBack } from "./GameCard";

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
}: HoverFanHandProps) {
  const n = items.length;
  const mid = (n - 1) / 2;
  const railRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(peekedDefault);
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
// Horizontal rail. As the cursor / finger moves left↔right, the nearest
// card is peeked. Spacing tightens with card count so the whole hand fits.
// ────────────────────────────────────────────────────────────────────

interface DragPeekHandProps {
  items: HandRenderItem[];
  peekedIdx?: number | null;
  selectedId?: string | null;
  cardWidth?: number;
  cardHeight?: number;
}

export function DragPeekHand({
  items,
  peekedIdx = null,
  selectedId = null,
  cardWidth = 96,
  cardHeight = 144,
}: DragPeekHandProps) {
  const n = items.length;
  const mid = (n - 1) / 2;
  const railRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(peekedIdx);
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

  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    const el = railRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const clientX =
      "touches" in e
        ? (e.touches[0]?.clientX ?? r.left + r.width / 2)
        : (e as React.MouseEvent).clientX;
    const x = clientX - r.left;
    const center = r.width / 2;
    const offsetFromCenter = x - center;
    const i = Math.round(offsetFromCenter / Math.max(1, overlap) + mid);
    setHovered(Math.max(0, Math.min(n - 1, i)));
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
        overflow: "visible",
      }}
      onMouseMove={onMove}
      onMouseLeave={() => setHovered(peekedIdx)}
      onTouchMove={onMove}
      // ─── On touch release: keep the peek sticky ───
      // Touch users drag a finger across the rail to peek; if we cleared
      // the peek on touch end, the player would have to either tap
      // immediately (hard to time on a fanned arc) or scrub back to the
      // card they wanted. Leaving `hovered` set means the peeked card
      // stays raised + readable, and the very next tap on it lands the
      // play. A different card pulls peek to it; the rail's onTouchMove
      // also continues to update peek as the finger moves.
    >
      <div style={{ position: "relative", height: railHeight, width: "100%" }}>
        {items.map((item, i) => {
          const off = i - mid;
          const tilt = off * tiltStep;
          let x = off * overlap;
          let y = Math.abs(off) * 1.5;
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
              const falloff = 1 / Math.max(1, Math.abs(dist) * 0.55);
              x += sign * pushAmount * falloff;
            }
          } else if (selectedId === item.id) {
            y -= cardLift * 0.6;
          }

          return (
            <div
              key={item.id}
              onMouseEnter={() => setHovered(i)}
              draggable={item.draggable}
              onDragStart={(e) => item.onDragStart?.(e)}
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
                  hovered === i
                    ? "drop-shadow(0 8px 16px rgba(0,0,0,0.6))"
                    : hovered != null
                      ? "brightness(0.92)"
                      : "none",
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
          letterSpacing: "0.18em",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        ← drag to peek · tap to play →
      </div>
    </div>
  );
}
