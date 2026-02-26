import { type Card, CardType, PropertyColor } from "../models/types.ts";

let nextId = 0;
function makeId(): string {
  return `card_${++nextId}`;
}

function money(value: number, count: number): Card[] {
  return Array.from({ length: count }, () => ({
    id: makeId(),
    type: CardType.Money,
    value,
  }));
}

function property(color: PropertyColor, value: number, names: string[]): Card[] {
  return names.map((name) => ({
    id: makeId(),
    type: CardType.Property,
    value,
    colors: [color],
    name,
  }));
}

function wildcard(colors: PropertyColor[], value: number, count: number): Card[] {
  return Array.from({ length: count }, () => ({
    id: makeId(),
    type: CardType.PropertyWildcard,
    value,
    colors,
  }));
}

function action(type: CardType, value: number, count: number): Card[] {
  return Array.from({ length: count }, () => ({
    id: makeId(),
    type,
    value,
  }));
}

function rentDual(color1: PropertyColor, color2: PropertyColor, count: number): Card[] {
  return Array.from({ length: count }, () => ({
    id: makeId(),
    type: CardType.RentDual,
    value: 1,
    colors: [color1, color2],
  }));
}

function rentWild(count: number): Card[] {
  return Array.from({ length: count }, () => ({
    id: makeId(),
    type: CardType.RentWild,
    value: 3,
    colors: Object.values(PropertyColor),
  }));
}

export function createDeck(): Card[] {
  nextId = 0;

  const cards: Card[] = [
    // Money cards (20)
    ...money(1, 6),
    ...money(2, 5),
    ...money(3, 3),
    ...money(4, 3),
    ...money(5, 2),
    ...money(10, 1),

    // Property cards (28)
    ...property(PropertyColor.Brown, 1, ["Baltic Avenue", "Mediterranean Avenue"]),
    ...property(PropertyColor.LightBlue, 1, ["Connecticut Avenue", "Oriental Avenue", "Vermont Avenue"]),
    ...property(PropertyColor.Pink, 2, ["St. Charles Place", "States Avenue", "Virginia Avenue"]),
    ...property(PropertyColor.Orange, 2, ["New York Avenue", "St. James Place", "Tennessee Avenue"]),
    ...property(PropertyColor.Red, 3, ["Indiana Avenue", "Illinois Avenue", "Kentucky Avenue"]),
    ...property(PropertyColor.Yellow, 3, ["Atlantic Avenue", "Marvin Gardens", "Ventnor Avenue"]),
    ...property(PropertyColor.Green, 4, ["North Carolina Avenue", "Pacific Avenue", "Pennsylvania Avenue"]),
    ...property(PropertyColor.DarkBlue, 4, ["Boardwalk", "Park Place"]),
    ...property(PropertyColor.Railroad, 2, ["B&O Railroad", "Pennsylvania Railroad", "Reading Railroad", "Short Line"]),
    ...property(PropertyColor.Utility, 2, ["Electric Company", "Water Works"]),

    // Property wildcards (11)
    ...wildcard([PropertyColor.DarkBlue, PropertyColor.Green], 4, 1),
    ...wildcard([PropertyColor.Green, PropertyColor.Railroad], 4, 1),
    ...wildcard([PropertyColor.Utility, PropertyColor.Railroad], 2, 1),
    ...wildcard([PropertyColor.LightBlue, PropertyColor.Railroad], 4, 1),
    ...wildcard([PropertyColor.LightBlue, PropertyColor.Brown], 1, 1),
    ...wildcard([PropertyColor.Pink, PropertyColor.Orange], 2, 2),
    ...wildcard([PropertyColor.Red, PropertyColor.Yellow], 3, 2),
    // Multi-color wildcards (all colors) - 2 total
    ...wildcard(Object.values(PropertyColor), 0, 2),

    // Action cards (34)
    ...action(CardType.PassGo, 1, 10),
    ...action(CardType.SlyDeal, 3, 3),
    ...action(CardType.ForceDeal, 3, 3),
    ...action(CardType.DealBreaker, 5, 2),
    ...action(CardType.DebtCollector, 3, 3),
    ...action(CardType.Birthday, 2, 3),
    ...action(CardType.JustSayNo, 4, 3),
    ...action(CardType.DoubleTheRent, 1, 2),
    ...action(CardType.House, 3, 3),
    ...action(CardType.Hotel, 4, 2),

    // Rent cards (13)
    ...rentDual(PropertyColor.DarkBlue, PropertyColor.Green, 2),
    ...rentDual(PropertyColor.Red, PropertyColor.Yellow, 2),
    ...rentDual(PropertyColor.Pink, PropertyColor.Orange, 2),
    ...rentDual(PropertyColor.LightBlue, PropertyColor.Brown, 2),
    ...rentDual(PropertyColor.Railroad, PropertyColor.Utility, 2),
    ...rentWild(3),
  ];

  return cards;
}

export function shuffleDeck(cards: Card[]): Card[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}
