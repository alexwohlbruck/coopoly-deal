// @ts-nocheck

/**
 * Tests for multi-color wildcard placement logic
 *
 * Game Rules:
 * - Multi-color wildcards (10-color wildcards) should NOT auto-assign to any color
 * - They should be placed in an "Unassigned" stack until a colored property is added
 * - Only multi-color wildcards can be placed in the Unassigned stack
 * - Dual-color wildcards (2-color) should auto-assign to one of their two colors
 */

import { GameEngine } from "./game-engine";
import { CardType, PropertyColor } from "../models/types";
import type { GameState, Card } from "../models/types";

function createTestCard(
  type: CardType,
  colors?: PropertyColor[],
  value: number = 0,
): Card {
  return {
    id: `test-${Math.random()}`,
    type,
    colors,
    value,
  };
}

function createTestGame(): { engine: GameEngine; state: GameState } {
  const engine = new GameEngine();
  const state = engine.createGame("test-game");

  // Override settings
  state.settings = {
    maxHandSize: 7,
    wildcardFlipCountsAsMove: false,
    turnTimer: 30,
    allowDuplicateSets: false,
    useSocialistTheme: false,
    botSpeed: "normal",
  };

  // Add two players
  engine.addPlayer(state, "Player 1");
  engine.addPlayer(state, "Player 2");

  // Start the game
  engine.startGame(state);

  return { engine, state };
}

function runTest(name: string, testFn: () => void) {
  try {
    testFn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(error);
    throw error;
  }
}

// Test 1: Multi-color wildcard should go to Unassigned when played from hand
runTest("Multi-color wildcard played from hand goes to Unassigned", () => {
  const { engine, state } = createTestGame();
  const player = state.players[0];

  // Create a multi-color wildcard (10 colors)
  const wildcard = createTestCard(
    CardType.PropertyWildcard,
    [
      PropertyColor.Brown,
      PropertyColor.LightBlue,
      PropertyColor.Pink,
      PropertyColor.Orange,
      PropertyColor.Red,
      PropertyColor.Yellow,
      PropertyColor.Green,
      PropertyColor.DarkBlue,
      PropertyColor.Railroad,
      PropertyColor.Utility,
    ],
    0,
  );

  player.hand.push(wildcard);

  // Play the wildcard with null color (unassigned)
  engine.playCardToProperty(state, player.id, wildcard.id, null);

  // Check that it's in an Unassigned set
  const unassignedSet = player.properties.find(
    (s) => s.color === PropertyColor.Unassigned,
  );
  if (!unassignedSet) {
    throw new Error("Unassigned set not created");
  }
  if (unassignedSet.cards.length !== 1) {
    throw new Error("Wildcard not in Unassigned set");
  }
  if (unassignedSet.cards[0].id !== wildcard.id) {
    throw new Error("Wrong card in Unassigned set");
  }
});

// Test 2: Multi-color wildcard received as payment should go to Unassigned
runTest("Multi-color wildcard received as payment goes to Unassigned", () => {
  const { engine, state } = createTestGame();
  const currentPlayer = state.players[state.currentPlayerIndex];
  const otherPlayer =
    state.players[(state.currentPlayerIndex + 1) % state.players.length];

  // Create a multi-color wildcard
  const wildcard = createTestCard(
    CardType.PropertyWildcard,
    [
      PropertyColor.Brown,
      PropertyColor.LightBlue,
      PropertyColor.Pink,
      PropertyColor.Orange,
      PropertyColor.Red,
      PropertyColor.Yellow,
      PropertyColor.Green,
      PropertyColor.DarkBlue,
      PropertyColor.Railroad,
      PropertyColor.Utility,
    ],
    0,
  );

  // Place wildcard in other player's property area (as Unassigned)
  otherPlayer.properties.push({
    color: PropertyColor.Unassigned,
    cards: [wildcard],
    house: null,
    hotel: null,
  });

  // Create a debt collector action for current player
  const debtCard = createTestCard(CardType.DebtCollector, undefined, 3);
  currentPlayer.hand.push(debtCard);

  // Current player plays debt collector against other player
  engine.playActionCard(state, currentPlayer.id, {
    action: "debtCollector",
    cardId: debtCard.id,
    targetPlayerId: otherPlayer.id,
  });

  // Other player responds by paying with the wildcard
  engine.respondPayWithCards(state, otherPlayer.id, [wildcard.id]);

  // Check that current player has wildcard in Unassigned set
  const unassignedSet = currentPlayer.properties.find(
    (s) => s.color === PropertyColor.Unassigned,
  );
  if (!unassignedSet) {
    throw new Error("Current player should have Unassigned set");
  }
  if (!unassignedSet.cards.find((c) => c.id === wildcard.id)) {
    throw new Error("Wildcard not in current player's Unassigned set");
  }
});

