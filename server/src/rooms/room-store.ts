import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { type GameState, GamePhase, TurnPhase } from "../models/types.ts";

/**
 * Bump this whenever a change to `GameState` makes older snapshots unreadable.
 * A mismatch discards the snapshot instead of feeding the engine a shape it
 * no longer understands — one lost game beats a crash loop on every deploy.
 */
export const SNAPSHOT_VERSION = 1;

export interface RoomSnapshot {
  version: number;
  /** When the snapshot was written. Used to work out how long the server was down. */
  savedAt: number;
  rooms: GameState[];
}

/**
 * Where live rooms go so they can outlive the process.
 *
 * Deliberately narrow: whole-snapshot read and write, no per-room queries. The
 * in-memory `Map` in RoomManager stays the source of truth, so a slower backing
 * store (Postgres, Redis) can drop in here without the engine noticing.
 */
export interface RoomStore {
  load(): RoomSnapshot | null;
  save(rooms: GameState[]): void;
  clear(): void;
}

/** Keeps nothing. Used by tests and when persistence is switched off. */
export class NullRoomStore implements RoomStore {
  load(): RoomSnapshot | null {
    return null;
  }
  save(): void {}
  clear(): void {}
}

/**
 * A single JSON file, rewritten in place.
 *
 * Storage is bounded by design and does not grow over time: one file, no
 * history, no rotation. It holds at most `MAX_ROOMS` live rooms (~20 KB each,
 * so a couple of MB at the server's hard capacity) and is deleted outright
 * whenever no rooms are worth keeping, so an idle server leaves nothing behind.
 */
export class FileRoomStore implements RoomStore {
  private wroteEmpty = false;

  constructor(private readonly path: string) {}

  load(): RoomSnapshot | null {
    if (!existsSync(this.path)) return null;

    const parsed = JSON.parse(readFileSync(this.path, "utf8")) as RoomSnapshot;
    if (parsed?.version !== SNAPSHOT_VERSION) {
      console.warn(
        `[rooms] ignoring snapshot v${parsed?.version} (expected v${SNAPSHOT_VERSION})`,
      );
      this.clear();
      return null;
    }
    if (!Array.isArray(parsed.rooms) || typeof parsed.savedAt !== "number") {
      console.warn("[rooms] ignoring malformed snapshot");
      this.clear();
      return null;
    }
    return parsed;
  }

  save(rooms: GameState[]): void {
    if (rooms.length === 0) {
      // Clear once, then stay quiet: an idle server should do no disk I/O.
      if (!this.wroteEmpty) {
        this.clear();
        this.wroteEmpty = true;
      }
      return;
    }
    this.wroteEmpty = false;

    const snapshot: RoomSnapshot = {
      version: SNAPSHOT_VERSION,
      savedAt: Date.now(),
      rooms,
    };

    mkdirSync(dirname(this.path), { recursive: true });

    // Write-then-rename: a crash mid-write leaves the previous good snapshot
    // intact rather than a truncated file that fails to parse on boot.
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, JSON.stringify(snapshot));
    renameSync(tmp, this.path);
  }

  clear(): void {
    rmSync(this.path, { force: true });
    rmSync(`${this.path}.tmp`, { force: true });
  }
}

/**
 * A restored room is fed straight into the engine, so a snapshot written by an
 * older build whose `GameState` had a different shape could wedge a game. This
 * checks the fields the engine dereferences without guarding, and nothing more
 * — it is a guard against stale snapshots, not a validator.
 */
export function isPlausibleGameState(game: unknown): game is GameState {
  if (!game || typeof game !== "object") return false;
  const g = game as Partial<GameState>;

  if (typeof g.id !== "string" || !g.id) return false;
  if (!Array.isArray(g.players) || !Array.isArray(g.deck)) return false;
  if (!Array.isArray(g.discardPile)) return false;
  if (typeof g.currentPlayerIndex !== "number") return false;
  if (typeof g.lastActivityAt !== "number") return false;
  if (!Object.values(GamePhase).includes(g.phase as GamePhase)) return false;
  if (!g.settings || typeof g.settings !== "object") return false;

  for (const p of g.players) {
    if (!p || typeof p.id !== "string" || typeof p.name !== "string") return false;
    if (!Array.isArray(p.hand) || !Array.isArray(p.bank)) return false;
    if (!Array.isArray(p.properties)) return false;
  }

  if (g.turn != null) {
    if (typeof g.turn.playerId !== "string") return false;
    if (!Object.values(TurnPhase).includes(g.turn.phase as TurnPhase)) return false;
  }

  // A playing game indexes players[currentPlayerIndex] on nearly every action.
  if (g.phase === GamePhase.Playing) {
    if (g.currentPlayerIndex < 0 || g.currentPlayerIndex >= g.players.length) {
      return false;
    }
  }

  return true;
}
