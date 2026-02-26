export const PropertyColor = {
  Brown: "brown",
  LightBlue: "lightBlue",
  Pink: "pink",
  Orange: "orange",
  Red: "red",
  Yellow: "yellow",
  Green: "green",
  DarkBlue: "darkBlue",
  Railroad: "railroad",
  Utility: "utility",
} as const;

export type PropertyColor = (typeof PropertyColor)[keyof typeof PropertyColor];

export const CardType = {
  Money: "money",
  Property: "property",
  PropertyWildcard: "propertyWildcard",
  RentDual: "rentDual",
  RentWild: "rentWild",
  PassGo: "passGo",
  SlyDeal: "slyDeal",
  ForceDeal: "forceDeal",
  DealBreaker: "dealBreaker",
  DebtCollector: "debtCollector",
  Birthday: "birthday",
  JustSayNo: "justSayNo",
  DoubleTheRent: "doubleTheRent",
  House: "house",
  Hotel: "hotel",
} as const;

export type CardType = (typeof CardType)[keyof typeof CardType];

export interface Card {
  id: string;
  type: CardType;
  value: number;
  name?: string;
  colors?: PropertyColor[];
}

export interface GameSettings {
  maxHandSize: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  maxHandSize: 7,
};

export interface PropertySet {
  color: PropertyColor;
  cards: Card[];
  house: Card | null;
  hotel: Card | null;
}

export interface ClientPlayer {
  id: string;
  name: string;
  handCount: number;
  bank: Card[];
  properties: PropertySet[];
  connected: boolean;
  hand?: Card[];
  isBot?: boolean;
}

export const GamePhase = {
  Waiting: "waiting",
  Playing: "playing",
  Finished: "finished",
} as const;

export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];

export const TurnPhase = {
  Draw: "draw",
  Play: "play",
  Discard: "discard",
  ActionPending: "actionPending",
} as const;

export type TurnPhase = (typeof TurnPhase)[keyof typeof TurnPhase];

export interface PendingAction {
  type: "rent" | "debtCollector" | "birthday" | "slyDeal" | "forceDeal" | "dealBreaker";
  sourcePlayerId: string;
  targetPlayerIds: string[];
  amount?: number;
  respondedPlayerIds: string[];
  justSayNoChain?: {
    targetPlayerId: string;
    depth: number;
  };
  selectedCards?: {
    sourceCardId?: string;
    targetCardId?: string;
    targetSetColor?: PropertyColor;
  };
}

export interface TurnState {
  playerId: string;
  cardsPlayed: number;
  phase: TurnPhase;
  pendingAction: PendingAction | null;
  rentMultiplier: number;
}

export interface ClientGameState {
  id: string;
  players: ClientPlayer[];
  deckCount: number;
  discardPile: Card[];
  currentPlayerIndex: number;
  phase: GamePhase;
  turn: TurnState | null;
  winner: string | null;
  createdAt: number;
  lastActivityAt: number;
  settings: GameSettings;
}

export const SET_SIZE: Record<PropertyColor, number> = {
  [PropertyColor.Brown]: 2,
  [PropertyColor.LightBlue]: 3,
  [PropertyColor.Pink]: 3,
  [PropertyColor.Orange]: 3,
  [PropertyColor.Red]: 3,
  [PropertyColor.Yellow]: 3,
  [PropertyColor.Green]: 3,
  [PropertyColor.DarkBlue]: 2,
  [PropertyColor.Railroad]: 4,
  [PropertyColor.Utility]: 2,
};

export const PROPERTY_COLOR_LABEL: Record<PropertyColor, string> = {
  [PropertyColor.Brown]: "Brown",
  [PropertyColor.LightBlue]: "Light Blue",
  [PropertyColor.Pink]: "Pink",
  [PropertyColor.Orange]: "Orange",
  [PropertyColor.Red]: "Red",
  [PropertyColor.Yellow]: "Yellow",
  [PropertyColor.Green]: "Green",
  [PropertyColor.DarkBlue]: "Dark Blue",
  [PropertyColor.Railroad]: "Railroad",
  [PropertyColor.Utility]: "Utility",
};

export const PROPERTY_COLOR_HEX: Record<PropertyColor, string> = {
  [PropertyColor.Brown]: "#8B4513",
  [PropertyColor.LightBlue]: "#87CEEB",
  [PropertyColor.Pink]: "#FF69B4",
  [PropertyColor.Orange]: "#FF8C00",
  [PropertyColor.Red]: "#DC2626",
  [PropertyColor.Yellow]: "#EAB308",
  [PropertyColor.Green]: "#16A34A",
  [PropertyColor.DarkBlue]: "#1E3A8A",
  [PropertyColor.Railroad]: "#1F2937",
  [PropertyColor.Utility]: "#6B7280",
};

export const CARD_TYPE_LABEL: Record<CardType, string> = {
  [CardType.Money]: "Money",
  [CardType.Property]: "Property",
  [CardType.PropertyWildcard]: "Wild Property",
  [CardType.RentDual]: "Rent",
  [CardType.RentWild]: "Wild Rent",
  [CardType.PassGo]: "Pass Go",
  [CardType.SlyDeal]: "Sly Deal",
  [CardType.ForceDeal]: "Force Deal",
  [CardType.DealBreaker]: "Deal Breaker",
  [CardType.DebtCollector]: "Debt Collector",
  [CardType.Birthday]: "It's My Birthday",
  [CardType.JustSayNo]: "Just Say No",
  [CardType.DoubleTheRent]: "Double Rent",
  [CardType.House]: "House",
  [CardType.Hotel]: "Hotel",
};

export const RENT_VALUES: Record<PropertyColor, number[]> = {
  [PropertyColor.Brown]: [1, 2],
  [PropertyColor.LightBlue]: [1, 2, 3],
  [PropertyColor.Pink]: [1, 2, 4],
  [PropertyColor.Orange]: [1, 3, 5],
  [PropertyColor.Red]: [2, 3, 6],
  [PropertyColor.Yellow]: [2, 4, 6],
  [PropertyColor.Green]: [2, 4, 7],
  [PropertyColor.DarkBlue]: [3, 8],
  [PropertyColor.Railroad]: [1, 2, 3, 4],
  [PropertyColor.Utility]: [1, 2],
};

export function isSetComplete(set: PropertySet): boolean {
  return set.cards.length >= SET_SIZE[set.color];
}

export type ServerMessage =
  | { type: "ROOM_JOINED"; payload: { playerId: string; roomCode: string; state: ClientGameState } }
  | { type: "GAME_STATE_UPDATE"; payload: { state: ClientGameState } }
  | { type: "ERROR"; payload: { message: string } }
  | { type: "PLAYER_JOINED"; payload: { playerName: string; playerId: string } }
  | { type: "PLAYER_LEFT"; payload: { playerId: string } }
  | { type: "GAME_STARTED" }
  | { type: "TURN_STARTED"; payload: { playerId: string } }
  | { type: "ACTION_REQUIRED"; payload: { action: PendingAction } }
  | { type: "GAME_ENDED"; payload: { winnerId: string; winnerName: string } }
  | { type: "REMATCH_STARTED"; payload: { state: ClientGameState } };
