import { type GameState, type Player, GamePhase } from "../models/types.ts";
import { GameEngine } from "../engine/game-engine.ts";

const ROOM_CODE_LENGTH = 6;
const ROOM_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity

export class RoomManager {
  private rooms = new Map<string, GameState>();
  private engine = new GameEngine();
  private cleanupInterval: ReturnType<typeof setInterval>;
  private tickInterval: ReturnType<typeof setInterval>;
  private onStateChange?: (roomCode: string) => void;

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
      if (now - game.lastActivityAt > ROOM_TIMEOUT_MS) {
        this.rooms.delete(code);
      }
    }
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}
