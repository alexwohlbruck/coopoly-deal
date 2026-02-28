// @ts-nocheck

import { GameEngine } from "./engine/game-engine.ts";
import { RoomManager } from "./rooms/room-manager.ts";
import { CardType, PropertyColor } from "./models/types.ts";

console.log("\n=== Testing JSN Counter-Counter Flow ===\n");

const roomManager = new RoomManager();
const engine = roomManager.getEngine();
const game = roomManager.createRoom();

// Add players
const alice = engine.addPlayer(game, "Alice");
const bob = engine.addPlayer(game, "Bot Bob");
bob.isBot = true;

console.log(`Alice ID: ${alice.id}`);
console.log(`Bot Bob ID: ${bob.id}`);

// Start the game
engine.startGame(game);
console.log("\n✓ Game started");

// Discard extra cards so players don't exceed hand limit
while (alice.hand.length > 5) alice.hand.pop();
while (bob.hand.length > 3) bob.hand.pop();

// Give Bob an Orange complete set
const orangeProps = [
  { id: "bob-orange-1", type: CardType.Property, value: 2, colors: [PropertyColor.Orange] },
  { id: "bob-orange-2", type: CardType.Property, value: 2, colors: [PropertyColor.Orange] },
  { id: "bob-orange-3", type: CardType.Property, value: 2, colors: [PropertyColor.Orange] },
];
bob.properties.push({
  color: PropertyColor.Orange,
  cards: orangeProps,
  house: false,
  hotel: false,
});
console.log(`✓ Bot Bob has an Orange complete set`);

// Give Alice a Just Say No
const aliceJSN = { id: "alice-jsn", type: CardType.JustSayNo, value: 4 };
alice.hand.push(aliceJSN);

// Give Bob a Deal Breaker and 2 Just Say No cards
const bobDB = { id: "bob-db", type: CardType.DealBreaker, value: 5 };
const bobJSN1 = { id: "bob-jsn-1", type: CardType.JustSayNo, value: 4 };
const bobJSN2 = { id: "bob-jsn-2", type: CardType.JustSayNo, value: 4 };
bob.hand.push(bobDB, bobJSN1, bobJSN2);
console.log(`✓ Alice has 1 JSN, Bot Bob has Deal Breaker + 2 JSN`);

// Give Alice an Light Blue complete set (so Bob wants to steal it)
alice.properties.push({
  color: PropertyColor.LightBlue,
  cards: [
    { id: "alice-lb-1", type: CardType.Property, value: 1, colors: [PropertyColor.LightBlue] },
    { id: "alice-lb-2", type: CardType.Property, value: 1, colors: [PropertyColor.LightBlue] },
    { id: "alice-lb-3", type: CardType.Property, value: 1, colors: [PropertyColor.LightBlue] },
  ],
  house: false,
  hotel: false,
});
console.log(`✓ Alice has a complete Light Blue set (for Bob to steal)\n`);

console.log("=== Flow Test ===");
console.log("1. Bob plays Deal Breaker targeting Alice's Light Blue set");
console.log("2. Alice plays Just Say No to defend");
console.log("3. Bob plays Just Say No to counter (regain Deal Breaker effect)");
console.log("4. Verify Bob can counter and action resolves correctly\n");

// Make sure it's Bob's turn
if (game.turn?.playerId !== bob.id) {
  engine.endTurn(game, game.turn!.playerId);
}

console.log("--- Bob plays Deal Breaker ---");
engine.playActionCard(game, bob.id, {
  action: "dealBreaker",
  cardId: bobDB.id,
  targetPlayerId: alice.id,
  targetSetColor: PropertyColor.LightBlue,
});

let action = game.turn?.pendingAction;
if (!action) {
  console.error("❌ ERROR: No pending action created!");
  process.exit(1);
}

console.log(`✓ Pending action: ${action.type}`);
console.log(`  Source: Bob (${bob.id})`);
console.log(`  Target: Alice (${alice.id})`);
console.log(`  JSN Chain: ${action.justSayNoChain ? "Yes" : "No"}`);

// Alice plays Just Say No
console.log("\n--- Alice plays Just Say No ---");
engine.respondJustSayNo(game, alice.id);

action = game.turn?.pendingAction;
if (!action) {
  console.error("❌ ERROR: Pending action was cleared!");
  process.exit(1);
}

console.log(`✓ JSN Chain started`);
console.log(`  Chain target: ${action.justSayNoChain?.targetPlayerId} (should be Alice)`);
console.log(`  Bob's hand: ${bob.hand.length} cards (should have 2 JSN left)`);

// Bob should counter with Just Say No
console.log("\n--- Bot Bob counters with Just Say No ---");

// Check if bot has JSN in hand
const botHasJSN = bob.hand.some(c => c.type === CardType.JustSayNo);
if (!botHasJSN) {
  console.error("❌ ERROR: Bot doesn't have JSN in hand!");
  process.exit(1);
}
console.log(`✓ Bot has ${bob.hand.filter(c => c.type === CardType.JustSayNo).length} JSN cards`);

// Simulate bot's decision to counter
try {
  engine.respondJustSayNo(game, bob.id);
  console.log(`✓ Bot played Just Say No to counter`);
} catch (err: any) {
  console.error(`❌ ERROR: Bot couldn't play JSN: ${err.message}`);
  process.exit(1);
}

action = game.turn?.pendingAction;
if (!action) {
  console.error("❌ ERROR: Pending action was cleared!");
  process.exit(1);
}

console.log(`✓ JSN Chain continues`);
console.log(`  Chain target: ${action.justSayNoChain?.targetPlayerId} (should be Bob now)`);
console.log(`  Alice should now respond (accept or counter)`);

// Alice accepts (has no more JSN)
console.log("\n--- Alice accepts (no more JSN) ---");
try {
  engine.respondAcceptAction(game, alice.id);
  console.log(`✓ Alice accepted`);
} catch (err: any) {
  console.error(`❌ ERROR: Alice couldn't accept: ${err.message}`);
  process.exit(1);
}

// Check if action resolved correctly
action = game.turn?.pendingAction;
if (action) {
  console.error("❌ ERROR: Pending action still exists!");
  process.exit(1);
}

console.log(`✓ Action resolved`);

// Check if Bob got the Light Blue set
const bobLB = bob.properties.find(s => s.color === PropertyColor.LightBlue);
const aliceLB = alice.properties.find(s => s.color === PropertyColor.LightBlue);

if (!bobLB) {
  console.error("❌ ERROR: Bob didn't get the Light Blue set!");
  process.exit(1);
}

if (aliceLB) {
  console.error("❌ ERROR: Alice still has the Light Blue set!");
  process.exit(1);
}

console.log(`\n✅ JSN COUNTER-COUNTER TEST PASSED!`);
console.log(`Bob successfully countered Alice's JSN and stole the Light Blue set.`);
