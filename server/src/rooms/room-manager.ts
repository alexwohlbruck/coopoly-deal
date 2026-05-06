import { type GameState, type Player, GamePhase } from "../models/types.ts";
import { GameEngine } from "../engine/game-engine.ts";

const ROOM_CODE_LENGTH = 6;
const ROOM_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
const FINISHED_ROOM_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes after game ends
const MAX_ROOMS = 100;

export class RoomManager {
  private rooms = new Map<string, GameState>();
  private engine = new GameEngine();
  private cleanupInterval: ReturnType<typeof setInterval>;
  private tickInterval: ReturnType<typeof setInterval>;
  private onStateChange?: (roomCode: string) => void;
  private onRoomCleaned?: (roomCode: string, playerIds: string[]) => void;

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
    if (!game) throw new Error("Room not found");

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
    if (!game) throw new Error("Room not found");
    const player = game.players.find((p) => p.id === playerId);
    if (!player) throw new Error("Player not found in room");
    player.connected = true;
    return game;
  }

  startGame(code: string): GameState {
    const game = this.rooms.get(code);
    if (!game) throw new Error("Room not found");
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
      const timeout =
        game.phase === GamePhase.Finished
          ? FINISHED_ROOM_TIMEOUT_MS
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
