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

interface PropertySetDisplayProps {
  set: PropertySet;
  onWildcardClick?: (card: Card, currentColor: PropertyColor) => void;
  isYou: boolean;
  isCurrentTurn: boolean;
  isDragOver?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragStart?: (e: React.DragEvent, card: Card) => void;
  onDragEnd?: () => void;
  useSocialistTheme?: boolean;
  cardWidth?: number;
  /** Drop-target visual cue: 'valid' = green ring, 'invalid' = red ring. */
  dropTarget?: "valid" | "invalid" | null;
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
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  useSocialistTheme = false,
  cardWidth = 88,
  dropTarget = null,
}: PropertySetDisplayProps) {
  const cardW = cardWidth;
  // Each card's banner row peeks ~28px above the one below at full size
  // (or 22px in compact). Houses/hotels stack on top of the property cards.
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

  // Determine orientation for dual-color wildcards (so the banner of the
  // matching color faces up on the stack).
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

  // Drop ring color
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

  return (
    <div
      data-property-drop-zone={set.color}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
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

      {/* Stack of cards (banner of each peeks out above the next).
          AnimatePresence wraps so cards spring in when added to the
          set and slide out when stolen / moved. The lift on enter
          mimics the card landing on the table from above. */}
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
            const draggable =
              isYou && isCurrentTurn && card.type === CardType.PropertyWildcard;
            return (
              <motion.div
                key={card.id ?? i}
                initial={{ opacity: 0, y: -18, scale: 0.94 }}
                animate={{
                  opacity: 1,
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
                  cursor:
                    isYou && isCurrentTurn && card.type === CardType.PropertyWildcard
                      ? "pointer"
                      : "default",
                }}
                draggable={draggable}
                onDragStart={(e) => {
                  if (draggable && onDragStart)
                    onDragStart(e as unknown as React.DragEvent, card);
                }}
                onDragEnd={() => {
                  if (draggable && onDragEnd) onDragEnd();
                }}
                onClick={() => {
                  if (
                    isYou &&
                    isCurrentTurn &&
                    card.type === CardType.PropertyWildcard &&
                    onWildcardClick
                  ) {
                    onWildcardClick(card, set.color);
                  }
                }}
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
