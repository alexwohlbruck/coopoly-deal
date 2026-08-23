import {
  type GameSettings,
  type GameState,
  type Player,
  type PublicRoomSummary,
  GamePhase,
} from "../models/types.ts";
import { GameEngine, MAX_PLAYERS } from "../engine/game-engine.ts";
import {
  type RoomStore,
  NullRoomStore,
  isPlausibleGameState,
} from "./room-store.ts";

const ROOM_CODE_LENGTH = 6;
const ROOM_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
const FINISHED_ROOM_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes after game ends
// Waiting rooms nobody is connected to are reaped fast so the public
// browser doesn't fill up with lobbies whose host closed the tab.
const ABANDONED_LOBBY_TIMEOUT_MS = 2 * 60 * 1000;
const MAX_ROOMS = 100;
/**
 * Off by default: rooms are written once, on the way down.
 *
 * A deploy sends SIGTERM, so the snapshot that matters is the one taken then —
 * a few KB per release rather than a write every few seconds for the lifetime
 * of the process. Set a non-zero interval to also snapshot periodically, which
 * buys insurance against the process being killed outright (OOM, SIGKILL, the
 * host going down) at the cost of steady disk writes.
 */
const DEFAULT_SNAPSHOT_INTERVAL_MS = 0;
/**
 * How long players have to reclaim their seats after the server comes back.
 *
 * Dropping out of a game is normally final, but a restart closes every socket
 * at once — that is the server leaving, not the players. Restored rooms get a
 * window in which the people who were already sitting there can pick their
 * seats back up; anyone who doesn't is treated as having dropped.
 */
const RECLAIM_WINDOW_MS = 90_000;

export class RoomManager {
  private rooms = new Map<string, GameState>();
  private engine = new GameEngine();
  private cleanupInterval: ReturnType<typeof setInterval>;
  private tickInterval: ReturnType<typeof setInterval>;
  private snapshotInterval: ReturnType<typeof setInterval> | null;
  /** Room code -> when unclaimed seats in that restored room get swept. */
  private reclaimDeadlines = new Map<string, number>();
  private onStateChange?: (roomCode: string) => void;
  private onRoomCleaned?: (roomCode: string, playerIds: string[]) => void;
  /** Supplied by the WS layer, which owns spectator sockets. */
  private spectatorCountFor: (roomCode: string) => number = () => 0;

  constructor(
    private readonly store: RoomStore = new NullRoomStore(),
    private readonly reclaimWindowMs: number = RECLAIM_WINDOW_MS,
    snapshotIntervalMs: number = DEFAULT_SNAPSHOT_INTERVAL_MS,
  ) {
    this.cleanupInterval = setInterval(
      () => this.cleanupInactiveRooms(),
      60_000,
    );
    this.tickInterval = setInterval(() => this.tick(), 1000);
    this.snapshotInterval =
      snapshotIntervalMs > 0
        ? setInterval(() => this.persist(), snapshotIntervalMs)
        : null;
  }

  /**
   * Reload rooms left behind by the previous process and return the codes that
   * came back, so the caller can restart anything that was mid-flight.
   *
   * Call this once at boot, before serving traffic.
   */
  restore(): string[] {
    let snapshot;
    try {
      snapshot = this.store.load();
    } catch (err) {
      console.error("[rooms] could not read snapshot, starting empty:", err);
      return [];
    }
    if (!snapshot) return [];

    const now = Date.now();
    const downtime = Math.max(0, now - snapshot.savedAt);
    const restored: string[] = [];
    let dropped = 0;

    for (const game of snapshot.rooms) {
      if (this.rooms.size >= MAX_ROOMS) break;
      if (!isPlausibleGameState(game) || this.rooms.has(game.id)) {
        dropped++;
        continue;
      }
      if (!this.prepareRestoredRoom(game, now, downtime)) {
        dropped++;
        continue;
      }
      this.rooms.set(game.id, game);
      if (game.phase === GamePhase.Playing) {
        this.reclaimDeadlines.set(game.id, now + this.reclaimWindowMs);
      }
      restored.push(game.id);
    }

    console.log(
      `[rooms] restored ${restored.length} room(s) after ${Math.round(downtime / 1000)}s down` +
        (dropped ? `, dropped ${dropped}` : ""),
    );
    return restored;
  }

