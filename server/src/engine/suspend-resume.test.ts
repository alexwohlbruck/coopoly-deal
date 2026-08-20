import { describe, it, expect } from "bun:test";
import { GameEngine } from "./game-engine.ts";
import { GamePhase, type GameState } from "../models/types.ts";

// ---------------------------------------------------------------------------
// A game nobody is connected to is suspended, not abandoned. A restart marks
// every seat absent at once, so these are the states a restored room passes
// through on its way back.
// ---------------------------------------------------------------------------

function started(count: number, turnTimer = 30) {
  const engine = new GameEngine();
  const state = engine.createGame("000000");
  const players = Array.from({ length: count }, (_, i) =>
    engine.addPlayer(state, `P${i + 1}`),
  );
  state.settings.turnTimer = turnTimer;
  engine.startGame(state);
  return { engine, state, players };
}

/** Everyone marked absent — exactly how a room comes back off a snapshot. */
function emptyTheRoom(state: GameState) {
  for (const p of state.players) p.connected = false;
}

describe("suspending a game nobody is at", () => {
  it("stops the turn clock", () => {
    const { engine, state } = started(3);
    const before = state.turn!.expiresAt!;
    expect(before).toBeGreaterThan(Date.now());

    emptyTheRoom(state);
    expect(engine.updateTurnForPresence(state)).toBe(true);

    expect(state.turn!.expiresAt).toBeNull();
    expect(state.turn!.pausedTimeLeft).toBeGreaterThan(0);
  });

  it("does not run the clock down to nothing while the room is empty", () => {
    const { engine, state } = started(3);
    emptyTheRoom(state);

    // Ten seconds of ticks with nobody home.
    for (let i = 0; i < 10; i++) {
      engine.updateTurnForPresence(state);
      engine.handleTurnTimeout(state);
    }

    // The turn is still there to come back to.
    expect(state.turn).not.toBeNull();
    expect(state.phase).toBe(GamePhase.Playing);
  });

  it("leaves a turn already paused for an action alone", () => {
    const { engine, state, players } = started(3);
    state.turn!.expiresAt = null;
    state.turn!.pausedTimeLeft = 12_000;
    state.turn!.pendingAction = {
      type: "birthday",
      sourcePlayerId: players[0]!.id,
      targetPlayerIds: [players[1]!.id],
      amount: 2,
      respondedPlayerIds: [],
    };

    emptyTheRoom(state);
    engine.updateTurnForPresence(state);
    expect(state.turn!.pausedTimeLeft).toBe(12_000);

    // ...and resuming doesn't start a clock the action is holding.
    state.players[0]!.connected = true;
    engine.updateTurnForPresence(state);
    expect(state.turn!.expiresAt).toBeNull();
    expect(state.turn!.pausedTimeLeft).toBe(12_000);
  });
});

describe("resuming when someone comes back", () => {
  it("gives back the time that was left, not a stale deadline", () => {
    const { engine, state } = started(3);
    state.turn!.expiresAt = Date.now() + 20_000;

    emptyTheRoom(state);
    engine.updateTurnForPresence(state);

    state.players[0]!.connected = true;
    expect(engine.updateTurnForPresence(state)).toBe(true);

    const remaining = state.turn!.expiresAt! - Date.now();
    expect(remaining).toBeGreaterThan(18_000);
    expect(remaining).toBeLessThanOrEqual(20_000);
    expect(state.turn!.pausedTimeLeft).toBeNull();
  });

  it("recovers a game whose turn expired while everyone was away", () => {
    const { engine, state } = started(3);
    emptyTheRoom(state);

    // The state the old build got stuck in: a timer that ran out with nobody
    // there handed the turn round an empty table until none was left.
    state.turn!.expiresAt = Date.now() - 1;
    engine.handleTurnTimeout(state);
    state.turn = null;

    state.players[0]!.connected = true;
    expect(engine.updateTurnForPresence(state)).toBe(true);

    expect(state.turn).not.toBeNull();
    expect(state.phase).toBe(GamePhase.Playing);
    const owner = state.players.find((p) => p.id === state.turn!.playerId)!;
    expect(owner.connected).toBe(true);
  });

  it("recovers a rematch dealt into an empty room", () => {
    const { engine, state, players } = started(3);
    state.phase = GamePhase.Finished;
    state.winner = players[0]!.id;
    emptyTheRoom(state);

    engine.rematchGame(state);
    expect(state.turn).toBeNull(); // nobody was there to deal to

    state.players[1]!.connected = true;
    expect(engine.updateTurnForPresence(state)).toBe(true);

    expect(state.turn).not.toBeNull();
    expect(state.turn!.playerId).toBe(players[1]!.id);
    expect(players[1]!.hand.length).toBeGreaterThan(0);
  });

  it("does nothing to a game that is ticking along normally", () => {
    const { engine, state } = started(3);
    const expiresAt = state.turn!.expiresAt;
    const playerId = state.turn!.playerId;

    expect(engine.updateTurnForPresence(state)).toBe(false);
    expect(state.turn!.expiresAt).toBe(expiresAt);
    expect(state.turn!.playerId).toBe(playerId);
  });

  it("stays out of the way when the game is over", () => {
    const { engine, state, players } = started(3);
    state.phase = GamePhase.Finished;
    state.winner = players[0]!.id;
    state.turn = null;

    expect(engine.updateTurnForPresence(state)).toBe(false);
    expect(state.turn).toBeNull();
  });

  it("leaves an untimed game alone", () => {
    const { engine, state } = started(3, 0);
    expect(state.turn!.expiresAt).toBeNull();

    emptyTheRoom(state);
    expect(engine.updateTurnForPresence(state)).toBe(false);
    expect(state.turn!.pausedTimeLeft).toBeNull();

    state.players[0]!.connected = true;
    engine.updateTurnForPresence(state);
    expect(state.turn!.expiresAt).toBeNull();
  });
});