// Test 3: Dual-color wildcard should auto-assign to one of its colors
runTest("Dual-color wildcard auto-assigns to available color", () => {
  const { engine, state } = createTestGame();
  const player = state.players[0];

  // Create a dual-color wildcard (Red/Yellow)
  const wildcard = createTestCard(
    CardType.PropertyWildcard,
    [PropertyColor.Red, PropertyColor.Yellow],
    2,
  );

  player.hand.push(wildcard);

  // Play the wildcard as Red
  engine.playCardToProperty(state, player.id, wildcard.id, PropertyColor.Red);

  // Check that it's in a Red set, NOT Unassigned
  const redSet = player.properties.find((s) => s.color === PropertyColor.Red);
  if (!redSet) {
    throw new Error("Red set not created");
  }
  if (!redSet.cards.find((c) => c.id === wildcard.id)) {
    throw new Error("Wildcard not in Red set");
  }

  // Ensure NO Unassigned set was created
  const unassignedSet = player.properties.find(
    (s) => s.color === PropertyColor.Unassigned,
  );
  if (unassignedSet) {
    throw new Error("Unassigned set should not exist for dual-color wildcard");
  }
});

// Test 4: Only multi-color wildcards can be placed in Unassigned
runTest("Dual-color wildcard cannot be placed in Unassigned", () => {
  const { engine, state } = createTestGame();
  const player = state.players[0];

  // Create a dual-color wildcard
  const wildcard = createTestCard(
    CardType.PropertyWildcard,
    [PropertyColor.Red, PropertyColor.Yellow],
    2,
  );

  player.hand.push(wildcard);

  // Try to play with null color (should throw)
  let errorThrown = false;
  try {
    engine.playCardToProperty(state, player.id, wildcard.id, null);
  } catch (error: any) {
    errorThrown = true;
    if (!error.message.includes("multi-color")) {
      throw new Error(`Wrong error message: ${error.message}`);
    }
  }

  if (!errorThrown) {
    throw new Error(
      "Should have thrown error for dual-color wildcard with null color",
    );
  }
});

// Test 5: Regular property card cannot be placed in Unassigned
runTest("Regular property cannot be placed in Unassigned", () => {
  const { engine, state } = createTestGame();
  const player = state.players[0];

  // Create a regular property card
  const property = createTestCard(CardType.Property, [PropertyColor.Red], 2);

  player.hand.push(property);

  // Try to play with null color (should throw)
  let errorThrown = false;
  try {
    engine.playCardToProperty(state, player.id, property.id, null);
  } catch (error: any) {
    errorThrown = true;
    if (!error.message.includes("wildcard")) {
      throw new Error(`Wrong error message: ${error.message}`);
    }
  }

  if (!errorThrown) {
    throw new Error(
      "Should have thrown error for regular property with null color",
    );
  }
});

// Test 6: Multi-color wildcard stolen should go to Unassigned and prompt for color
runTest("Multi-color wildcard stolen goes to Unassigned with prompt", () => {
  const { engine, state } = createTestGame();
  const thief = state.players[0];
  const victim = state.players[1];

  // Create a multi-color wildcard in victim's property area
  const wildcard = createTestCard(
    CardType.PropertyWildcard,
    [
      PropertyColor.Brown,
      PropertyColor.LightBlue,
      PropertyColor.Pink,
      PropertyColor.Orange,
      PropertyColor.Red,
      PropertyColor.Yellow,
      PropertyColor.Green,
      PropertyColor.DarkBlue,
      PropertyColor.Railroad,
      PropertyColor.Utility,
    ],
    0,
  );

  victim.properties.push({
    color: PropertyColor.Red,
    cards: [wildcard],
    house: null,
    hotel: null,
  });

  // Create and play Sly Deal
  const slyDeal = createTestCard(CardType.SlyDeal, undefined, 3);
  thief.hand.push(slyDeal);

  engine.playActionCard(state, thief.id, {
    action: "slyDeal",
    cardId: slyDeal.id,
    targetPlayerId: victim.id,
    targetCardId: wildcard.id,
  });

  // Victim accepts
  engine.respondAcceptAction(state, victim.id);

  // Check that thief has wildcard in Unassigned
  const unassignedSet = thief.properties.find(
    (s) => s.color === PropertyColor.Unassigned,
  );
  if (!unassignedSet) {
    throw new Error("Thief should have Unassigned set");
  }
  if (!unassignedSet.cards.find((c) => c.id === wildcard.id)) {
    throw new Error("Wildcard not in thief's Unassigned set");
  }

  // Check that there's a pending wildcard assignment
  if (!state.turn?.pendingWildcardAssignment) {
    throw new Error("Should have pending wildcard assignment");
  }
  if (state.turn.pendingWildcardAssignment.playerId !== thief.id) {
    throw new Error("Pending assignment should be for thief");
  }
  if (state.turn.pendingWildcardAssignment.cardId !== wildcard.id) {
    throw new Error("Pending assignment should be for stolen wildcard");
  }
});

console.log("\n🎉 All wildcard tests passed!\n");