  /**
   * Fix up a room coming off disk, or reject it. Returns false to drop it.
   */
  private prepareRestoredRoom(
    game: GameState,
    now: number,
    downtime: number,
  ): boolean {
    // A finished game is minutes from being swept anyway, and its result has
    // already been shown to everyone who was there.
    if (game.phase === GamePhase.Finished) return false;

    // Too old to be worth reviving — cleanupInactiveRooms would bin it shortly.
    if (now - game.lastActivityAt > ROOM_TIMEOUT_MS) return false;

    // These are absolute timestamps that kept running while there was no server
    // to play against. Roll them forward so the outage doesn't count against a
    // room, and so the bot watchdog in handleTurnTimeout doesn't read it as a
    // wedged bot.
    game.lastActivityAt += downtime;
    if (game.turn?.expiresAt != null) game.turn.expiresAt += downtime;

    if (game.phase === GamePhase.Waiting) {
      // Leaving a lobby already drops you from it (GameEngine.removePlayer), so
      // a lobby that survives a restart is an empty one. Keeping the room alive
      // is still worth it: the code stays valid, so join links and QR codes
      // that are already out there keep working, and the host's settings hold.
      game.players = [];
      game.currentPlayerIndex = 0;
      // An empty lobby is swept on EMPTY_LOBBY_TIMEOUT_MS, which is short. Roll
      // the clock forward so the outage does not eat the window the returning
      // players need to come back through their link.
      game.lastActivityAt += downtime;
      return true;
    }

    // Nothing to come back to if every human is gone.
    if (!game.players.some((p) => !p.isBot)) return false;

    // The old process's sockets died with it. Every human must be marked absent
    // or the name match in joinRoom() won't fire, and players returning to their
    // own game would be seated again as strangers.
    //
    // Bots are left as they were. A bot never held a socket, so it has nothing
    // to come back from: marking one absent shows it as gone to everyone at the
    // table and then hands it to sweepUnclaimedSeats at the reclaim deadline,
    // which ends a one-human game 90 seconds after every restart.
    for (const player of game.players) {
      if (!player.isBot) player.connected = false;
    }

    return true;
  }

  /**
   * Write the current rooms out. Safe to call at any time; never throws.
   */
  persist(): void {
    try {
      this.store.save(this.persistableRooms());
    } catch (err) {
      console.error("[rooms] snapshot failed:", err);
    }
  }

  /**
   * The rooms worth carrying across a restart. Everything excluded here is
   * something restore() would refuse anyway — filtering on the way out keeps
   * the file small rather than writing rows that can only ever be discarded.
   */
  private persistableRooms(): GameState[] {
    const rooms: GameState[] = [];
    for (const game of this.rooms.values()) {
      if (game.phase === GamePhase.Finished) continue;
      if (game.players.length === 0) continue;
      if (game.phase === GamePhase.Waiting) {
        rooms.push(game);
        continue;
      }
      if (!game.players.some((p) => !p.isBot)) continue;
      rooms.push(game);
    }
    return rooms;
  }

  setOnStateChange(callback: (roomCode: string) => void) {
    this.onStateChange = callback;
  }

  setOnRoomCleaned(callback: (roomCode: string, playerIds: string[]) => void) {
    this.onRoomCleaned = callback;
  }

  setSpectatorCountProvider(provider: (roomCode: string) => number) {
    this.spectatorCountFor = provider;
  }

