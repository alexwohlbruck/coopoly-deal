// GameRulesModal — full rewrite to match the redesigned UI.
// Replaces the gray-700 / emerald-500 vibe-coded look with the design
// system's panel + accent + Bricolage display fonts. Uses real
// property-color swatches in the rent table, mono captions for
// section labels, and a PrimaryButton-style footer.


import { motion, AnimatePresence } from "framer-motion";
import { ModalCloseButton } from "./ModalCloseButton";
import {
  PropertyColor,
  PROPERTY_COLOR_HEX,
  RENT_VALUES,
  SET_SIZE,
  CardType,
  getPropertyColorLabel,
  getCardTypeLabel,
} from "../../types/game";
import { PrimaryButton } from "../ui/Button";
import { Toggle } from "../ui/Toggle";
import { useI18n } from "../../i18n";
import { fmt, capitalize, type Vars } from "../../i18n/format";
import { RichText } from "../../i18n/RichText";
import { useGameStore, isMonopolyDealDomain } from "../../hooks/useGameStore";
import { GoldStar } from "../ui/GoldStar";

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
  return <span style={{ color: "#f5ead0", fontWeight: 700 }}>{children}</span>;
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
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.3), 0 1px 0 rgba(0,0,0,0.4)",
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
  const { t } = useI18n();
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
        <span>{getPropertyColorLabel(t, color, useSocialistTheme)}</span>
      </td>
      <td style={ROW_NUM_COL}>{setSize}</td>
      {[0, 1, 2, 3].map((i) => (
        <td
          key={i}
          style={{
            ...ROW_NUM_COL,
            color:
              i + 1 === setSize ? "var(--accent, #f0c14a)" : ROW_NUM_COL.color,
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
  onClose,
}: GameRulesModalProps) {
  const { t } = useI18n();
  const useSocialistTheme = useGameStore((s) => s.useSocialistTheme);
  const setUseSocialistTheme = useGameStore((s) => s.setUseSocialistTheme);

  // Every dynamic noun the rules copy can splice in. Built once here so the
  // locale strings stay declarative and the Co-Opoly wording swap happens in
  // exactly one place rather than inline at 30 call sites.
  const soc = useSocialistTheme;
  const property = soc ? t.socialist.property : t.cardTypes.property.toLowerCase();
  const players = soc ? t.socialist.players : t.common.players;
  const steal = soc ? t.socialist.steal : t.common.steal;
  const vars: Vars = {
    game: soc ? t.socialist.title : t.lobby.title,
    player: soc ? t.socialist.player : t.common.player,
    players,
    Players: capitalize(players),
    property,
    Property: capitalize(property),
    properties: soc ? t.socialist.properties : t.common.properties.toLowerCase(),
    bank: soc ? t.socialist.bank : t.common.bank.toLowerCase(),
    action: soc ? t.socialist.action : t.cardFaces.action.toLowerCase(),
    rent: soc ? t.socialist.rent : t.actions.rent.toLowerCase(),
    rents: soc ? t.socialist.rents : t.actions.rent.toLowerCase(),
    steal,
    Steal: capitalize(steal),
    money: soc ? t.socialist.cardTypes.money : t.cardTypes.money,
    house: getCardTypeLabel(t, CardType.House, soc),
    hotel: getCardTypeLabel(t, CardType.Hotel, soc),
    railroad: getPropertyColorLabel(t, PropertyColor.Railroad, soc),
    utility: getPropertyColorLabel(t, PropertyColor.Utility, soc),
    n: 3,
    max: maxHandSize === 999 ? t.rulesBody.unlimitedCards : maxHandSize,
    diffColors: allowDuplicateSets ? "" : t.rulesBody.ofDifferentColors,
  };
  // Emphasised runs inside the rules copy render as the existing <Hi> style.
  const hi = (children: React.ReactNode, key: number) => <Hi key={key}>{children}</Hi>;

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
              gap: 12,
              padding: "20px 24px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
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
                {t.rules.eyebrow}
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
                {useSocialistTheme ? t.socialist.rulesTitle : t.rules.title}
              </h2>
              {/* Co-Opoly Deal toggle — flip wording between standard
                  ("players, rent, action cards") and the socialist
                  variant ("comrades, levies, directives"). Toggles
                  the browser-local preference. Hidden on monopolydeal.online. */}
              {!isMonopolyDealDomain && (
                <div
                  style={{
                    marginTop: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Toggle
                    checked={useSocialistTheme}
                    onChange={(next) => setUseSocialistTheme(next)}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: useSocialistTheme
                        ? "var(--accent, #f0c14a)"
                        : "rgba(245,234,208,0.65)",
                      transition: "color var(--d-quick) var(--ease-out-soft)",
                      cursor: "pointer",
                    }}
                    onClick={() => setUseSocialistTheme(!useSocialistTheme)}
                  >
                    <GoldStar size={11} /> {t.socialist.title}
                  </span>
                </div>
              )}
            </div>
            <ModalCloseButton onClick={onClose} ariaLabel={t.rules.close} />
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
              <SectionHeading>{t.rules.overview}</SectionHeading>
              <p style={{ margin: 0 }}>
                <RichText
                  text={soc ? t.socialist.overview : t.rulesBody.overview}
                  vars={vars}
                  emphasis={hi}
                />
              </p>
            </section>

            {/* Setup */}
            <section>
              <SectionHeading>{t.rules.setup}</SectionHeading>
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
                  t.rulesBody.setupShuffle,
                  t.rulesBody.setupDeal,
                  t.rulesBody.setupDrawPile,
                  t.rulesBody.setupFirstPlayer,
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
                    <span style={{ paddingTop: 2 }}>
                      <RichText text={text} vars={vars} emphasis={hi} />
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            {/* Turn Structure */}
            <section>
              <SectionHeading>{t.rules.turnStructure}</SectionHeading>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <SubCard title={t.rules.drawPhase}>
                  <RichText text={t.rulesBody.drawPhase} vars={{ ...vars, n: 2 }} emphasis={hi} />
                </SubCard>
                <SubCard title={t.rules.playPhase}>
                  <RichText text={t.rulesBody.playPhase} vars={vars} emphasis={hi} />
                </SubCard>
                <SubCard title={t.rules.discardPhase}>
                  <RichText text={t.rulesBody.discardPhase} vars={vars} emphasis={hi} />
                </SubCard>
              </div>
            </section>

            {/* Winning */}
            <section>
              <SectionHeading>{t.rules.winning}</SectionHeading>
              <p style={{ margin: 0 }}>
                <RichText text={t.rulesBody.winning} vars={vars} emphasis={hi} />{" "}
                <RichText text={t.rulesBody.winningSetsOnTable} vars={vars} emphasis={hi} />
              </p>
            </section>

            {/* Property Sets table */}
            <section>
              <SectionHeading>
                {useSocialistTheme ? t.socialist.stateAssetSets : t.rules.propertySets}
              </SectionHeading>
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
                        t.rulesBody.tableColor,
                        t.rulesBody.tableSet,
                        `${useSocialistTheme ? t.socialist.rent : t.actions.rent} 1`,
                        `${useSocialistTheme ? t.socialist.rent : t.actions.rent} 2`,
                        `${useSocialistTheme ? t.socialist.rent : t.actions.rent} 3`,
                        `${useSocialistTheme ? t.socialist.rent : t.actions.rent} 4`,
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
                ★ {fmt(t.rulesBody.houseHotelNote, vars)}
              </p>
            </section>

            {/* Action cards */}
            <section>
              <SectionHeading>
                {useSocialistTheme
                  ? t.rules.keyDirectiveCards
                  : t.rules.keyActionCards}
              </SectionHeading>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 8,
                }}
              >
                {(
                  [
                    [CardType.PassGo, t.rulesBody.cardPassGo],
                    [CardType.SlyDeal, t.rulesBody.cardSlyDeal],
                    [CardType.ForceDeal, t.rulesBody.cardForceDeal],
                    [CardType.DealBreaker, t.rulesBody.cardDealBreaker],
                    [CardType.DebtCollector, t.rulesBody.cardDebtCollector],
                    [CardType.Birthday, t.rulesBody.cardBirthday],
                    [CardType.JustSayNo, t.rulesBody.cardJustSayNo],
                    [CardType.DoubleTheRent, t.rulesBody.cardDoubleRent],
                  ] as [CardType, string][]
                ).map(([type, body]) => (
                  <SubCard
                    key={type}
                    title={getCardTypeLabel(t, type, useSocialistTheme)}
                    small
                  >
                    <RichText text={body} vars={vars} emphasis={hi} />
                  </SubCard>
                ))}
              </div>
            </section>

            {/* Payment Rules */}
            <section>
              <SectionHeading>{t.rules.paymentRules}</SectionHeading>
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
                  t.rulesBody.payPayerDecides,
                  t.rulesBody.payOnTableOnly,
                  t.rulesBody.payMoneyToBank,
                  t.rulesBody.payPropertyToArea,
                  t.rulesBody.payNoChange,
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
                    <span>
                      <RichText text={text} vars={vars} emphasis={hi} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Wildcards */}
            <section>
              <SectionHeading>
                {useSocialistTheme ? t.socialist.generalAssetWildcards : t.rules.propertyWildcards}
              </SectionHeading>
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
                  t.rulesBody.wildDual,
                  t.rulesBody.wildMulti,
                  t.rulesBody.wildMoveDuringTurn,
                  t.rulesBody.wildNoValue,
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
                    <span>
                      <RichText text={text} vars={vars} emphasis={hi} />
                    </span>
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
              {t.rules.gotIt}
            </PrimaryButton>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
