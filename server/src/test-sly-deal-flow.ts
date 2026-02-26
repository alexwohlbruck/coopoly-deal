import { GameEngine } from "./engine/game-engine.ts";
import { RoomManager } from "./rooms/room-manager.ts";
import { CardType, PropertyColor } from "./models/types.ts";

function testSlyDealFlow() {
  console.log("\n=== Testing Sly Deal Flow ===\n");
  
  const roomManager = new RoomManager();
  const engine = roomManager.getEngine();
  const game = roomManager.createRoom();
  
  // Add Alice (human) and Bot
  const alice = engine.addPlayer(game, "Alice");
  const bot = engine.addPlayer(game, "Bot");
  bot.isBot = true;
  
  console.log(`Alice ID: ${alice.id}`);
  console.log(`Bot ID: ${bot.id}`);
  
  // Start the game
  engine.startGame(game);
  console.log("\n✓ Game started");
  
  // Give Bot an Orange property
  const botOrange = {
    id: "bot-orange-1",
    type: CardType.Property,
    value: 2,
    colors: [PropertyColor.Orange],
  };
  bot.properties.push({
    color: PropertyColor.Orange,
    cards: [botOrange],
    house: false,
    hotel: false,
  });
  console.log(`✓ Bot has an Orange property`);
  
  // Give Alice a Sly Deal card
  const slyDeal = {
    id: "alice-slydeal",
    type: CardType.SlyDeal,
    value: 3,
  };
  alice.hand.push(slyDeal);
  console.log(`✓ Alice has a Sly Deal card`);
  
  // Make sure it's Alice's turn
  if (game.turn?.playerId !== alice.id) {
    engine.endTurn(game, game.turn!.playerId);
  }
  
  console.log(`\n--- Alice plays Sly Deal to steal Bot's Orange property ---`);
  
  // Alice plays Sly Deal
  engine.playActionCard(game, alice.id, {
    action: "slyDeal",
    cardId: slyDeal.id,
    targetPlayerId: bot.id,
    targetCardId: botOrange.id,
  });
  
  const action = game.turn?.pendingAction;
  if (!action) {
    console.error("❌ ERROR: No pending action created!");
    return;
  }
  
  console.log(`\n✓ Pending action created:`);
  console.log(`  Type: ${action.type}`);
  console.log(`  Source Player: ${action.sourcePlayerId} (should be Alice: ${alice.id})`);
  console.log(`  Target Players: ${action.targetPlayerIds.join(", ")} (should be Bot: ${bot.id})`);
  console.log(`  Responded Players: ${action.respondedPlayerIds.join(", ")}`);
  
  // Verify the correct players
  if (action.sourcePlayerId !== alice.id) {
    console.error(`❌ ERROR: Source player should be Alice (${alice.id}), but is ${action.sourcePlayerId}`);
    return;
  } else {
    console.log(`✓ Source player is Alice`);
  }
  
  if (!action.targetPlayerIds.includes(bot.id)) {
    console.error(`❌ ERROR: Bot (${bot.id}) should be in targetPlayerIds`);
    return;
  } else {
    console.log(`✓ Target player is Bot`);
  }
  
  if (action.targetPlayerIds.includes(alice.id)) {
    console.error(`❌ ERROR: Alice (${alice.id}) should NOT be in targetPlayerIds`);
    return;
  } else {
    console.log(`✓ Alice is NOT in targetPlayerIds`);
  }
  
  console.log(`\n--- ActionPrompt Logic Test ---`);
  console.log(`Alice should NOT see prompt (isSource=true)`);
  console.log(`Bot should see prompt (isTarget=true, isSource=false)`);
  
  console.log(`\n✅ Sly Deal server-side logic is correct!`);
  console.log(`If UI shows prompt to Alice, the issue is in ActionPrompt.tsx client logic`);
}

testSlyDealFlow();
