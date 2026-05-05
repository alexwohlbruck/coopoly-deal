// GameRulesModal — full rewrite to match the redesigned UI.
// Replaces the gray-700 / emerald-500 vibe-coded look with the design
// system's panel + accent + Bricolage display fonts. Uses real
// property-color swatches in the rent table, mono captions for
// section labels, and a PrimaryButton-style footer.

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import {
  PropertyColor,
  PROPERTY_COLOR_HEX,
  RENT_VALUES,
  SET_SIZE,
  getPropertyColorLabel,
} from "../../types/game";
import { PrimaryButton } from "../ui/Button";

interface GameRulesModalProps {
  isOpen: boolean;
  maxHandSize?: number;
  allowDuplicateSets?: boolean;
  useSocialistTheme?: boolean;
  onClose: () => void;
}

// Sectioned heading helper — the gold accent stripe + label
function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="game-rules-h2">{children}</h3>;
}

// Numbered step pill (used in setup list)
function StepNumber({ n }: { n: number }) {
  return (
    <span
      style={{
        flexShrink: 0,
        width: 22,
        height: 22,
        borderRadius: 999,
        background:
          "linear-gradient(180deg, var(--accent, #f0c14a) 0%, color-mix(in oklab, var(--accent, #f0c14a) 65%, #000) 100%)",
        color: "#1a1208",
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: 11,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {n}
    </span>
  );
}

// Small accent bullet
function Bullet() {
  return (
    <span
      style={{
        flexShrink: 0,
        width: 5,
        height: 5,
        borderRadius: 999,
        background: "var(--accent, #f0c14a)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
        marginTop: 8,
      }}
    />
  );
}

// Subdued sub-card used for the action-card explanations + sub-step
// callouts in turn-structure. Uses the same dark inset look as the
// rest of the design system's panels.
function SubCard({
  title,
  children,
  small,
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <div
      style={{
        background: "rgba(0,0,0,0.22)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 10,
        padding: small ? "10px 12px" : "12px 14px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {title && (
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 13,
            fontWeight: 700,
            color: "#f5ead0",
            letterSpacing: "-0.005em",
            marginBottom: 4,
          }}
        >
          {title}
        </div>
      )}
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          color: "rgba(245,234,208,0.7)",
          lineHeight: 1.5,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Highlighted inline text — used for "key" facts inside paragraphs.
function Hi({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ color: "#f5ead0", fontWeight: 700 }}>{children}</span>
  );
}

const ROW_LABEL_COL: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 13,
  fontWeight: 600,
  color: "#f5ead0",
  padding: "8px 10px",
  display: "flex",
  alignItems: "center",
  gap: 8,
};
const ROW_NUM_COL: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontVariantNumeric: "tabular-nums",
  color: "rgba(245,234,208,0.85)",
  textAlign: "center",
  padding: "8px 6px",
};

function ColorPip({ color }: { color: PropertyColor }) {
  return (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: 2,
        background: PROPERTY_COLOR_HEX[color],
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 1px 0 rgba(0,0,0,0.4)",
        flexShrink: 0,
      }}
    />
  );
}

function RentRow({
  color,
  useSocialistTheme,
}: {
  color: PropertyColor;
  useSocialistTheme: boolean;
}) {
  const rents = RENT_VALUES[color] ?? [];
  const setSize = SET_SIZE[color] ?? 3;
  return (
    <tr
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <td style={ROW_LABEL_COL}>
        <ColorPip color={color} />
        <span>{getPropertyColorLabel(color, useSocialistTheme)}</span>
      </td>
      <td style={ROW_NUM_COL}>{setSize}</td>
      {[0, 1, 2, 3].map((i) => (
        <td
          key={i}
          style={{
            ...ROW_NUM_COL,
            color:
              i + 1 === setSize
                ? "var(--accent, #f0c14a)"
                : ROW_NUM_COL.color,
            fontWeight: i + 1 === setSize ? 700 : 400,
          }}
        >
          {rents[i] != null ? `${rents[i]}M` : "—"}
        </td>
      ))}
    </tr>
  );
}

const RENT_ROW_COLORS = [
  PropertyColor.Brown,
  PropertyColor.LightBlue,
  PropertyColor.Pink,
  PropertyColor.Orange,
  PropertyColor.Red,
  PropertyColor.Yellow,
  PropertyColor.Green,
  PropertyColor.DarkBlue,
  PropertyColor.Railroad,
  PropertyColor.Utility,
];

