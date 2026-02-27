export enum PropertyColor {
  Brown = "brown",
  LightBlue = "lightBlue",
  Pink = "pink",
  Orange = "orange",
  Red = "red",
  Yellow = "yellow",
  Green = "green",
  DarkBlue = "darkBlue",
  Railroad = "railroad",
  Utility = "utility",
  Unassigned = "unassigned", // Used for Rainbow wildcard sets
}

export enum CardType {
  Money = "money",
  Property = "property",
  PropertyWildcard = "propertyWildcard",
  RentDual = "rentDual",
  RentWild = "rentWild",
  PassGo = "passGo",
  SlyDeal = "slyDeal",
  ForceDeal = "forceDeal",
  DealBreaker = "dealBreaker",
  DebtCollector = "debtCollector",
  Birthday = "birthday",
  JustSayNo = "justSayNo",
  DoubleTheRent = "doubleTheRent",
  House = "house",
  Hotel = "hotel",
}

export interface Card {
  id: string;
  type: CardType;
  value: number;
  name?: string;
  colors?: PropertyColor[];
}

export interface GameSettings {
  maxHandSize: number;
  turnTimer: number;
  allowDuplicateSets: boolean;
  houseHotelRules: boolean;
  wildcardFlipCountsAsMove: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  maxHandSize: 7,
  turnTimer: 0,
  allowDuplicateSets: true,
  houseHotelRules: true,
  wildcardFlipCountsAsMove: false,
};

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
  [PropertyColor.Unassigned]: 999, // Unassigned wildcards can stack infinitely
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
  [PropertyColor.Unassigned]: [0],
};

export interface PropertySet {
  color: PropertyColor;
  cards: Card[];
  house: Card | null;
  hotel: Card | null;
}

export function isSetComplete(set: PropertySet): boolean {
  return set.cards.length >= SET_SIZE[set.color];
}

export function getSetRent(set: PropertySet): number {
  const rents = RENT_VALUES[set.color];
  const idx = Math.min(set.cards.length, rents.length) - 1;
  if (idx < 0) return 0;
  let rent = rents[idx]!;
  if (isSetComplete(set) && set.house) rent += 3;
  if (isSetComplete(set) && set.hotel) rent += 4;
  return rent;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  bank: Card[];
  properties: PropertySet[];
  connected: boolean;
  isBot?: boolean;
}

export enum GamePhase {
  Waiting = "waiting",
  Playing = "playing",
  Finished = "finished",
}

export enum TurnPhase {
  Draw = "draw",
  Play = "play",
  Discard = "discard",
  ActionPending = "actionPending",
}

export interface PendingAction {
  type: "rent" | "debtCollector" | "birthday" | "slyDeal" | "forceDeal" | "dealBreaker";
  sourcePlayerId: string;
  targetPlayerIds: string[];
  amount?: number;
  respondedPlayerIds: string[];
  /** For Just Say No chains: tracks which players have active JSN exchanges */
  justSayNoChain?: {
    targetPlayerId: string;
    depth: number; // odd = target said no, even = source countered
  };
  /** For sly deal / force deal / deal breaker — which cards are being targeted */
  selectedCards?: {
    sourceCardId?: string;
    targetCardId?: string;
    targetSetColor?: PropertyColor;
  };
}

export interface PendingWildcardAssignment {
  playerId: string; // Player who needs to assign the wildcard
  cardId: string; // The wildcard card that needs assignment
  availableColors: PropertyColor[]; // Colors this wildcard can be assigned to
}

export interface TurnState {
  playerId: string;
  cardsPlayed: number;
  phase: TurnPhase;
  pendingAction: PendingAction | null;
  pendingWildcardAssignment: PendingWildcardAssignment | null;
  rentMultiplier: number; // Tracks active "Double the Rent" multiplier (1 = normal, 2 = doubled, 4 = double-doubled)
}

export interface GameState {
  id: string;
  players: Player[];
  deck: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  phase: GamePhase;
  turn: TurnState | null;
  winner: string | null;
  createdAt: number;
  lastActivityAt: number;
  settings: GameSettings;
}

export type ClientGameState = Omit<GameState, "deck" | "players"> & {
  deckCount: number;
  players: ClientPlayer[];
};

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

export function toClientState(state: GameState, forPlayerId: string): ClientGameState {
  const { deck, players, ...rest } = state;
  return {
    ...rest,
    deckCount: deck.length,
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      handCount: p.hand.length,
      bank: p.bank,
      properties: p.properties,
      connected: p.connected,
      hand: p.id === forPlayerId ? p.hand : undefined,
      isBot: p.isBot,
    })),
  };
}

// WebSocket message types

export type ClientMessage =
  | { type: "JOIN_ROOM"; payload: { roomCode: string; playerName: string } }
  | { type: "START_GAME" }
  | { type: "PLAY_CARD_TO_BANK"; payload: { cardId: string } }
  | { type: "PLAY_CARD_TO_PROPERTY"; payload: { cardId: string; asColor: PropertyColor | null; groupWithUnassigned?: boolean } }
  | { type: "PLAY_ACTION_CARD"; payload: PlayActionPayload }
  | { type: "END_TURN" }
  | { type: "DISCARD_CARDS"; payload: { cardIds: string[] } }
  | { type: "PAY_WITH_CARDS"; payload: { cardIds: string[] } }
  | { type: "JUST_SAY_NO" }
  | { type: "ACCEPT_ACTION" }
  | { type: "SELECT_PAYMENT_CARDS"; payload: { cardIds: string[] } }
  | { type: "REARRANGE_PROPERTY"; payload: { cardId: string; toColor: PropertyColor } }
  | { type: "ASSIGN_RECEIVED_WILDCARD"; payload: { cardId: string; color: PropertyColor } }
  | { type: "UPDATE_SETTINGS"; payload: { settings: Partial<GameSettings> } }
  | { type: "REMATCH" }
  | { type: "ADD_BOT" }
  | { type: "RESIGN" }
  | { type: "DEV_INJECT_CARD"; payload: { cardType: CardType; targetPlayerId?: string; colors?: PropertyColor[] } }
  | { type: "DEV_GIVE_COMPLETE_SET"; payload: { color: PropertyColor; targetPlayerId?: string } }
  | { type: "DEV_SET_MONEY"; payload: { amount: number; targetPlayerId?: string } };

export type PlayActionPayload =
  | { action: "passGo"; cardId: string }
  | { action: "slyDeal"; cardId: string; targetPlayerId: string; targetCardId: string }
  | { action: "forceDeal"; cardId: string; myCardId: string; targetPlayerId: string; targetCardId: string }
  | { action: "dealBreaker"; cardId: string; targetPlayerId: string; targetSetColor: PropertyColor }
  | { action: "debtCollector"; cardId: string; targetPlayerId: string }
  | { action: "birthday"; cardId: string }
  | { action: "rentDual"; cardId: string; color: PropertyColor }
  | { action: "rentWild"; cardId: string; color: PropertyColor; targetPlayerId: string }
  | { action: "doubleTheRent"; cardId: string }
  | { action: "house"; cardId: string; setColor: PropertyColor }
  | { action: "hotel"; cardId: string; setColor: PropertyColor };

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
