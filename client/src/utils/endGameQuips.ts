// Shared end-of-game quip pool. Used by the standings rows on the
// game-over screen AND the share modal — both surfaces should show the
// same quote for the same game so a player who reads "Lost the means,
// kept the consciousness" in the standings sees the same line in their
// share text.
//
// Tone: Marxist-tinged, punchy. Pools are partitioned by final rank
// (1-4) since "winner" deserves different framing from "last place".

import type { ClientPlayer } from "../types/game";
import { isSetComplete } from "../types/game";

export const QUIPS: Record<number, readonly string[]> = {
  1: [
    "Sole owner of three city blocks. The board complies.",
    "Built a property empire in 14 turns.",
    "The first to three. Rent is, as ever, theft.",
    "History will absolve them — for now.",
    "Late capitalism, early dinner.",
    "Vanguard of the parcel.",
    "Means of production: secured.",
    "The deeds are signed. Comrades, take note.",
    "Primitive accumulation, completed in record time.",
    "Three sets, one ruling class.",
    "The board has spoken. Ownership is destiny.",
    "Capital begets capital. The cycle continues.",
    "A new bourgeoisie is born.",
  ],
  2: [
    "One set short. The Boardwalk awaits.",
    "Came up a deed shy. Rematch?",
    "Silver medal, gilded edges.",
    "So close to vanguard. Cadre status confirmed.",
    "Surplus value extracted, but not enough.",
    "Held the line. The line moved.",
    "Almost — the dialectic isn't finished.",
    "Runner-up in the great game of Monopoly Capital.",
    "A footnote in the next edition of Capital.",
    "The petite bourgeoisie's finest hour.",
    "Second place: the most painful place.",
    "Theory was sound. Practice fell short.",
  ],
  3: [
    "Built things. Lost things. Mostly built.",
    "Held the middle. The middle held back.",
    "Petit bourgeois pretender, foiled.",
    "Lumpenproletariat with property.",
    "A slow descent into bourgeois mediocrity.",
    "Played a fair game. Capitalism didn't.",
    "Third-place revolutionary wears no laurels.",
    "Some accumulated, some alienated. Net: middling.",
    "Mid-cadre. Useful to the cause, statistically.",
    "Class consciousness intact, holdings depleted.",
  ],
  4: [
    "Honored to participate.",
    "Last place, first principles.",
    "Lumpenproletariat. No deeds, no chains.",
    "Lost the means, kept the consciousness.",
    "The wretched of the earth — and this board.",
    "Even Marx didn't win on his first try.",
    "Reading Capital between turns.",
    "Nothing to lose but their cards.",
    "A specter haunts the board — the specter of last place.",
    "The expropriators were expropriated.",
    "Solidarity forever. Money, never.",
    "Last shall be first, eventually. Not this game.",
  ],
};

/** Deterministic pick — hashes the seed and indexes into the array.
 *  Stable for a given seed so the same game always shows the same quip
 *  in standings + share + any future surface. */
export function pickQuip(arr: readonly string[], seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(h) % arr.length;
  return arr[idx] ?? arr[0]!;
}

/** Pick a quip for a player given their final rank. The seed combines
 *  player id + per-game token so the same player gets the same quip
 *  every game (deterministic per game) but different players in the
 *  same game see different lines. */
export function quipForRank(
  rank: number,
  isYou: boolean,
  playerId: string,
  gameSeed: string | number,
): string {
  const arr = QUIPS[rank] ?? QUIPS[4]!;
  const seed = `${playerId}:${gameSeed}`;
  // YOU at rank ≥ 3 always pulls from the rank-3 pool — the rank-4
  // pool's "honored to participate" framing is fine for someone else
  // but reads passive-aggressive when it's about you.
  if (isYou && rank >= 3) {
    return pickQuip(QUIPS[3]!, seed);
  }
  return pickQuip(arr, seed);
}

/** Sort players by final rank order:
 *  1. The winner (declared by the game) is always first.
 *  2. Then by complete sets descending.
 *  3. Then by total value (bank + properties) descending. */
export function sortPlayersByRank(
  players: ClientPlayer[],
  winnerId: string | null,
): ClientPlayer[] {
  return [...players].sort((a, b) => {
    if (a.id === winnerId) return -1;
    if (b.id === winnerId) return 1;
    const aSets = a.properties.filter(isSetComplete).length;
    const bSets = b.properties.filter(isSetComplete).length;
    if (aSets !== bSets) return bSets - aSets;
    const aValue =
      a.bank.reduce((sum, c) => sum + c.value, 0) +
      a.properties.flatMap((s) => s.cards).reduce((sum, c) => sum + c.value, 0);
    const bValue =
      b.bank.reduce((sum, c) => sum + c.value, 0) +
      b.properties.flatMap((s) => s.cards).reduce((sum, c) => sum + c.value, 0);
    return bValue - aValue;
  });
}

/** What rank did this player finish at? 1-indexed, capped at 4 (since
 *  our quip pool only has 4 buckets — 5th and 6th place use the same
 *  rank-4 framing). */
export function getPlayerRank(
  players: ClientPlayer[],
  playerId: string,
  winnerId: string | null,
): number {
  const sorted = sortPlayersByRank(players, winnerId);
  const idx = sorted.findIndex((p) => p.id === playerId);
  return idx === -1 ? 4 : Math.min(idx + 1, 4);
}