export function GameRulesModal({
  isOpen,
  maxHandSize = 7,
  allowDuplicateSets = true,
  useSocialistTheme = false,
  onClose,
}: GameRulesModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.22, ease: [0.22, 0.9, 0.32, 1] }}
          className="relative w-full max-w-2xl game-rules-modal flex flex-col"
          style={{
            maxHeight: "85vh",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              padding: "20px 24px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(245,234,208,0.55)",
                  marginBottom: 2,
                }}
              >
                How to play
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 26,
                  fontWeight: 800,
                  color: "#f5ead0",
                  letterSpacing: "-0.01em",
                  margin: 0,
                  lineHeight: 1.05,
                }}
              >
                Co-Opoly Deal · Rules
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "rgba(245,234,208,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 22,
              fontFamily: "var(--font-ui)",
              color: "rgba(245,234,208,0.78)",
              fontSize: 13.5,
              lineHeight: 1.55,
            }}
          >
            {/* Overview */}
            <section>
              <SectionHeading>Overview</SectionHeading>
              <p style={{ margin: 0 }}>
                Co-Opoly Deal is a card game for 2–6{" "}
                {useSocialistTheme ? "comrades" : "players"}. The goal is
                to be the first {useSocialistTheme ? "comrade" : "player"} to
                collect{" "}
                <Hi>
                  3 complete property sets
                  {allowDuplicateSets ? "" : " of different colors"}
                </Hi>{" "}
                on the table in front of you.{" "}
                {useSocialistTheme ? "Comrades" : "Players"} take turns
                drawing cards, playing cards, and using{" "}
                {useSocialistTheme ? "directive" : "action"} cards to collect{" "}
                {useSocialistTheme ? "levies" : "rent"},{" "}
                {useSocialistTheme ? "expropriate" : "steal"} properties, and
                block opponents.
              </p>
            </section>

            {/* Setup */}
            <section>
              <SectionHeading>Setup</SectionHeading>
              <ol
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {[
                  "Shuffle the full 106-card deck.",
                  <>
                    Deal <Hi>5 cards</Hi> face-down to each{" "}
                    {useSocialistTheme ? "comrade" : "player"}.
                  </>,
                  "Place the remaining cards face-down in the center as the draw pile.",
                  <>
                    The first {useSocialistTheme ? "comrade" : "player"} is
                    chosen randomly. Play proceeds clockwise.
                  </>,
                ].map((text, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <StepNumber n={i + 1} />
                    <span style={{ paddingTop: 2 }}>{text}</span>
                  </li>
                ))}
              </ol>
            </section>

            {/* Turn Structure */}
            <section>
              <SectionHeading>Turn Structure</SectionHeading>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                <SubCard title="1. Draw Phase">
                  Draw <Hi>2 cards</Hi> from the draw pile. If you have{" "}
                  <Hi>0 cards</Hi> in hand at the start of your turn, draw{" "}
                  <Hi>5 cards</Hi> instead.
                </SubCard>
                <SubCard title="2. Play Phase">
                  Play <Hi>up to 3 cards</Hi> from your hand. Cards can go
                  to your bank, your property area, or be played as{" "}
                  {useSocialistTheme ? "directive" : "action"} cards.
                </SubCard>
                <SubCard title="3. Discard Phase">
                  You may have{" "}
                  <Hi>
                    no more than{" "}
                    {maxHandSize === 999
                      ? "an unlimited number of"
                      : maxHandSize}{" "}
                    cards
                  </Hi>{" "}
                  in hand. Discard excess cards to the discard pile.
                </SubCard>
              </div>
            </section>

            {/* Winning */}
            <section>
              <SectionHeading>Winning the Game</SectionHeading>
              <p style={{ margin: 0 }}>
                The first {useSocialistTheme ? "comrade" : "player"} to have{" "}
                <Hi>3 complete property sets</Hi> on the table wins
                immediately. Property sets must be on the table — cards in
                your hand do not count.
              </p>
            </section>

            {/* Property Sets table */}
            <section>
              <SectionHeading>Property Sets</SectionHeading>
              <div
                style={{
                  background: "rgba(0,0,0,0.22)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 10,
                  overflow: "hidden",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      {[
                        "Color",
                        "Set",
                        useSocialistTheme ? "Levy 1" : "Rent 1",
                        useSocialistTheme ? "Levy 2" : "Rent 2",
                        useSocialistTheme ? "Levy 3" : "Rent 3",
                        useSocialistTheme ? "Levy 4" : "Rent 4",
                      ].map((label, i) => (
                        <th
                          key={label}
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 9.5,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "rgba(245,234,208,0.5)",
                            fontWeight: 700,
                            padding: "8px 6px",
                            textAlign: i === 0 ? "left" : "center",
                            paddingLeft: i === 0 ? 12 : 6,
                          }}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {RENT_ROW_COLORS.map((c) => (
                      <RentRow
                        key={c}
                        color={c}
                        useSocialistTheme={useSocialistTheme}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  color: "rgba(245,234,208,0.45)",
                  marginTop: 8,
                  marginBottom: 0,
                }}
              >
                ★ Houses add +3M, hotels add +4M to complete sets (not
                available for Railroad / Utility).
              </p>
            </section>

            {/* Action cards */}
            <section>
              <SectionHeading>
                Key {useSocialistTheme ? "Directive" : "Action"} Cards
              </SectionHeading>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 8,
                }}
              >
                <SubCard title="Pass Go" small>
                  Draw 2 cards from the deck.
                </SubCard>
                <SubCard title="Sly Deal" small>
                  {useSocialistTheme ? "Expropriate" : "Steal"} one property
                  card from any opponent (not from complete sets).
                </SubCard>
                <SubCard title="Force Deal" small>
                  Swap one of your properties for one of an opponent's
                  (neither from complete sets).
                </SubCard>
                <SubCard title="Deal Breaker" small>
                  {useSocialistTheme ? "Expropriate" : "Steal"} an entire
                  complete property set from an opponent.
                </SubCard>
                <SubCard title="Debt Collector" small>
                  Charge one {useSocialistTheme ? "comrade" : "player"} 5M.
                </SubCard>
                <SubCard title="It's My Birthday" small>
                  All other {useSocialistTheme ? "comrades" : "players"} pay
                  you 2M.
                </SubCard>
                <SubCard title="Just Say No" small>
                  Cancel any{" "}
                  {useSocialistTheme ? "directive" : "action"} card played
                  against you. Can be chained!
                </SubCard>
                <SubCard
                  title={`Double the ${useSocialistTheme ? "Levy" : "Rent"}`}
                  small
                >
                  Play with a {useSocialistTheme ? "levy" : "rent"} card to
                  double it. Can stack 2 cards for 4×{" "}
                  {useSocialistTheme ? "levy" : "rent"}!
                </SubCard>
              </div>
            </section>

            {/* Payment Rules */}
            <section>
              <SectionHeading>Payment Rules</SectionHeading>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {[
                  <>
                    The <Hi>paying {useSocialistTheme ? "comrade" : "player"}</Hi>{" "}
                    decides which cards to use for payment.
                  </>,
                  <>
                    You can only pay with cards <Hi>on the table</Hi>, not
                    from your hand.
                  </>,
                  <>
                    <Hi>
                      Money / {useSocialistTheme ? "directive" : "action"} cards
                    </Hi>{" "}
                    go to the recipient's bank.
                  </>,
                  <>
                    <Hi>Property cards</Hi> go to the recipient's property
                    area.
                  </>,
                  <>
                    <Hi>No change is given</Hi> — overpayment goes to the
                    recipient.
                  </>,
                ].map((text, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <Bullet />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Wildcards */}
            <section>
              <SectionHeading>Property Wildcards</SectionHeading>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {[
                  <>
                    <Hi>Dual-color wildcards</Hi> can be either of the two
                    colors shown.
                  </>,
                  <>
                    <Hi>Multi-color wildcards</Hi> can represent any color.
                  </>,
                  <>
                    Wildcards can be{" "}
                    <Hi>moved between your property sets during your turn</Hi>.
                  </>,
                  <>
                    Multi-color wildcards have <Hi>no monetary value</Hi> and
                    cannot be used for payment.
                  </>,
                ].map((text, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <Bullet />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "16px 24px 20px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
            }}
          >
            <PrimaryButton onClick={onClose} fullWidth size="md">
              Got it
            </PrimaryButton>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
