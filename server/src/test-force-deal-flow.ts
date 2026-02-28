// @ts-nocheck

import { GameEngine } from "./engine/game-engine.ts";
import { RoomManager } from "./rooms/room-manager.ts";
import { CardType, PropertyColor } from "./models/types.ts";

function testForceDealFlow() {
  console.log("\n=== Testing Force Deal Flow ===\n");
  
  const roomManager = new RoomManager();
  const engine = roomManager.getEngine();
  const game = roomManager.createRoom();
  
  // Add two human players
  const player1 = engine.addPlayer(game, "Alice");
  const player2 = engine.addPlayer(game, "Bob");
  
  console.log(`Player 1 (Alice) ID: ${player1.id}`);
  console.log(`Player 2 (Bob) ID: ${player2.id}`);
  
  // Start the game
  engine.startGame(game);
  console.log("\n✓ Game started");
  
  // Give Alice an Orange property
  const aliceOrange = {
    id: "alice-orange-1",
    type: CardType.Property,
    value: 2,
    colors: [PropertyColor.Orange],
  };
  player1.properties.push({
    color: PropertyColor.Orange,
    cards: [aliceOrange],
    house: false,
    hotel: false,
  });
  console.log(`✓ Alice has an Orange property (value: $2M)`);
  
  // Give Bob a Green property (higher value)
  const bobGreen = {
    id: "bob-green-1",
    type: CardType.Property,
    value: 4,
    colors: [PropertyColor.Green],
  };
  player2.properties.push({
    color: PropertyColor.Green,
    cards: [bobGreen],
    house: false,
    hotel: false,
  });
  console.log(`✓ Bob has a Green property (value: $4M)`);
  
  // Give Alice a Force Deal card
  const forceDeal = {
    id: "force-deal-test",
    type: CardType.ForceDeal,
    value: 3,
  };
  player1.hand.push(forceDeal);
  console.log(`✓ Alice has a Force Deal card`);
  
  // Make sure it's Alice's turn
  if (game.turn?.playerId !== player1.id) {
    engine.endTurn(game, game.turn!.playerId);
  }
  
  console.log(`\n--- Alice plays Force Deal to swap her Orange for Bob's Green ---`);
  
  // Alice plays Force Deal
  engine.playActionCard(game, player1.id, {
    action: "forceDeal",
    cardId: forceDeal.id,
    myCardId: aliceOrange.id,
    targetPlayerId: player2.id,
    targetCardId: bobGreen.id,
  });
  
  const pendingAction = game.turn?.pendingAction;
  if (!pendingAction) {
    console.error("❌ ERROR: No pending action created!");
    return;
  }
  
  console.log(`\n✓ Pending action created:`);
  console.log(`  Type: ${pendingAction.type}`);
  console.log(`  Source Player: ${pendingAction.sourcePlayerId} (Alice)`);
  console.log(`  Target Players: ${pendingAction.targetPlayerIds.join(", ")} (should be Bob)`);
  console.log(`  Selected Cards: sourceCardId=${pendingAction.selectedCards?.sourceCardId}, targetCardId=${pendingAction.selectedCards?.targetCardId}`);
  
  // Verify the correct player is targeted
  if (pendingAction.sourcePlayerId !== player1.id) {
    console.error(`❌ ERROR: Source player should be Alice (${player1.id}), but is ${pendingAction.sourcePlayerId}`);
  } else {
    console.log(`✓ Source player is correct (Alice)`);
  }
  
  if (!pendingAction.targetPlayerIds.includes(player2.id)) {
    console.error(`❌ ERROR: Bob (${player2.id}) should be in targetPlayerIds`);
  } else {
    console.log(`✓ Target player is correct (Bob)`);
  }
  
  if (pendingAction.targetPlayerIds.includes(player1.id)) {
    console.error(`❌ ERROR: Alice (${player1.id}) should NOT be in targetPlayerIds`);
  } else {
    console.log(`✓ Alice is NOT in targetPlayerIds (correct)`);
  }
  
  // Bob accepts the swap
  console.log(`\n--- Bob accepts the Force Deal ---`);
  engine.respondAcceptAction(game, player2.id);
  
  // Check if properties were swapped
  const aliceHasGreen = player1.properties.some(s => s.color === PropertyColor.Green && s.cards.some(c => c.id === bobGreen.id));
  const bobHasOrange = player2.properties.some(s => s.color === PropertyColor.Orange && s.cards.some(c => c.id === aliceOrange.id));
  const aliceHasOrange = player1.properties.some(s => s.color === PropertyColor.Orange && s.cards.some(c => c.id === aliceOrange.id));
  const bobHasGreen = player2.properties.some(s => s.color === PropertyColor.Green && s.cards.some(c => c.id === bobGreen.id));
  
  console.log(`\n✓ After resolution:`);
  console.log(`  Alice has Green property: ${aliceHasGreen} (should be TRUE)`);
  console.log(`  Bob has Orange property: ${bobHasOrange} (should be TRUE)`);
  console.log(`  Alice has Orange property: ${aliceHasOrange} (should be FALSE)`);
  console.log(`  Bob has Green property: ${bobHasGreen} (should be FALSE)`);
  console.log(`  Pending action cleared: ${!game.turn?.pendingAction} (should be TRUE)`);
  
  if (aliceHasGreen && bobHasOrange && !aliceHasOrange && !bobHasGreen && !game.turn?.pendingAction) {
    console.log(`\n✅ Force Deal flow works correctly!`);
  } else {
    console.log(`\n❌ Force Deal flow has issues!`);
  }
}

testForceDealFlow();
