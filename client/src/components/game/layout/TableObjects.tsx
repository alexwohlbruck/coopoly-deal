// TableObjects — physical-looking objects on the felt:
//   BankStack   — single chip stack of money cards with a gold "BANK $NM" badge
//   CardStack   — generic deck/discard pile with sliver edges
//   MiniPile    — compact deck/discard for tight spots (mobile you-strip)
//   PropertySetsRow — responsive grid of PropertySetDisplay stacks, with bank as first cell

import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PropertySetDisplay } from "../PropertySetDisplay";
import { CardBack, GameCard } from "../../cards/GameCard";
import type { Card, PropertySet, PropertyColor } from "../../../types/game";
import type { TouchDropSpec } from "../../../utils/drop-zone";
import { useI18n } from "../../../i18n";

// ────────────────────────────────────────────────────────────────────
// BankStack — money cards displayed as an overlapped stack of REAL
// MoneyCard faces (via GameCard) with a "BANK $NM" badge on top.
// Reads as a chip stack rather than a fan. Sized to drop into a
// property-row grid cell so the bank lives alongside the property
// stacks at the same scale.
// ────────────────────────────────────────────────────────────────────

interface BankStackProps {
  cards: Card[]; // actual card objects (action cards keep their faces)
  compact?: boolean;
  useSocialistTheme?: boolean;
}

