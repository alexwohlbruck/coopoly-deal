import type { Card, ClientGameState } from "../types/game";
import { CardType, isSetComplete } from "../types/game";

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function canPlayDealBreaker(
  gameState: ClientGameState,
  playerId: string
): ValidationResult {
  const opponents = gameState.players.filter((p) => p.id !== playerId);
  const hasCompleteSet = opponents.some((p) =>
    p.properties.some((set) => isSetComplete(set))
  );

  if (!hasCompleteSet) {
    return {
      valid: false,
      reason: "No opponent has a complete set to steal",
    };
  }

  return { valid: true };
}

export function canPlaySlyDeal(
  gameState: ClientGameState,
  playerId: string
): ValidationResult {
  const opponents = gameState.players.filter((p) => p.id !== playerId);
  const hasStealableProperty = opponents.some((p) =>
    p.properties.some(
      (set) => !isSetComplete(set) && set.cards.length > 0
    )
  );

  if (!hasStealableProperty) {
    return {
      valid: false,
      reason: "No opponent has a stealable property",
    };
  }

  return { valid: true };
}

export function canPlayForceDeal(
  gameState: ClientGameState,
  playerId: string
): ValidationResult {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    return { valid: false, reason: "Player not found" };
  }

  const hasSwappableProperty = player.properties.some(
    (set) => !isSetComplete(set) && set.cards.length > 0
  );

  if (!hasSwappableProperty) {
    return {
      valid: false,
      reason: "You don't have any swappable properties",
    };
  }

  const opponents = gameState.players.filter((p) => p.id !== playerId);
  const opponentHasSwappable = opponents.some((p) =>
    p.properties.some(
      (set) => !isSetComplete(set) && set.cards.length > 0
    )
  );

  if (!opponentHasSwappable) {
    return {
      valid: false,
      reason: "No opponent has a swappable property",
    };
  }

  return { valid: true };
}

export function canPlayRent(
  gameState: ClientGameState,
  playerId: string,
  card: Card
): ValidationResult {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    return { valid: false, reason: "Player not found" };
  }

  // Check if player has at least one property of a valid color
  const validColors = card.colors || [];
  const hasValidProperty = player.properties.some((set) =>
    validColors.includes(set.color)
  );

  if (!hasValidProperty) {
    return {
      valid: false,
      reason: "You don't have any properties of the required color",
    };
  }

  return { valid: true };
}

export function canPlayHouse(
  gameState: ClientGameState,
  playerId: string
): ValidationResult {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    return { valid: false, reason: "Player not found" };
  }

  const hasCompleteSet = player.properties.some(
    (set) =>
      isSetComplete(set) &&
      !set.house &&
      set.color !== "railroad" &&
      set.color !== "utility"
  );

  if (!hasCompleteSet) {
    return {
      valid: false,
      reason: "You need a complete set without a house (not Railroad/Utility)",
    };
  }

  return { valid: true };
}

export function canPlayHotel(
  gameState: ClientGameState,
  playerId: string
): ValidationResult {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    return { valid: false, reason: "Player not found" };
  }

  const hasCompleteSetWithHouse = player.properties.some(
    (set) =>
      isSetComplete(set) &&
      set.house &&
      !set.hotel &&
      set.color !== "railroad" &&
      set.color !== "utility"
  );

  if (!hasCompleteSetWithHouse) {
    return {
      valid: false,
      reason: "You need a complete set with a house but no hotel",
    };
  }

  return { valid: true };
}

export function canPlayDoubleTheRent(
  gameState: ClientGameState,
  playerId: string
): ValidationResult {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player || !player.hand) {
    return { valid: false, reason: "Player not found" };
  }

  const hasRentCard = player.hand.some(
    (card) => card.type === CardType.RentDual || card.type === CardType.RentWild
  );

  if (!hasRentCard) {
    return {
      valid: false,
      reason: "You need a rent card to use Double the Rent",
    };
  }

  return { valid: true };
}

export function validateActionCard(
  card: Card,
  gameState: ClientGameState,
  playerId: string
): ValidationResult {
  switch (card.type) {
    case CardType.DealBreaker:
      return canPlayDealBreaker(gameState, playerId);
    case CardType.SlyDeal:
      return canPlaySlyDeal(gameState, playerId);
    case CardType.ForceDeal:
      return canPlayForceDeal(gameState, playerId);
    case CardType.RentDual:
    case CardType.RentWild:
      return canPlayRent(gameState, playerId, card);
    case CardType.House:
      return canPlayHouse(gameState, playerId);
    case CardType.Hotel:
      return canPlayHotel(gameState, playerId);
    case CardType.DoubleTheRent:
      return canPlayDoubleTheRent(gameState, playerId);
    default:
      return { valid: true };
  }
}
