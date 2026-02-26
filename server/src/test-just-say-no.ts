import { GameEngine } from "./engine/game-engine.ts";
import { RoomManager } from "./rooms/room-manager.ts";
import { CardType, PropertyColor } from "./models/types.ts";

function testJustSayNoFlow() {
  console.log("\n=== Testing Just Say No Flow ===\n");
  
  const roomManager = new RoomManager();
  const engine = roomManager.getEngine();
  const game = roomManager.createRoom();
  
  // Add Alice (human) and Bot 1
  const alice = engine.addPlayer(game, "Alice");
  const bot = engine.addPlayer(game, "Bot 1");
  bot.isBot = true;
  
  console.log(`Alice ID: ${alice.id}`);
  console.log(`Bot 1 ID: ${bot.id}`);
  
  // Start the game
  engine.startGame(game);
  console.log("\n✓ Game started");
  
  // Give Bot a complete set of Brown properties
  const brown1 = { id: "bot-brown-1", type: CardType.Property, value: 1, colors: [PropertyColor.Brown] };
  const brown2 = { id: "bot-brown-2", type: CardType.Property, value: 1, colors: [PropertyColor.Brown] };
  bot.properties.push({
    color: PropertyColor.Brown,
    cards: [brown1, brown2],
    house: false,
    hotel: false,
  });
  console.log(`✓ Bot has a complete Brown set (2/2)`);
  
  // Give Alice a Deal Breaker card
  const dealBreaker = { id: "alice-dealbreaker", type: CardType.DealBreaker, value: 5 };
  alice.hand.push(dealBreaker);
  console.log(`✓ Alice has a Deal Breaker card`);
  
  // Give Bot a Just Say No card
  const justSayNo = { id: "bot-jsn", type: CardType.JustSayNo, value: 4 };
  bot.hand.push(justSayNo);
  console.log(`✓ Bot has a Just Say No card`);
  
  // Make sure it's Alice's turn
  if (game.turn?.playerId !== alice.id) {
    engine.endTurn(game, game.turn!.playerId);
  }
  
  console.log(`\n--- Test 1: Alice plays Deal Breaker against Bot ---`);
  
  // Alice plays Deal Breaker
  engine.playActionCard(game, alice.id, {
    action: "dealBreaker",
    cardId: dealBreaker.id,
    targetPlayerId: bot.id,
    targetSetColor: PropertyColor.Brown,
  });
  
  let action = game.turn?.pendingAction;
  if (!action) {
    console.error("❌ ERROR: No pending action created!");
    return;
  }
  
  console.log(`✓ Pending action created:`);
  console.log(`  Type: ${action.type}`);
  console.log(`  Source: ${action.sourcePlayerId} (Alice)`);
  console.log(`  Target: ${action.targetPlayerIds[0]} (Bot)`);
  console.log(`  Has JSN chain: ${!!action.justSayNoChain}`);
  
  console.log(`\n--- Test 2: Bot responds with Just Say No ---`);
  
  // Bot plays Just Say No
  engine.respondJustSayNo(game, bot.id);
  
  action = game.turn?.pendingAction;
  if (!action) {
    console.error("❌ ERROR: Pending action was cleared too early!");
    return;
  }
  
  console.log(`✓ Bot played Just Say No:`);
  console.log(`  JSN chain depth: ${action.justSayNoChain?.depth}`);
  console.log(`  JSN chain target: ${action.justSayNoChain?.targetPlayerId} (should be Bot)`);
  console.log(`  Bot hand size: ${bot.hand.length} (should be 0, JSN was discarded)`);
  console.log(`  Discard pile has JSN: ${game.discardPile.some(c => c.id === justSayNo.id)}`);
  
  // Verify Bot no longer has JSN in hand
  if (bot.hand.some(c => c.id === justSayNo.id)) {
    console.error("❌ ERROR: Bot still has Just Say No in hand!");
  } else {
    console.log(`✓ Just Say No was removed from Bot's hand`);
  }
  
  // Verify JSN is in discard pile
  if (!game.discardPile.some(c => c.id === justSayNo.id)) {
    console.error("❌ ERROR: Just Say No not in discard pile!");
  } else {
    console.log(`✓ Just Say No is in discard pile`);
  }
  
  console.log(`\n--- Test 3: Alice accepts the Just Say No (action blocked) ---`);
  
  // Alice accepts the Just Say No
  engine.respondAcceptAction(game, alice.id);
  
  // Check that action was resolved and Bot kept their set
  if (game.turn?.pendingAction) {
    console.error("❌ ERROR: Pending action still exists after acceptance!");
  } else {
    console.log(`✓ Pending action was cleared`);
  }
  
  const botStillHasBrown = bot.properties.some(s => 
    s.color === PropertyColor.Brown && 
    s.cards.some(c => c.id === brown1.id || c.id === brown2.id)
  );
  const aliceHasBrown = alice.properties.some(s => 
    s.color === PropertyColor.Brown
  );
  
  console.log(`  Bot still has Brown set: ${botStillHasBrown} (should be TRUE)`);
  console.log(`  Alice has Brown set: ${aliceHasBrown} (should be FALSE)`);
  
  if (botStillHasBrown && !aliceHasBrown) {
    console.log(`\n✅ Just Say No flow works correctly! Bot defended their set.`);
  } else {
    console.log(`\n❌ Just Say No flow has issues!`);
  }
  
  // Test 4: Counter-Just Say No
  console.log(`\n\n=== Test 4: Counter Just Say No Chain ===\n`);
  
  // Reset the game state for another test
  const game2 = roomManager.createRoom();
  const alice2 = engine.addPlayer(game2, "Alice");
  const bot2 = engine.addPlayer(game2, "Bot 2");
  bot2.isBot = true;
  engine.startGame(game2);
  
  // Give bot a property
  const prop = { id: "prop1", type: CardType.Property, value: 2, colors: [PropertyColor.Orange] };
  bot2.properties.push({ color: PropertyColor.Orange, cards: [prop], house: false, hotel: false });
  
  // Give Alice Sly Deal and JSN
  const slyDeal = { id: "slydeal", type: CardType.SlyDeal, value: 3 };
  const aliceJSN = { id: "alice-jsn", type: CardType.JustSayNo, value: 4 };
  alice2.hand.push(slyDeal, aliceJSN);
  
  // Give Bot JSN
  const botJSN = { id: "bot-jsn2", type: CardType.JustSayNo, value: 4 };
  bot2.hand.push(botJSN);
  
  if (game2.turn?.playerId !== alice2.id) {
    engine.endTurn(game2, game2.turn!.playerId);
  }
  
  console.log(`✓ Setup: Alice plays Sly Deal, Bot says no, Alice counters`);
  
  // Alice plays Sly Deal
  engine.playActionCard(game2, alice2.id, {
    action: "slyDeal",
    cardId: slyDeal.id,
    targetPlayerId: bot2.id,
    targetCardId: prop.id,
  });
  
  // Bot says no (depth 1)
  engine.respondJustSayNo(game2, bot2.id);
  console.log(`  Bot said no (depth: ${game2.turn?.pendingAction?.justSayNoChain?.depth})`);
  
  // Alice counters with JSN (depth 2)
  engine.respondJustSayNo(game2, alice2.id);
  console.log(`  Alice countered (depth: ${game2.turn?.pendingAction?.justSayNoChain?.depth})`);
  
  // Bot accepts the counter
  engine.respondAcceptAction(game2, bot2.id);
  
  // Alice should now have the property (even depth, action proceeds)
  const aliceHasProp = alice2.properties.some(s => s.cards.some(c => c.id === prop.id));
  const botHasProp = bot2.properties.some(s => s.cards.some(c => c.id === prop.id));
  
  console.log(`  Alice has property: ${aliceHasProp} (should be TRUE)`);
  console.log(`  Bot has property: ${botHasProp} (should be FALSE)`);
  console.log(`  Pending action cleared: ${!game2.turn?.pendingAction}`);
  
  if (aliceHasProp && !botHasProp && !game2.turn?.pendingAction) {
    console.log(`\n✅ Counter Just Say No works correctly!`);
  } else {
    console.log(`\n❌ Counter Just Say No has issues!`);
  }
}

testJustSayNoFlow();
