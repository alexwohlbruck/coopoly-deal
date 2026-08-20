import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RoomManager } from "./room-manager.ts";
import { FileRoomStore } from "./room-store.ts";
import {
  CardType,
  GamePhase,
  TurnPhase,
  type Card,
  type GameState,
} from "../models/types.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let dir: string;
let path: string;
const managers: RoomManager[] = [];

/** Stand in for a process restart: the store is the only thing carried over. */
function boot(): RoomManager {
  const manager = new RoomManager(new FileRoomStore(path));
  managers.push(manager);
  return manager;
}

function startedGame(manager: RoomManager, names: string[]): GameState {
  const game = manager.createRoom();
  for (const name of names) manager.joinRoom(game.id, name);
  manager.startGame(game.id);
  return game;
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "coopoly-rooms-"));
  path = join(dir, "rooms.json");
});

afterEach(() => {
  for (const manager of managers.splice(0)) manager.destroy();
  rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Round trip
// ---------------------------------------------------------------------------

describe("room persistence", () => {
  it("carries an in-progress game across a restart", () => {
    const before = boot();
    const game = startedGame(before, ["Ada", "Grace"]);
    const hands = game.players.map((p) => p.hand.length);
    before.persist();

    const after = boot();
    expect(after.restore()).toEqual([game.id]);

    const restored = after.getRoom(game.id)!;
    expect(restored).not.toBeNull();
    expect(restored.phase).toBe(GamePhase.Playing);
    expect(restored.players.map((p) => p.name)).toEqual(["Ada", "Grace"]);
    expect(restored.players.map((p) => p.hand.length)).toEqual(hands);
    expect(restored.deck.length).toBe(game.deck.length);
    expect(restored.turn?.playerId).toBe(game.turn!.playerId);
  });

  it("marks restored players absent so they can rejoin by name", () => {
    const before = boot();
    const game = startedGame(before, ["Ada", "Grace"]);
    expect(game.players.every((p) => p.connected)).toBe(true);
    const adasHand = game.players.find((p) => p.name === "Ada")!.hand.length;
    before.persist();

    const after = boot();
    after.restore();
    const restored = after.getRoom(game.id)!;
    expect(restored.players.every((p) => p.connected)).toBe(false);

    // The client reconnects and re-sends JOIN_ROOM with its stored name. That
    // has to land on the existing seat, hand and all — not add a new player.
    const { player } = after.joinRoom(game.id, "Ada");
    expect(restored.players).toHaveLength(2);
    expect(player.connected).toBe(true);
    expect(player.hand).toHaveLength(adasHand);
  });

  it("rolls turn deadlines forward past the downtime", () => {
    const before = boot();
    const game = startedGame(before, ["Ada", "Grace"]);
    game.turn!.expiresAt = Date.now() + 20_000;
    game.settings.turnTimer = 30;
    before.persist();

    // Fake a 15 second outage: rewind the whole snapshot, deadline included, so
    // it reads as "written 15s ago with 20s left on the clock".
    const store = new FileRoomStore(path);
    const snapshot = store.load()!;
    snapshot.savedAt -= 15_000;
    snapshot.rooms[0]!.turn!.expiresAt! -= 15_000;
    // save() stamps its own savedAt, so write the doctored snapshot directly.
    writeFileSync(path, JSON.stringify(snapshot));

    const after = boot();
    after.restore();
    const restored = after.getRoom(game.id)!;

    // ~20s were left when the server went down; the player should still have
    // ~20s, not 5s, and certainly not a deadline that already passed.
    const remaining = restored.turn!.expiresAt! - Date.now();
    expect(remaining).toBeGreaterThan(18_000);
    expect(remaining).toBeLessThanOrEqual(21_000);
  });

  it("keeps a lobby's room code alive but empties its seats", () => {
    const before = boot();
    const game = before.createRoom();
    before.joinRoom(game.id, "Ada");
    game.settings.setsToWin = 2;
    before.persist();

    const after = boot();
    after.restore();
    const restored = after.getRoom(game.id)!;

    // Leaving a lobby already removes you from it, so everyone rejoins fresh —
    // but the code on the shared join link keeps working, with settings intact.
    expect(restored.phase).toBe(GamePhase.Waiting);
    expect(restored.players).toHaveLength(0);
    expect(restored.settings.setsToWin).toBe(2);

    const { player } = after.joinRoom(game.id, "Ada");
    expect(restored.players).toHaveLength(1);
    expect(player.name).toBe("Ada");
  });
});

// ---------------------------------------------------------------------------
// What must not be kept
// ---------------------------------------------------------------------------

describe("snapshot contents", () => {
  it("drops finished, empty and bot-only rooms", () => {
    const before = boot();

    const finished = startedGame(before, ["Ada", "Grace"]);
    finished.phase = GamePhase.Finished;
    finished.winner = finished.players[0]!.id;

    const emptyLobby = before.createRoom();

    const botsOnly = startedGame(before, ["Ada", "Grace"]);
    for (const p of botsOnly.players) p.isBot = true;

    const live = startedGame(before, ["Ada", "Grace"]);
    before.persist();

    const after = boot();
    expect(after.restore()).toEqual([live.id]);
    expect(after.getRoom(finished.id)).toBeNull();
    expect(after.getRoom(emptyLobby.id)).toBeNull();
    expect(after.getRoom(botsOnly.id)).toBeNull();
  });

  it("drops rooms that went stale while the server was down", () => {
    const before = boot();
    const game = startedGame(before, ["Ada", "Grace"]);
    game.lastActivityAt = Date.now() - 31 * 60 * 1000;
    before.persist();

    const after = boot();
    expect(after.restore()).toEqual([]);
    expect(after.getRoomCount()).toBe(0);
  });

  it("deletes the file once nothing is worth keeping", () => {
    const before = boot();
    const game = startedGame(before, ["Ada", "Grace"]);
    before.persist();
    expect(existsSync(path)).toBe(true);

    before.removeRoom(game.id);
    before.persist();
    expect(existsSync(path)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Bad input
// ---------------------------------------------------------------------------

describe("snapshot resilience", () => {
  it("starts empty rather than throwing on an unreadable file", () => {
    writeFileSync(path, "{ not json");
    const manager = boot();
    expect(manager.restore()).toEqual([]);
  });

  it("discards a snapshot written by an incompatible version", () => {
    const before = boot();
    startedGame(before, ["Ada", "Grace"]);
    before.persist();

    const raw = JSON.parse(readFileSync(path, "utf8"));
    raw.version = 999;
    writeFileSync(path, JSON.stringify(raw));

    const after = boot();
    expect(after.restore()).toEqual([]);
  });

  it("skips rooms whose shape no longer matches the engine", () => {
    const before = boot();
    const good = startedGame(before, ["Ada", "Grace"]);
    const bad = startedGame(before, ["Alan", "Edsger"]);
    before.persist();

    const raw = JSON.parse(readFileSync(path, "utf8"));
    const broken = raw.rooms.find((r: GameState) => r.id === bad.id);
    delete broken.players[0].hand; // an older build's Player shape
    writeFileSync(path, JSON.stringify(raw));

    const after = boot();
    expect(after.restore()).toEqual([good.id]);
    expect(after.getRoom(bad.id)).toBeNull();
  });

  it("keeps a restored game playable", () => {
    const before = boot();
    const game = startedGame(before, ["Ada", "Grace"]);
    before.persist();

    const after = boot();
    after.restore();
    const restored = after.getRoom(game.id)!;
    const { player } = after.joinRoom(game.id, restored.turn!.playerId === restored.players[0]!.id ? "Ada" : "Grace");

    // Drive one real move through the engine to prove the state is not just
    // shaped right but actually usable. Deal a known money card rather than
    // reaching into the shuffled hand, which may be all property.
    expect(restored.turn!.phase).toBe(TurnPhase.Play);
    const handBefore = player.hand.length;
    const card: Card = { id: "test_money", type: CardType.Money, value: 5 };
    player.hand.push(card);

    after.getEngine().playCardToBank(restored, player.id, card.id);

    const seat = restored.players.find((p) => p.id === player.id)!;
    expect(seat.bank).toEqual([card]);
    expect(seat.hand).toHaveLength(handBefore);
  });
});

// ---------------------------------------------------------------------------
// Abandoned lobbies
