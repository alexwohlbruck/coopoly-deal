// @ts-nocheck

import { GameEngine } from "./engine/game-engine.ts";
import {
  CardType,
  PropertyColor,
  type GameState,
  type Card,
} from "./models/types.ts";
import { createDeck } from "./engine/deck.ts";

function createTestCard(
  type: CardType,
  value: number,
  colors?: PropertyColor[],
): Card {
  return {
    id: `test-${Math.random().toString(36).substr(2, 9)}`,
    type,
    value,
    name:
      type === CardType.Property
        ? `Test ${colors?.[0]} Property`
        : `Test ${type}`,
    colors,
  };
}

function testForceDeal2Player() {
  console.log("\n=== Testing Force Deal (2 Players) ===");

  const engine = new GameEngine();
  const state: GameState = {
    id: "test-game",
    players: [
      {
        id: "p1",
        name: "Alice",
        hand: [],
        bank: [],
        properties: [],
        connected: true,
      },
      {
        id: "p2",
        name: "Bob",
        hand: [],
        bank: [],
        properties: [],
        connected: true,
      },
    ],
    deck: createDeck(),
    discardPile: [],
    currentPlayerIndex: 0,
    phase: "waiting" as any,
    turn: null,
    winner: null,
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    settings: {
      maxHandSize: 7,
      turnTimer: 30,
      allowDuplicateSets: false,
      wildcardFlipCountsAsMove: false,
      useSocialistTheme: false,
      botSpeed: "normal",
    },
  };

  // Start the game
  engine.startGame(state);

  // Give Alice a property directly (simpler than playing through the engine)
  const aliceRedCard = createTestCard(CardType.Property, 3, [
    PropertyColor.Red,
  ]);
  state.players[0].properties.push({
    color: PropertyColor.Red,
    cards: [aliceRedCard],
    house: null,
    hotel: null,
  });

  // Give Bob some properties
  const bobGreenCard = createTestCard(CardType.Property, 4, [
    PropertyColor.Green,
  ]);
  state.players[1].properties.push({
    color: PropertyColor.Green,
    cards: [bobGreenCard],
    house: null,
    hotel: null,
  });

  // Give Alice a Force Deal card
  const forceDealCard = createTestCard(CardType.ForceDeal, 3);
  state.players[0].hand.push(forceDealCard);

  console.log("\nInitial state:");
  console.log(
    `Alice has: ${state.players[0].properties.map((s) => `${s.color} (${s.cards.length})`).join(", ")}`,
  );
  console.log(
    `Bob has: ${state.players[1].properties.map((s) => `${s.color} (${s.cards.length})`).join(", ")}`,
  );

  // Alice plays Force Deal
  try {
    engine.playActionCard(state, "p1", {
      action: "forceDeal",
      cardId: forceDealCard.id,
      myCardId: aliceRedCard.id,
      targetPlayerId: "p2",
      targetCardId: bobGreenCard.id,
    });

    console.log("\n✅ Force Deal played successfully");
    console.log("Pending action created:", state.turn?.pendingAction?.type);

    // Bob accepts the swap
    engine.respondAcceptAction(state, "p2");

    console.log("\n✅ Bob accepted the swap");
    console.log("\nFinal state:");
    console.log(
      `Alice has: ${state.players[0].properties.map((s) => `${s.color} (${s.cards.length})`).join(", ")}`,
    );
    console.log(
      `Bob has: ${state.players[1].properties.map((s) => `${s.color} (${s.cards.length})`).join(", ")}`,
    );

    // Verify the swap
    const aliceHasGreen = state.players[0].properties.some(
      (s) => s.color === PropertyColor.Green,
    );
    const bobHasRed = state.players[1].properties.some(
      (s) => s.color === PropertyColor.Red,
    );

    if (aliceHasGreen && bobHasRed) {
      console.log("\n✅ Force Deal test PASSED - Cards were swapped correctly");
      return true;
    } else {
      console.log("\n❌ Force Deal test FAILED - Cards were not swapped");
      return false;
    }
  } catch (error: any) {
    console.log("\n❌ Force Deal test FAILED:", error.message);
    return false;
  }
}