  private tick(): void {
    this.sweepUnclaimedSeats();

    for (const [code, game] of this.rooms.entries()) {
      // One wedged room must not take the whole server with it: this runs on
      // an interval, so an uncaught throw here kills the process and every
      // other game along with it.
      try {
        // Presence first: a suspended game has to come back before its clock
        // means anything.
        let changed = this.engine.updateTurnForPresence(game);
        if (this.engine.handleTurnTimeout(game)) changed = true;
        if (changed) this.onStateChange?.(code);
      } catch (err) {
        console.error(`[tick] room ${code} failed to advance:`, err);
      }
    }
  }

  /**
   * Drop anyone who never came back after a restart, and end the game if that
   * leaves too few players to carry on. Runs on every tick; public so a test
   * can drive it without waiting out the window.
   */
  sweepUnclaimedSeats(): void {
    if (this.reclaimDeadlines.size === 0) return;
    const now = Date.now();

    for (const [code, deadline] of this.reclaimDeadlines) {
      if (now < deadline) continue;
      this.reclaimDeadlines.delete(code);

      const game = this.rooms.get(code);
      if (!game || game.phase !== GamePhase.Playing) continue;

      // Bots are excluded on principle rather than because of the line above:
      // there is no socket that could ever reclaim one, so an absent bot is a
      // bookkeeping mistake, never a player who left.
      const absent = game.players
        .filter((p) => !p.connected && !p.isBot)
        .map((p) => p.id);
      if (absent.length === 0) continue;

      try {
        for (const id of absent) this.engine.removePlayer(game, id);
      } catch (err) {
        console.error(`[rooms] room ${code} failed to sweep seats:`, err);
        continue;
      }
      console.log(
        `[rooms] room ${code}: dropped ${absent.length} seat(s) nobody reclaimed`,
      );
      this.onStateChange?.(code);
    }
  }

  generateRoomCode(): string {
    let code: string;
    do {
      code = Math.floor(Math.random() * 10 ** ROOM_CODE_LENGTH)
        .toString()
        .padStart(ROOM_CODE_LENGTH, "0");
    } while (this.rooms.has(code));
    return code;
  }

  /**
   * `options` carries the creator's remembered preferences, applied here so
   * the room's very first state already reflects them — a lobby that has to
   * be corrected by a follow-up settings message visibly flips a second after
   * it paints.
   */
  createRoom(options?: {
    settings?: Partial<GameSettings>;
    isPublic?: boolean;
  }): GameState {
    if (this.rooms.size >= MAX_ROOMS) {
      throw new Error("Server is at capacity, please try again later");
    }
    const code = this.generateRoomCode();
    const game = this.engine.createGame(code);
    if (options?.settings) {
      game.settings = { ...game.settings, ...options.settings };
    }
    if (options?.isPublic) game.isPublic = true;
    this.rooms.set(code, game);
    return game;
  }

  getRoom(code: string): GameState | null {
    return this.rooms.get(code) ?? null;
  }

  joinRoom(
    code: string,
    playerName: string,
    playerId?: string,
  ): { game: GameState; player: Player; reclaimed: boolean } {
    const game = this.rooms.get(code);
    if (!game) throw new Error("Game not found");

    // A player coming back reclaims the seat they already hold instead of
    // being dealt a second one. This matters most in a lobby, where a dropped
    // socket the server has not noticed yet would otherwise leave a duplicate
    // row behind, cost the host their place at index 0, and keep refreshing
    // lastActivityAt so the room never ages out. Matching on the id is safe
    // where matching on the name would not be: it is a UUID the client keeps
    // to itself, so typing someone's name cannot take their seat.
    if (playerId) {
      const existing = game.players.find((p) => p.id === playerId);
      if (existing) {
        existing.connected = true;
        // Renaming is a lobby-only privilege, same as UPDATE_PLAYER_NAME.
        if (game.phase === GamePhase.Waiting && playerName) {
          existing.name = playerName;
        }
        game.lastActivityAt = Date.now();
        return { game, player: existing, reclaimed: true };
      }
    }

    // If game is in progress, try to reconnect a disconnected player with the same name
    if (game.phase !== GamePhase.Waiting) {
      const disconnected = game.players.find(
        (p) => !p.connected && p.name === playerName,
      );
      if (disconnected) {
        disconnected.connected = true;
        game.lastActivityAt = Date.now();
        return { game, player: disconnected, reclaimed: true };
      }
    }

    const player = this.engine.addPlayer(game, playerName);
    return { game, player, reclaimed: false };
  }