export function BankStack({ cards, compact = false, useSocialistTheme = false }: BankStackProps) {
  const { t } = useI18n();
  const total = cards.reduce((a, b) => a + b.value, 0);
  // Sort descending so the largest denomination shows on top.
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const cardW = compact ? 76 : 88;
  // Real GameCard renders at 2:3 (width × 1.5), so the container
  // height has to match — earlier this used a hand-tuned 106/124
  // which was a bit shorter than the actual face and clipped the
  // bottom denomination row.
  const cardH = Math.round(cardW * 1.5);
  // Cap stack height: target the same envelope as a 3-card property stack
  // (so 5+ bills don't tower over property sets). Squeeze overlap as count grows.
  const targetMaxStackH = cardH + (compact ? 22 * 2 : 28 * 2);
  const n = sorted.length;
  const naturalOverlap = compact ? 22 : 28;
  const minOverlap = 6;
  const overlap =
    n <= 1
      ? 0
      : Math.max(
          minOverlap,
          Math.min(naturalOverlap, (targetMaxStackH - cardH) / (n - 1)),
        );
  const accentBg = "linear-gradient(180deg, #e7c87a 0%, #c89a3a 100%)";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "6px 8px 4px",
        borderRadius: 10,
        background: "rgba(0,0,0,0.16)",
        boxShadow:
          "inset 0 0 0 1px rgba(212,168,96,0.28), inset 0 1px 0 rgba(255,225,170,0.12)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "2px 8px",
          borderRadius: 999,
          background: accentBg,
          color: "#3a2810",
          fontFamily: "var(--font-mono)",
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: "0.06em",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 2,
            background: "rgba(255,255,255,0.8)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
            flexShrink: 0,
          }}
        />
        <span style={{ lineHeight: 1 }}>
          {(useSocialistTheme ? t.socialist.bank : t.common.bank).toUpperCase()}
        </span>
        <span style={{ marginLeft: 2, fontSize: 9, lineHeight: 1, fontWeight: 700 }}>
          ${total}M
        </span>
      </div>
      <div
        style={{
          position: "relative",
          width: cardW,
          height: cardH + Math.max(0, n - 1) * overlap,
        }}
      >
        {n === 0 && (
          <div
            style={{
              width: cardW,
              height: cardH,
              borderRadius: 6,
              border: "1px dashed rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.12em",
            }}
          >
            {t.game.empty.toLowerCase()}
          </div>
        )}
        <AnimatePresence initial={false}>
          {sorted.map((card, i) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: -12, scale: 0.92 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                rotate: (i % 2 === 0 ? -1 : 1) * 0.5,
              }}
              exit={{ opacity: 0, y: 8, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              style={{
                position: "absolute",
                left: 0,
                top: i * overlap,
              }}
            >
              <GameCard
                card={card}
                width={cardW}
                disableHover
                useSocialistTheme={useSocialistTheme}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// CardStack — generic deck/discard pile.
// Renders a top card (real CardBack for the deck, or supplied child for
// the discard) with sliver edges peeking out from underneath.
// ────────────────────────────────────────────────────────────────────

interface CardStackProps {
  depth?: number; // how many sliver edges to render under the top card
  width?: number;
  height?: number;
  faceDown?: boolean; // deck pile if true; discard if false
  children?: ReactNode; // top-card render (defaults to CardBack when faceDown)
  label?: string;
  count?: number;
}

export function CardStack({
  depth = 3,
  width = 96,
  height = 134,
  faceDown = false,
  children,
  label,
  count,
}: CardStackProps) {
  const slivers = Array.from({ length: depth }, (_, i) => i);
  return (
    <div
      style={{
        position: "relative",
        width,
        height: height + depth * 2,
      }}
    >
      {/* shadow puddle */}
      <div
        style={{
          position: "absolute",
          left: -6,
          right: -6,
          bottom: 8,
          height: 12,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(0,0,0,0.5) 0%, transparent 70%)",
          filter: "blur(2px)",
        }}
      />
      {slivers.map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: -i * 0.6,
            top: depth * 2 - i * 2,
            width,
            height,
            borderRadius: "var(--r-card)",
            overflow: "hidden",
            background: faceDown
              ? "linear-gradient(160deg, #8a2020, #5a1010)"
              : "linear-gradient(180deg, #f0e8d0 0%, #e6dfca 60%, #d8d0b8 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 0 rgba(0,0,0,0.4)",
            border: "1px solid rgba(0,0,0,0.35)",
          }}
        >
          {faceDown && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0.35,
                backgroundImage:
                  "repeating-linear-gradient(45deg, rgba(0,0,0,0.18) 0 6px, transparent 6px 12px)",
              }}
            />
          )}
        </div>
      ))}
      <div style={{ position: "absolute", left: 0, top: 0, width, height }}>
        {children ||
          (faceDown ? <CardBack width={width} /> : null)}
      </div>
      {(label || count != null) && (
        <div
          style={{
            position: "absolute",
            bottom: -2,
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.85)",
            textShadow: "0 1px 2px rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap",
          }}
        >
          {label && <span style={{ opacity: 0.75 }}>{label}</span>}
          {count != null && (
            <span
              style={{ fontWeight: 700, color: "var(--accent, #f0c14a)" }}
            >
              {count}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// MiniPile — compact deck/discard for tight strips (mobile you-strip).
// ────────────────────────────────────────────────────────────────────

interface MiniPileProps {
  kind: "deck" | "discard";
  count: number;
}

export function MiniPile({ kind, count }: MiniPileProps) {
  const { t } = useI18n();
  const cardW = 48;
  const cardH = 68;
  const isDeck = kind === "deck";
  const depth = isDeck
    ? Math.min(5, Math.max(2, Math.round(count / 18)))
    : Math.min(3, Math.max(1, Math.round(count / 2)));
  const slivers = Array.from({ length: depth }, (_, i) => i);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <div
        style={{
          position: "relative",
          width: cardW + 4,
          height: cardH + depth * 2 + 2,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -2,
            right: -2,
            bottom: 2,
            height: 6,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse, rgba(0,0,0,0.55) 0%, transparent 70%)",
            filter: "blur(2px)",
          }}
        />
        {slivers.map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 2 - i * 0.4,
              top: depth * 2 - i * 2,
              width: cardW,
              height: cardH,
              borderRadius: "var(--r-card, 6px)",
              background: isDeck
                ? "linear-gradient(160deg, var(--card-back-1, #8a2020), var(--card-back-2, #5a1010))"
                : "linear-gradient(160deg, #f5ecd6, #e6dcc0)",
              boxShadow: "0 1px 0 rgba(0,0,0,0.45)",
              border: "1px solid rgba(0,0,0,0.4)",
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            left: 2,
            top: 0,
            width: cardW,
            height: cardH,
          }}
        >
          {isDeck ? (
            <CardBack width={cardW * 2} scale={0.5} />
          ) : count > 0 ? null : (
            <div
              style={{
                width: cardW,
                height: cardH,
                borderRadius: 6,
                border: "1px dashed rgba(255,255,255,0.22)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-mono)",
                fontSize: 8,
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "0.06em",
              }}
            >
              {t.game.empty.toLowerCase()}
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.1em",
          color: "rgba(245,234,208,0.78)",
          display: "flex",
          gap: 5,
          alignItems: "baseline",
        }}
      >
        <span style={{ opacity: 0.6, textTransform: "uppercase" }}>
          {isDeck ? t.game.deck : t.game.discardPile}
        </span>
        <span style={{ fontWeight: 700, color: "var(--accent, #f0c14a)" }}>
          {count}
        </span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// PropertySetsRow — smart responsive grid of PropertySetDisplay stacks.
// Picks the largest scale (between MIN and MAX) that fits all stacks
// in `rows` rows within `maxWidth × maxHeight`. Bank shows as first cell
// when `bank` is non-empty.
// ────────────────────────────────────────────────────────────────────

export interface PropertySetsRowProps {
  sets: PropertySet[];
  bank?: Card[]; // bank card objects; rendered as first cell when non-empty
  maxWidth?: number;
  maxHeight?: number | null;
  align?: "flex-start" | "center";
  compact?: boolean;
  isYou?: boolean;
  isCurrentTurn?: boolean;
  useSocialistTheme?: boolean;
  onWildcardClick?: (card: Card, currentColor: PropertyColor) => void;
  /** Fired when a wildcard is pointer-dragged onto a drop zone. */
  onWildcardDrop?: (
    card: Card,
    sourceColor: PropertyColor,
    targetSpec: TouchDropSpec,
  ) => void;
  /** Fired when wildcard drag starts/ends (for parent to track draggingCard). */
  onDragActiveChange?: (isDragging: boolean, card: Card | null) => void;
}

export interface PropertySetsRowExtraProps {
  /** When true, allow the row to wrap to multiple lines if it overflows.
   *  When false (default), keep one row — the parent should provide
   *  overflow-x: auto if it can't fit. The design's compact mockup uses
   *  horizontal scroll; the desktop variant lets it wrap. */
  wrap?: boolean;
  /** When true, mark the bank/set cells with `data-touch-drop` attributes
   *  so the touch-drag handler in DragPeekHand can dispatch drops via
   *  elementFromPoint. Should match the same `canDrop*` gates used by
   *  the desktop HTML5 drop handlers (i.e. isYou && isCurrentTurn). */
  touchDropEnabled?: boolean;
  /** When true, render the "+ NEW" drop slot at the end of the row.
   *  Wrapped in an AnimatePresence so it fades in/out as the parent
   *  (player board) toggles this in response to drag start/end. */
  isDragInProgress?: boolean;
}

export function PropertySetsRow({
  sets = [],
  bank,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for back-compat
  maxWidth: _maxWidth,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for back-compat
  maxHeight: _maxHeight,
  align = "flex-start",
  compact = false,
  isYou = false,
  isCurrentTurn = false,
  useSocialistTheme = false,
  onWildcardClick,
  onWildcardDrop,
  onDragActiveChange,
  wrap = false,
  touchDropEnabled = false,
  isDragInProgress = false,
}: PropertySetsRowProps & PropertySetsRowExtraProps) {
  const { t } = useI18n();
  const hasBank = Array.isArray(bank) && bank.length > 0;
  // Show the bank cell whenever the player can interact with this board
  // (their own table) — even when empty — so it can serve as a touch
  // drop target with an empty-state placeholder.
  const showBankCell = hasBank || touchDropEnabled;
  const n = sets.length + (showBankCell ? 1 : 0) + (touchDropEnabled ? 1 : 0);

  if (n === 0) {
    return (
      <div
        style={{
          width: "100%",
          padding: "24px 18px",
          borderRadius: 12,
          border: "1px dashed rgba(255,255,255,0.1)",
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "rgba(245,234,208,0.4)",
          letterSpacing: "0.08em",
        }}
      >
        {t.game.noSetsPlayed}
      </div>
    );
  }

  // Fixed cell dimensions (no scale-to-fit shrinking — cards stay readable).
  // Card width passed to PropertySetDisplay (88 lg / 76 compact); cell width
  // matches with a small gutter for the progress badge.
  const cardWidth = compact ? 76 : 88;
  const cellW = cardWidth + 12;
  const gap = compact ? 6 : 10;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: wrap ? "wrap" : "nowrap",
        gap,
        justifyContent: align === "center" ? "center" : "flex-start",
        // When not wrapping, this element is laid out at its content width
        // and the parent should give it `overflow-x: auto` if it overflows.
        // We set width:auto + minWidth:max-content so flex children stay at
        // their intrinsic size instead of being squeezed.
        width: wrap ? "100%" : "max-content",
        minWidth: wrap ? undefined : "max-content",
        alignItems: "flex-start",
        paddingTop: 4,
      }}
    >
      {showBankCell && (
        <div
          key="__bank"
          // Touch-drag drop target: the DragPeekHand handler walks up the DOM
          // from elementFromPoint looking for [data-touch-drop]. When enabled,
          // dropping here plays the card to the bank. Rendered even when
          // empty so the player can drop the very first money/action card.
          data-touch-drop={touchDropEnabled ? "bank" : undefined}
          style={{
            width: cellW,
            display: "flex",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <BankStack cards={bank ?? []} compact={compact} useSocialistTheme={useSocialistTheme} />
        </div>
      )}
      {sets.map((s, i) => (
        <div
          key={`${s.color}-${i}`}
          data-touch-drop={touchDropEnabled ? `set:${s.color}` : undefined}
          style={{
            width: cellW,
            display: "flex",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <PropertySetDisplay
            set={s}
            isYou={isYou}
            isCurrentTurn={isCurrentTurn}
            useSocialistTheme={useSocialistTheme}
            onWildcardClick={onWildcardClick}
            onWildcardDrop={onWildcardDrop}
            onDragActiveChange={onDragActiveChange}
            cardWidth={cardWidth}
          />
        </div>
      ))}
      <AnimatePresence initial={false}>
        {touchDropEnabled && isDragInProgress && (
          <motion.div
            key="__new-set"
            data-touch-drop="new-set"
            initial={{ opacity: 0, width: 0, marginLeft: -gap }}
            animate={{ opacity: 1, width: cellW, marginLeft: 0 }}
            exit={{ opacity: 0, width: 0, marginLeft: -gap }}
            transition={{ duration: 0.18, ease: [0.22, 0.9, 0.32, 1] }}
            style={{
              display: "flex",
              justifyContent: "center",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            <NewSetPlaceholder cardWidth={cardWidth} compact={compact} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// NewSetPlaceholder — empty cell at the end of the property row that
// serves as a touch drop target for "create a new set with this
// card". Visually a dashed-border card slot with a + icon.
// ────────────────────────────────────────────────────────────────────
function NewSetPlaceholder({
  cardWidth,
  compact,
}: {
  cardWidth: number;
  compact: boolean;
}) {
  const cardH = compact ? 106 : 124;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "6px 8px 4px",
        borderRadius: 10,
        background: "rgba(0,0,0,0.04)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
      }}
    >
      <div
        style={{
          padding: "2px 8px",
          borderRadius: 999,
          background: "rgba(0,0,0,0.3)",
          color: "rgba(255,255,255,0.55)",
          fontFamily: "var(--font-mono)",
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: "0.06em",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      >
        + NEW
      </div>
      <div
        style={{
          width: cardWidth,
          height: cardH,
          borderRadius: 6,
          border: "1px dashed rgba(255,255,255,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-display)",
          fontSize: 28,
          fontWeight: 700,
          color: "rgba(255,255,255,0.35)",
          letterSpacing: "0.04em",
        }}
      >
        +
      </div>
    </div>
  );
}

