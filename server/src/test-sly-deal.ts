// @ts-nocheck

import { GameEngine } from "./engine/game-engine.ts";
import { RoomManager } from "./rooms/room-manager.ts";
import { CardType, PropertyColor } from "./models/types.ts";

function testSlyDeal() {
  console.log("\n=== Testing Sly Deal Flow ===\n");
  
  const roomManager = new RoomManager();
  const engine = roomManager.getEngine();
  const game = roomManager.createRoom();
  
  // Add two players
  const player1 = engine.addPlayer(game, "Player 1");
  const player2 = engine.addPlayer(game, "Player 2");
  
  console.log(`Player 1 ID: ${player1.id}`);
  console.log(`Player 2 ID: ${player2.id}`);
  
  // Start the game
  engine.startGame(game);
  console.log("\n✓ Game started");
  
  // Give Player 2 a property card
  const propertyCard = {
    id: "prop-test-1",
    type: CardType.Property,
    value: 2,
    colors: [PropertyColor.Orange],
  };
  player2.properties.push({
    color: PropertyColor.Orange,
    cards: [propertyCard],
    house: false,
    hotel: false,
  });
  console.log(`✓ Player 2 has an Orange property`);
  
  // Give Player 1 a Sly Deal card
  const slyDealCard = {
    id: "sly-deal-test",
    type: CardType.SlyDeal,
    value: 3,
  };
  player1.hand.push(slyDealCard);
  console.log(`✓ Player 1 has a Sly Deal card`);
  
  // Make sure it's Player 1's turn
  if (game.turn?.playerId !== player1.id) {
    engine.endTurn(game, game.turn!.playerId);
  }
  
  console.log(`\n--- Player 1 plays Sly Deal targeting Player 2's Orange property ---`);
  
  // Player 1 plays Sly Deal
  engine.playActionCard(game, player1.id, {
    action: "slyDeal",
    cardId: slyDealCard.id,
    targetPlayerId: player2.id,
    targetCardId: propertyCard.id,
  });
  
  const pendingAction = game.turn?.pendingAction;
  if (!pendingAction) {
    console.error("❌ ERROR: No pending action created!");
    return;
  }
  
  console.log(`\n✓ Pending action created:`);
  console.log(`  Type: ${pendingAction.type}`);
  console.log(`  Source Player: ${pendingAction.sourcePlayerId} (Player 1)`);
  console.log(`  Target Players: ${pendingAction.targetPlayerIds.join(", ")} (should be Player 2)`);
  console.log(`  Responded Players: ${pendingAction.respondedPlayerIds.join(", ")}`);
  
  // Verify the correct player is targeted
  if (pendingAction.sourcePlayerId !== player1.id) {
    console.error(`❌ ERROR: Source player should be Player 1 (${player1.id}), but is ${pendingAction.sourcePlayerId}`);
  } else {
    console.log(`✓ Source player is correct (Player 1)`);
  }
  
  if (!pendingAction.targetPlayerIds.includes(player2.id)) {
    console.error(`❌ ERROR: Player 2 (${player2.id}) should be in targetPlayerIds`);
  } else {
    console.log(`✓ Target player is correct (Player 2)`);
  }
  
  if (pendingAction.targetPlayerIds.includes(player1.id)) {
    console.error(`❌ ERROR: Player 1 (${player1.id}) should NOT be in targetPlayerIds`);
  } else {
    console.log(`✓ Player 1 is NOT in targetPlayerIds (correct)`);
  }
  
  console.log(`\n--- Simulating ActionPrompt logic for each player ---`);
  
  // Simulate ActionPrompt logic for Player 1 (source)
  const isSourceForP1 = pendingAction.sourcePlayerId === player1.id;
  const isTargetForP1 = pendingAction.targetPlayerIds.includes(player1.id);
  console.log(`\nPlayer 1 (source):`);
  console.log(`  isSource: ${isSourceForP1}`);
  console.log(`  isTarget: ${isTargetForP1}`);
  console.log(`  Should see prompt: ${!isSourceForP1 && isTargetForP1} (should be FALSE)`);
  
  // Simulate ActionPrompt logic for Player 2 (target)
  const isSourceForP2 = pendingAction.sourcePlayerId === player2.id;
  const isTargetForP2 = pendingAction.targetPlayerIds.includes(player2.id);
  console.log(`\nPlayer 2 (target):`);
  console.log(`  isSource: ${isSourceForP2}`);
  console.log(`  isTarget: ${isTargetForP2}`);
  console.log(`  Should see prompt: ${!isSourceForP2 && isTargetForP2} (should be TRUE)`);
  
  // Player 2 accepts
  console.log(`\n--- Player 2 accepts the Sly Deal ---`);
  engine.respondAcceptAction(game, player2.id);
  
  // Check if property was transferred
  const player1HasOrange = player1.properties.some(s => s.color === PropertyColor.Orange);
  const player2HasOrange = player2.properties.some(s => s.color === PropertyColor.Orange);
  
  console.log(`\n✓ After resolution:`);
  console.log(`  Player 1 has Orange property: ${player1HasOrange} (should be TRUE)`);
  console.log(`  Player 2 has Orange property: ${player2HasOrange} (should be FALSE)`);
  console.log(`  Pending action cleared: ${!game.turn?.pendingAction} (should be TRUE)`);
  
  if (player1HasOrange && !player2HasOrange && !game.turn?.pendingAction) {
    console.log(`\n✅ Sly Deal flow works correctly!`);
  } else {
    console.log(`\n❌ Sly Deal flow has issues!`);
  }
}

testSlyDeal();