function testForceDeal4Player() {
  console.log("\n=== Testing Force Deal (4 Players) ===");

  const engine = new GameEngine();
  const state: GameState = {
    id: "test-game",
    players: [
      {
        id: "p1",
        name: "Alice",
        hand: [],
        bank: [],
        properties: [],
        connected: true,
      },
      {
        id: "p2",
        name: "Bob",
        hand: [],
        bank: [],
        properties: [],
        connected: true,
      },
      {
        id: "p3",
        name: "Charlie",
        hand: [],
        bank: [],
        properties: [],
        connected: true,
      },
      {
        id: "p4",
        name: "Diana",
        hand: [],
        bank: [],
        properties: [],
        connected: true,
      },
    ],
    deck: createDeck(),
    discardPile: [],
    currentPlayerIndex: 0,
    phase: "waiting" as any,
    turn: null,
    winner: null,
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    settings: {
      maxHandSize: 7,
      turnTimer: 30,
      allowDuplicateSets: false,
      wildcardFlipCountsAsMove: false,
      useSocialistTheme: false,
      botSpeed: "normal",
    },
  };

  // Start the game
  engine.startGame(state);

  // Give players properties
  const aliceYellowCard = createTestCard(CardType.Property, 3, [
    PropertyColor.Yellow,
  ]);
  state.players[0].properties.push({
    color: PropertyColor.Yellow,
    cards: [aliceYellowCard],
    house: null,
    hotel: null,
  });

  const charlieOrangeCard = createTestCard(CardType.Property, 2, [
    PropertyColor.Orange,
  ]);
  state.players[2].properties.push({
    color: PropertyColor.Orange,
    cards: [charlieOrangeCard],
    house: null,
    hotel: null,
  });

  // Give Alice a Force Deal card
  const forceDealCard = createTestCard(CardType.ForceDeal, 3);
  state.players[0].hand.push(forceDealCard);

  console.log("\nInitial state:");
  console.log(
    `Alice has: ${state.players[0].properties.map((s) => `${s.color} (${s.cards.length})`).join(", ")}`,
  );
  console.log(
    `Charlie has: ${state.players[2].properties.map((s) => `${s.color} (${s.cards.length})`).join(", ")}`,
  );

  // Alice plays Force Deal targeting Charlie
  try {
    engine.playActionCard(state, "p1", {
      action: "forceDeal",
      cardId: forceDealCard.id,
      myCardId: aliceYellowCard.id,
      targetPlayerId: "p3",
      targetCardId: charlieOrangeCard.id,
    });

    console.log("\n✅ Force Deal played successfully");

    // Charlie accepts
    engine.respondAcceptAction(state, "p3");

    console.log("\n✅ Charlie accepted the swap");
    console.log("\nFinal state:");
    console.log(
      `Alice has: ${state.players[0].properties.map((s) => `${s.color} (${s.cards.length})`).join(", ")}`,
    );
    console.log(
      `Charlie has: ${state.players[2].properties.map((s) => `${s.color} (${s.cards.length})`).join(", ")}`,
    );

    // Verify the swap
    const aliceHasOrange = state.players[0].properties.some(
      (s) => s.color === PropertyColor.Orange,
    );
    const charlieHasYellow = state.players[2].properties.some(
      (s) => s.color === PropertyColor.Yellow,
    );

    if (aliceHasOrange && charlieHasYellow) {
      console.log("\n✅ 4-Player Force Deal test PASSED");
      return true;
    } else {
      console.log("\n❌ 4-Player Force Deal test FAILED");
      return false;
    }
  } catch (error: any) {
    console.log("\n❌ 4-Player Force Deal test FAILED:", error.message);
    return false;
  }
}