  reconnectPlayer(code: string, playerId: string): GameState {
    const game = this.rooms.get(code);
    if (!game) throw new Error("Game not found");
    const player = game.players.find((p) => p.id === playerId);
    if (!player) throw new Error("Player not found in game");
    player.connected = true;
    return game;
  }

  setRoomVisibility(code: string, isPublic: boolean): GameState {
    const game = this.rooms.get(code);
    if (!game) throw new Error("Game not found");
    game.isPublic = isPublic;
    game.lastActivityAt = Date.now();
    return game;
  }

  /**
   * Public rooms worth showing in the lobby browser. Rooms with nobody
   * connected are dropped; in-progress games stay listed (marked not
   * joinable) so they can still be spectated, and games sitting on the end
   * screen are joinable — whoever joins is dealt into the rematch.
   */
  listPublicRooms(): PublicRoomSummary[] {
    const summaries: PublicRoomSummary[] = [];
    for (const game of this.rooms.values()) {
      if (!game.isPublic) continue;
      if (!game.players.some((p) => p.connected && !p.isBot)) continue;

      const botCount = game.players.filter((p) => p.isBot).length;
      const host = game.players.find((p) => !p.isBot) ?? game.players[0];
      summaries.push({
        roomCode: game.id,
        hostName: host?.name ?? "Unknown",
        playerCount: game.players.length,
        botCount,
        maxPlayers: MAX_PLAYERS,
        spectatorCount: this.spectatorCountFor(game.id),
        phase: game.phase,
        createdAt: game.createdAt,
        joinable:
          game.phase !== GamePhase.Playing &&
          game.players.length < MAX_PLAYERS,
        settings: {
          turnTimer: game.settings.turnTimer,
          movesPerTurn: game.settings.movesPerTurn,
          setsToWin: game.settings.setsToWin,
          maxHandSize: game.settings.maxHandSize,
          allowDuplicateSets: game.settings.allowDuplicateSets,
        },
      });
    }
    // Joinable lobbies first, then the fullest ones (closest to starting).
    summaries.sort(
      (a, b) =>
        Number(b.joinable) - Number(a.joinable) ||
        b.playerCount - a.playerCount ||
        a.createdAt - b.createdAt,
    );
    return summaries;
  }

  startGame(code: string): GameState {
    const game = this.rooms.get(code);
    if (!game) throw new Error("Game not found");
    this.engine.startGame(game);
    return game;
  }

  getEngine(): GameEngine {
    return this.engine;
  }

  removeRoom(code: string): void {
    this.rooms.delete(code);
    this.reclaimDeadlines.delete(code);
  }

  private cleanupInactiveRooms(): void {
    const now = Date.now();
    for (const [code, game] of this.rooms) {
      // A waiting room with no connected humans is abandoned — nobody can
      // revive it, and if it's public it clutters the browser.
      const isAbandonedLobby =
        game.phase === GamePhase.Waiting &&
        !game.players.some((p) => p.connected && !p.isBot);
      const timeout =
        game.phase === GamePhase.Finished
          ? FINISHED_ROOM_TIMEOUT_MS
          : isAbandonedLobby
            ? ABANDONED_LOBBY_TIMEOUT_MS
            : ROOM_TIMEOUT_MS;
      if (now - game.lastActivityAt > timeout) {
        const playerIds = game.players.map((p) => p.id);
        this.rooms.delete(code);
        this.reclaimDeadlines.delete(code);
        this.onRoomCleaned?.(code, playerIds);
      }
    }
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    clearInterval(this.tickInterval);
    if (this.snapshotInterval) clearInterval(this.snapshotInterval);
    this.rooms.clear();
    this.reclaimDeadlines.clear();
  }
}
