// @ts-nocheck

import { GameEngine } from "./engine/game-engine.ts";
import { RoomManager } from "./rooms/room-manager.ts";
import { CardType, PropertyColor } from "./models/types.ts";
import { BotPlayer } from "./engine/bot.ts";

async function testRealJSNScenario() {
  console.log("\n=== Testing REAL Just Say No Scenario (Human vs Bot) ===\n");
  
  const roomManager = new RoomManager();
  const engine = roomManager.getEngine();
  const botPlayer = new BotPlayer(engine);
  const game = roomManager.createRoom();
  
  // Alice (human) and Bot
  const alice = engine.addPlayer(game, "Alice");
  const bot = engine.addPlayer(game, "CPU Bot");
  bot.isBot = true;
  
  engine.startGame(game);
  console.log(`✓ Game started: Alice (${alice.id}) vs Bot (${bot.id})`);
  
  // Give Bot a complete Brown set
  bot.properties.push({
    color: PropertyColor.Brown,
    cards: [
      { id: "bot-brown-1", type: CardType.Property, value: 1, colors: [PropertyColor.Brown] },
      { id: "bot-brown-2", type: CardType.Property, value: 1, colors: [PropertyColor.Brown] },
    ],
    house: false,
    hotel: false,
  });
  console.log(`✓ Bot has complete Brown set`);
  
  // Give Alice a Deal Breaker
  alice.hand.push({ id: "alice-db", type: CardType.DealBreaker, value: 5 });
  
  // Give Bot a Just Say No  
  bot.hand.push({ id: "bot-jsn", type: CardType.JustSayNo, value: 4 });
  console.log(`✓ Bot has Just Say No in hand`);
  
  if (game.turn?.playerId !== alice.id) {
    engine.endTurn(game, game.turn!.playerId);
  }
  
  console.log(`\n--- Step 1: Alice plays Deal Breaker ---`);
  engine.playActionCard(game, alice.id, {
    action: "dealBreaker",
    cardId: "alice-db",
    targetPlayerId: bot.id,
    targetSetColor: PropertyColor.Brown,
  });
  
  console.log(`✓ Pending action created:`);
  console.log(`  Target: ${game.turn?.pendingAction?.targetPlayerIds[0]} (Bot)`);
  console.log(`  JSN chain: ${game.turn?.pendingAction?.justSayNoChain ? 'exists' : 'none'}`);
  
  console.log(`\n--- Step 2: Bot auto-responds with Just Say No ---`);
  
  // Simulate what the websocket handler does
  botPlayer.respondToAction(game, bot.id);
  
  const action = game.turn?.pendingAction;
  if (!action) {
    console.error(`❌ ERROR: Pending action cleared!`);
    return;
  }
  
  console.log(`✓ Bot responded:`);
  console.log(`  JSN chain depth: ${action.justSayNoChain?.depth}`);
  console.log(`  JSN chain target: ${action.justSayNoChain?.targetPlayerId}`);
  console.log(`  Bot hand size: ${bot.hand.length} (JSN should be gone)`);
  
  // Now Alice should see a prompt to respond to the JSN
  console.log(`\n--- Step 3: Alice ACCEPTS the Just Say No (doesn't counter) ---`);
  
  engine.respondAcceptAction(game, alice.id);
  
  // Check final state
  const botHasBrown = bot.properties.some(s => 
    s.color === PropertyColor.Brown && s.cards.length === 2
  );
  const aliceHasBrown = alice.properties.some(s => 
    s.color === PropertyColor.Brown
  );
  const pendingCleared = !game.turn?.pendingAction;
  
  console.log(`\n✓ Final state:`);
  console.log(`  Bot still has Brown set: ${botHasBrown} (should be TRUE)`);
  console.log(`  Alice has Brown set: ${aliceHasBrown} (should be FALSE)`);
  console.log(`  Pending action cleared: ${pendingCleared} (should be TRUE)`);
  console.log(`  Turn phase: ${game.turn?.phase}`);
  
  if (botHasBrown && !aliceHasBrown && pendingCleared) {
    console.log(`\n✅ SUCCESS! Just Say No flow works - bot defended their set`);
    return true;
  } else {
    console.log(`\n❌ FAILED! Just Say No flow is broken`);
    return false;
  }
}

testRealJSNScenario().then(success => {
  process.exit(success ? 0 : 1);
});
