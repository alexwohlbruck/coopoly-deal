import { describe, it, expect } from "bun:test";
import { GameEngine } from "./game-engine.ts";
import {
  CardType,
  GamePhase,
  PropertyColor,
  TurnPhase,
  type Card,
  type GameState,
} from "../models/types.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startGame(count: number) {
  const engine = new GameEngine();
  const state = engine.createGame("000000");
  const players = Array.from({ length: count }, (_, i) =>
    engine.addPlayer(state, `P${i + 1}`),
  );
  engine.startGame(state);
  return { engine, state, players };
}

/** Everything a player is holding, wherever it is. */
function heldCardIds(state: GameState): string[] {
  return state.players.flatMap((p) => [
    ...p.hand.map((c) => c.id),
    ...p.bank.map((c) => c.id),
    ...p.properties.flatMap((s) => s.cards.map((c) => c.id)),
  ]);
}

function money(id: string, value = 2): Card {
  return { id, type: CardType.Money, value };
}

// ---------------------------------------------------------------------------

describe("dropping out mid-game", () => {
  it("takes the player out of the game entirely", () => {
    const { engine, state, players } = startGame(3);
    engine.removePlayer(state, players[1]!.id);

    expect(state.players).toHaveLength(2);
    expect(state.players.map((p) => p.name)).toEqual(["P1", "P3"]);
    expect(state.phase).toBe(GamePhase.Playing);
  });

  it("returns their cards to the discard pile", () => {
    const { engine, state, players } = startGame(3);
    const leaver = players[1]!;
    leaver.bank.push(money("bank_1"));
    const propertyCard: Card = {
      id: "prop_1",
      type: CardType.Property,
      value: 3,
      colors: [PropertyColor.Red],
    };
    leaver.properties.push({
      color: PropertyColor.Red,
      cards: [propertyCard],
      house: null,
      hotel: null,
    });
    const expected = [
      ...leaver.hand.map((c) => c.id),
      "bank_1",
      "prop_1",
    ].sort();

    const discardBefore = state.discardPile.length;
    engine.removePlayer(state, leaver.id);

    const added = state.discardPile
      .slice(discardBefore)
      .map((c) => c.id)
      .sort();
    expect(added).toEqual(expected);
    // Nothing of theirs is still sitting on the table.
    expect(heldCardIds(state)).not.toContain("bank_1");
    expect(heldCardIds(state)).not.toContain("prop_1");
  });

  it("ends the game when fewer than two players are left", () => {
    const { engine, state, players } = startGame(2);
    engine.removePlayer(state, players[0]!.id);

    expect(state.phase).toBe(GamePhase.Finished);
    expect(state.winner).toBe(players[1]!.id);
    expect(state.players).toHaveLength(1);
  });

  it("does not rewrite the standings of a game that already ended", () => {
    const { engine, state, players } = startGame(3);
    state.phase = GamePhase.Finished;
    state.winner = players[0]!.id;

    engine.removePlayer(state, players[2]!.id);

    expect(state.players).toHaveLength(3);
  });

  it("is a no-op for a player who is not in the game", () => {
    const { engine, state } = startGame(3);
    engine.removePlayer(state, "nobody");
    expect(state.players).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Turn order is the easy thing to get wrong: removing from an array shifts
// every index after it.
// ---------------------------------------------------------------------------

describe("turn order after a drop", () => {
  it("hands the turn on when the player on turn leaves", () => {
    const { engine, state, players } = startGame(3);
    expect(state.turn!.playerId).toBe(players[0]!.id);

    engine.removePlayer(state, players[0]!.id);

    expect(state.turn!.playerId).toBe(players[1]!.id);
    expect(state.players[state.currentPlayerIndex]!.id).toBe(players[1]!.id);
  });

  it("wraps to the first player when the last player on turn leaves", () => {
    const { engine, state, players } = startGame(3);
    state.currentPlayerIndex = 2;
    engine.removePlayer(state, players[2]!.id);

    expect(state.currentPlayerIndex).toBe(0);
    expect(state.turn!.playerId).toBe(players[0]!.id);
  });

  it("keeps the turn with its owner when someone before them leaves", () => {
    const { engine, state, players } = startGame(3);
    state.currentPlayerIndex = 2;
    state.turn!.playerId = players[2]!.id;

    engine.removePlayer(state, players[0]!.id);

    expect(state.turn!.playerId).toBe(players[2]!.id);
    expect(state.players[state.currentPlayerIndex]!.id).toBe(players[2]!.id);
  });

  it("keeps the turn with its owner when someone after them leaves", () => {
    const { engine, state, players } = startGame(3);
    expect(state.turn!.playerId).toBe(players[0]!.id);

    engine.removePlayer(state, players[2]!.id);

    expect(state.turn!.playerId).toBe(players[0]!.id);
    expect(state.players[state.currentPlayerIndex]!.id).toBe(players[0]!.id);
  });

  it("does not spin forever when nobody left is connected", () => {
    const { engine, state, players } = startGame(3);
    for (const p of state.players) p.connected = false;

    // Removing the player on turn means looking for the next one to play, and
    // there isn't one. This used to recurse until the stack gave out.
    expect(() => engine.removePlayer(state, players[0]!.id)).not.toThrow();
    expect(state.players).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Actions in flight
// ---------------------------------------------------------------------------

describe("actions in flight when someone drops", () => {
  it("stops waiting on a target who left", () => {
    const { engine, state, players } = startGame(3);
    state.turn!.phase = TurnPhase.ActionPending;
    state.turn!.pendingAction = {
      type: "debtCollector",
      sourcePlayerId: players[0]!.id,
      targetPlayerIds: [players[1]!.id, players[2]!.id],
      amount: 5,
      respondedPlayerIds: [players[2]!.id],
    };

    engine.removePlayer(state, players[1]!.id);

    // The last outstanding response was theirs, so the action resolves rather
    // than leaving the table stuck on a player who will never answer.
    expect(state.turn!.pendingAction).toBeNull();
    expect(state.turn!.phase as TurnPhase).toBe(TurnPhase.Play);
  });

  it("keeps waiting on the targets who are still there", () => {
    const { engine, state, players } = startGame(4);
    state.turn!.phase = TurnPhase.ActionPending;
    state.turn!.pendingAction = {
      type: "birthday",
      sourcePlayerId: players[0]!.id,
      targetPlayerIds: [players[1]!.id, players[2]!.id, players[3]!.id],
      amount: 2,
      respondedPlayerIds: [],
    };

    engine.removePlayer(state, players[1]!.id);

    expect(state.turn!.pendingAction).not.toBeNull();
    expect(state.turn!.pendingAction!.targetPlayerIds).toEqual([
      players[2]!.id,
      players[3]!.id,
    ]);
  });

  it("drops a wildcard assignment owed to a player who left", () => {
    const { engine, state, players } = startGame(3);
    state.turn!.pendingWildcardAssignments = [
      {
        playerId: players[1]!.id,
        cardId: "wild_1",
        availableColors: [PropertyColor.Red],
      },
      {
        playerId: players[2]!.id,
        cardId: "wild_2",
        availableColors: [PropertyColor.Green],
      },
    ];

    engine.removePlayer(state, players[1]!.id);

    expect(
      state.turn!.pendingWildcardAssignments!.map((a) => a.playerId),
    ).toEqual([players[2]!.id]);
  });
});