function testForceDealWithJustSayNo() {
  console.log("\n=== Testing Force Deal with Just Say No ===");

  const engine = new GameEngine();
  const state: GameState = {
    id: "test-game",
    players: [
      {
        id: "p1",
        name: "Alice",
        hand: [],
        bank: [],
        properties: [],
        connected: true,
      },
      {
        id: "p2",
        name: "Bob",
        hand: [],
        bank: [],
        properties: [],
        connected: true,
      },
    ],
    deck: createDeck(),
    discardPile: [],
    currentPlayerIndex: 0,
    phase: "waiting" as any,
    turn: null,
    winner: null,
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    settings: {
      maxHandSize: 7,
      turnTimer: 30,
      allowDuplicateSets: false,
      wildcardFlipCountsAsMove: false,
      useSocialistTheme: false,
      botSpeed: "normal",
    },
  };

  engine.startGame(state);

  // Setup properties
  const aliceCard = createTestCard(CardType.Property, 2, [PropertyColor.Pink]);
  state.players[0].properties.push({
    color: PropertyColor.Pink,
    cards: [aliceCard],
    house: null,
    hotel: null,
  });

  const bobCard = createTestCard(CardType.Property, 3, [PropertyColor.Red]);
  state.players[1].properties.push({
    color: PropertyColor.Red,
    cards: [bobCard],
    house: null,
    hotel: null,
  });

  // Give cards
  const forceDealCard = createTestCard(CardType.ForceDeal, 3);
  const justSayNoCard = createTestCard(CardType.JustSayNo, 4);
  state.players[0].hand.push(forceDealCard);
  state.players[1].hand.push(justSayNoCard);

  console.log("\nAlice plays Force Deal, Bob has Just Say No");

  try {
    engine.playActionCard(state, "p1", {
      action: "forceDeal",
      cardId: forceDealCard.id,
      myCardId: aliceCard.id,
      targetPlayerId: "p2",
      targetCardId: bobCard.id,
    });

    console.log("✅ Force Deal played");

    // Bob says no
    engine.respondJustSayNo(state, "p2");

    console.log("✅ Bob played Just Say No");
    console.log("\nFinal state:");
    console.log(
      `Alice still has: ${state.players[0].properties.map((s) => `${s.color}`).join(", ")}`,
    );
    console.log(
      `Bob still has: ${state.players[1].properties.map((s) => `${s.color}`).join(", ")}`,
    );

    // Verify no swap occurred
    const aliceStillHasPink = state.players[0].properties.some(
      (s) => s.color === PropertyColor.Pink,
    );
    const bobStillHasRed = state.players[1].properties.some(
      (s) => s.color === PropertyColor.Red,
    );

    if (aliceStillHasPink && bobStillHasRed) {
      console.log("\n✅ Just Say No test PASSED - Swap was blocked");
      return true;
    } else {
      console.log("\n❌ Just Say No test FAILED - Cards were swapped anyway");
      return false;
    }
  } catch (error: any) {
    console.log("\n❌ Just Say No test FAILED:", error.message);
    return false;
  }
}

// Run all tests
console.log("=".repeat(60));
console.log("FORCE DEAL TEST SUITE");
console.log("=".repeat(60));

const test1 = testForceDeal2Player();
const test2 = testForceDeal4Player();
const test3 = testForceDealWithJustSayNo();

console.log("\n" + "=".repeat(60));
console.log("TEST RESULTS");
console.log("=".repeat(60));
console.log(`2-Player Force Deal: ${test1 ? "✅ PASS" : "❌ FAIL"}`);
console.log(`4-Player Force Deal: ${test2 ? "✅ PASS" : "❌ FAIL"}`);
console.log(`Force Deal + Just Say No: ${test3 ? "✅ PASS" : "❌ FAIL"}`);
console.log(
  `\nOverall: ${test1 && test2 && test3 ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`,
);
console.log("=".repeat(60));
