import {
  type GameState,
  type Player,
  type PublicRoomSummary,
  GamePhase,
} from "../models/types.ts";
import { GameEngine, MAX_PLAYERS } from "../engine/game-engine.ts";

const ROOM_CODE_LENGTH = 6;
const ROOM_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
const FINISHED_ROOM_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes after game ends
// Waiting rooms nobody is connected to are reaped fast so the public
// browser doesn't fill up with lobbies whose host closed the tab.
const ABANDONED_LOBBY_TIMEOUT_MS = 2 * 60 * 1000;
const MAX_ROOMS = 100;

export class RoomManager {
  private rooms = new Map<string, GameState>();
  private engine = new GameEngine();
  private cleanupInterval: ReturnType<typeof setInterval>;
  private tickInterval: ReturnType<typeof setInterval>;
  private onStateChange?: (roomCode: string) => void;
  private onRoomCleaned?: (roomCode: string, playerIds: string[]) => void;
  /** Supplied by the WS layer, which owns spectator sockets. */
  private spectatorCountFor: (roomCode: string) => number = () => 0;

  constructor() {
    this.cleanupInterval = setInterval(
      () => this.cleanupInactiveRooms(),
      60_000,
    );
    this.tickInterval = setInterval(() => this.tick(), 1000);
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
    for (const [code, game] of this.rooms.entries()) {
      if (this.engine.handleTurnTimeout(game)) {
        this.onStateChange?.(code);
      }
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

  createRoom(): GameState {
    if (this.rooms.size >= MAX_ROOMS) {
      throw new Error("Server is at capacity, please try again later");
    }
    const code = this.generateRoomCode();
    const game = this.engine.createGame(code);
    this.rooms.set(code, game);
    return game;
  }

  getRoom(code: string): GameState | null {
    return this.rooms.get(code) ?? null;
  }

  joinRoom(
    code: string,
    playerName: string,
  ): { game: GameState; player: Player } {
    const game = this.rooms.get(code);
    if (!game) throw new Error("Game not found");

    // If game is in progress, try to reconnect a disconnected player with the same name
    if (game.phase !== GamePhase.Waiting) {
      const disconnected = game.players.find(
        (p) => !p.connected && p.name === playerName,
      );
      if (disconnected) {
        disconnected.connected = true;
        game.lastActivityAt = Date.now();
        return { game, player: disconnected };
      }
    }

    const player = this.engine.addPlayer(game, playerName);
    return { game, player };
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
   * Public rooms worth showing in the lobby browser. Finished games and
   * lobbies with nobody connected are dropped; started games stay listed
   * (marked not joinable) so they can still be spectated.
   */
  listPublicRooms(): PublicRoomSummary[] {
    const summaries: PublicRoomSummary[] = [];
    for (const game of this.rooms.values()) {
      if (!game.isPublic) continue;
      if (game.phase === GamePhase.Finished) continue;
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
          game.phase === GamePhase.Waiting &&
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
    this.rooms.clear();
  }
}
