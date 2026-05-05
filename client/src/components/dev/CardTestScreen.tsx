// CardTestScreen — every card variant rendered side-by-side so we can
// eyeball whether new card-design tweaks broke any case. Mounted via
// `?test=cards` on the root URL (see App.tsx).
//
// Sections:
//   • Money (1, 2, 3, 4, 5, 10)
//   • Properties (one card per color)
//   • 2-color wildcards (a few representative pairs)
//   • Rainbow / property wildcard
//   • Action cards (every CardType.*)
//   • Rent cards (a few dual-color + wild)
//   • Card backs
//   • States: rest / selected / disabled (sample card)

import { GameCard, CardBack } from "../cards/GameCard";
import { PropertyColor, CardType } from "../../types/game";
import type { Card } from "../../types/game";

const NAMES_BY_COLOR: Record<string, string> = {
  brown: "Mediterranean Avenue",
  lightBlue: "Connecticut Avenue",
  pink: "St. Charles Place",
  orange: "Tennessee Avenue",
  red: "Illinois Avenue",
  yellow: "Atlantic Avenue",
  green: "Pacific Avenue",
  darkBlue: "Boardwalk",
  railroad: "Pennsylvania Railroad",
  utility: "Water Works",
};

const PROPERTY_VALUES: Record<string, number> = {
  brown: 1,
  lightBlue: 1,
  pink: 2,
  orange: 2,
  red: 3,
  yellow: 3,
  green: 4,
  darkBlue: 4,
  railroad: 2,
  utility: 2,
};

let n = 0;
const cid = () => `test-${++n}`;

function moneyCard(value: number): Card {
  return { id: cid(), type: CardType.Money, value };
}

function propertyCard(color: PropertyColor): Card {
  return {
    id: cid(),
    type: CardType.Property,
    value: PROPERTY_VALUES[color] ?? 1,
    name: NAMES_BY_COLOR[color],
    colors: [color],
  };
}

function wildcardCard(c1: PropertyColor, c2: PropertyColor): Card {
  return {
    id: cid(),
    type: CardType.PropertyWildcard,
    value: 2,
    colors: [c1, c2],
  };
}

const rainbowColors = [
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

function rainbowWildcard(): Card {
  return {
    id: cid(),
    type: CardType.PropertyWildcard,
    value: 0,
    colors: rainbowColors,
  };
}

function actionCard(type: CardType, value: number): Card {
  return { id: cid(), type, value };
}

function rentDualCard(c1: PropertyColor, c2: PropertyColor): Card {
  return {
    id: cid(),
    type: CardType.RentDual,
    value: 1,
    colors: [c1, c2],
  };
}

function rentWildCard(): Card {
  return { id: cid(), type: CardType.RentWild, value: 3 };
}

const moneyCards = [1, 2, 3, 4, 5, 10].map(moneyCard);
const propertyCards = rainbowColors.map(propertyCard);
const wildcards = [
  wildcardCard(PropertyColor.Brown, PropertyColor.LightBlue),
  wildcardCard(PropertyColor.Pink, PropertyColor.Orange),
  wildcardCard(PropertyColor.Red, PropertyColor.Yellow),
  wildcardCard(PropertyColor.Green, PropertyColor.DarkBlue),
  wildcardCard(PropertyColor.LightBlue, PropertyColor.Railroad),
  wildcardCard(PropertyColor.Utility, PropertyColor.Railroad),
];
const rainbow = [rainbowWildcard()];
const actionCards = [
  actionCard(CardType.PassGo, 1),
  actionCard(CardType.SlyDeal, 3),
  actionCard(CardType.ForceDeal, 3),
  actionCard(CardType.DealBreaker, 5),
  actionCard(CardType.DebtCollector, 3),
  actionCard(CardType.Birthday, 2),
  actionCard(CardType.JustSayNo, 4),
  actionCard(CardType.DoubleTheRent, 1),
  actionCard(CardType.House, 3),
  actionCard(CardType.Hotel, 4),
];
const rentCards = [
  rentDualCard(PropertyColor.Brown, PropertyColor.LightBlue),
  rentDualCard(PropertyColor.Pink, PropertyColor.Orange),
  rentDualCard(PropertyColor.Red, PropertyColor.Yellow),
  rentDualCard(PropertyColor.Green, PropertyColor.DarkBlue),
  rentDualCard(PropertyColor.Railroad, PropertyColor.Utility),
  rentWildCard(),
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.18em",
          color: "rgba(245,234,208,0.7)",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          padding: 8,
          background: "rgba(0,0,0,0.18)",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {children}
      </div>
    </section>
  );
}

export function CardTestScreen() {
  return (
    <div
      className="felt-emerald felt-surface no-text-select"
      style={{
        minHeight: "100vh",
        padding: 24,
        color: "#f5ead0",
        fontFamily: "var(--font-ui)",
        position: "relative",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: "-0.01em",
          marginBottom: 4,
        }}
      >
        Card Designs · Test Screen
      </h1>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.14em",
          color: "rgba(245,234,208,0.55)",
          textTransform: "uppercase",
          marginBottom: 24,
        }}
      >
        Every card variant — eyeball check
      </p>

      <Section title="Money">
        {moneyCards.map((c) => (
          <GameCard key={c.id} card={c} width={96} disableHover />
        ))}
      </Section>

      <Section title="Properties (one per color)">
        {propertyCards.map((c) => (
          <GameCard key={c.id} card={c} width={96} disableHover />
        ))}
      </Section>

      <Section title="Two-color wildcards">
        {wildcards.map((c) => (
          <GameCard key={c.id} card={c} width={96} disableHover />
        ))}
      </Section>

      <Section title="Two-color wildcards (large 116px)">
        {wildcards.slice(0, 3).map((c) => (
          <GameCard key={c.id} card={c} width={116} disableHover />
        ))}
      </Section>

      <Section title="Rainbow / property wildcard">
        {rainbow.map((c) => (
          <GameCard key={c.id} card={c} width={96} disableHover />
        ))}
      </Section>

      <Section title="Action cards">
        {actionCards.map((c) => (
          <GameCard key={c.id} card={c} width={96} disableHover />
        ))}
      </Section>

      <Section title="Rent cards">
        {rentCards.map((c) => (
          <GameCard key={c.id} card={c} width={96} disableHover />
        ))}
      </Section>

      <Section title="Card back">
        <CardBack width={96} />
        <CardBack width={116} />
        <CardBack width={96} useSocialistTheme />
      </Section>

      <Section title="States (sample property)">
        <GameCard
          card={propertyCards[3]!}
          width={96}
          disableHover
        />
        <GameCard
          card={propertyCards[3]!}
          width={96}
          selected
          disableHover
        />
        <GameCard
          card={propertyCards[3]!}
          width={96}
          disabled
          disableHover
        />
      </Section>

      <Section title="States (sample action)">
        <GameCard card={actionCards[1]!} width={96} disableHover />
        <GameCard card={actionCards[1]!} width={96} selected disableHover />
        <GameCard card={actionCards[1]!} width={96} disabled disableHover />
      </Section>
    </div>
  );
}
