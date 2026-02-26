import type { ClientPlayer, PropertyColor } from "../types/game";
import { RENT_VALUES, SET_SIZE } from "../types/game";

/**
 * Calculate the rent amount for a given color based on the player's properties
 */
export function calculateRent(player: ClientPlayer, color: PropertyColor): number {
  let totalCards = 0;
  let hasHouse = false;
  let hasHotel = false;

  for (const set of player.properties) {
    if (set.color === color) {
      totalCards += set.cards.length;
      if (set.house) hasHouse = true;
      if (set.hotel) hasHotel = true;
    }
  }

  if (totalCards === 0) return 0;

  const rents = RENT_VALUES[color];
  const idx = Math.min(totalCards, rents.length) - 1;
  let rent = rents[idx]!;

  if (totalCards >= SET_SIZE[color]) {
    if (hasHouse) rent += 3;
    if (hasHotel) rent += 4;
  }

  return rent;
}
