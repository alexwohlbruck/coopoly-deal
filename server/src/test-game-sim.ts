#!/usr/bin/env bun
/**
 * Headless game simulator for testing game logic
 * Usage: bun run server/src/test-game-sim.ts
 */

import { GameEngine } from "./engine/game-engine.ts";
import { BotPlayer } from "./engine/bot.ts";
import type { GameState } from "./models/types.ts";
import { GamePhase, TurnPhase } from "./models/types.ts";

const engine = new GameEngine();

function simulateGame(playerCount: number = 2, verbose: boolean = true) {
  const log = verbose ? console.log : () => {};
  
  log("\n=== Starting Headless Game Simulation ===");
  log(`Players: ${playerCount}`);
  
  // Create game
  const state = engine.createGame("TEST");
  
  // Add players
  const players: string[] = [];
  for (let i = 0; i < playerCount; i++) {
    const player = engine.addPlayer(state, `Player ${i + 1}`);
    players.push(player.id);
    log(`Added ${player.name} (${player.id})`);
  }
  
  // Start game
  engine.startGame(state);
  log("\nGame started!");
  log(`Initial deck size: ${state.deck.length}`);
  
  // Create bots for all players
  const bots = new Map<string, BotPlayer>();
  for (const playerId of players) {
    bots.set(playerId, new BotPlayer(engine));
  }
  
  let turnCount = 0;
  const maxTurns = 100; // Safety limit
  
  // Game loop
  while (state.phase === GamePhase.Playing && turnCount < maxTurns) {
    turnCount++;
    
    // Handle pending actions - all bots respond
    if (state.turn?.phase === TurnPhase.ActionPending && state.turn.pendingAction) {
      const action = state.turn.pendingAction;
      log(`\n--- Turn ${turnCount}: Pending Action ---`);
      log(`Action: ${action.type} from ${state.players.find(p => p.id === action.sourcePlayerId)?.name}`);
      log(`Targets: ${action.targetPlayerIds.map(id => state.players.find(p => p.id === id)?.name).join(', ')}`);
      
      // Let all target bots respond
      for (const targetId of action.targetPlayerIds) {
        if (!action.respondedPlayerIds.includes(targetId)) {
          const targetBot = bots.get(targetId);
          if (targetBot) {
            targetBot.respondToAction(state, targetId);
            log(`${state.players.find(p => p.id === targetId)?.name} responded`);
          }
        }
      }
      continue;
    }
    
    // Regular turn
    const currentPlayer = state.players[state.currentPlayerIndex];
    const bot = bots.get(currentPlayer.id)!;
    
    log(`\n--- Turn ${turnCount}: ${currentPlayer.name} ---`);
    log(`Hand: ${currentPlayer.hand.length} cards`);
    log(`Properties: ${currentPlayer.properties.length} sets`);
    log(`Bank: $${currentPlayer.bank.reduce((sum, c) => sum + c.value, 0)}M`);
    
    // Bot plays turn
    const cardsPlayedBefore = state.turn?.cardsPlayed ?? 0;
    bot.playTurn(state, currentPlayer.id);
    const cardsPlayedAfter = state.turn?.cardsPlayed ?? 0;
    log(`Bot played ${cardsPlayedAfter - cardsPlayedBefore} cards`);
    
    // Check for winner
    if (state.winner) {
      const winnerPlayer = state.players.find(p => p.id === state.winner);
      log(`\n🎉 ${winnerPlayer?.name || 'Unknown'} WINS! 🎉`);
      log(`Total turns: ${turnCount}`);
      break;
    }
  }
  
  if (turnCount >= maxTurns) {
    log("\n⚠️ Game reached max turn limit");
  }
  
  // Final stats
  log("\n=== Final Game State ===");
  for (const player of state.players) {
    const completeSets = player.properties.filter(s => s.isComplete).length;
    const totalValue = player.bank.reduce((sum, c) => sum + c.value, 0);
    log(`${player.name}: ${completeSets}/3 complete sets, $${totalValue}M in bank, ${player.hand.length} cards in hand`);
  }
  
  return state;
}

// Test resign functionality
function testResign() {
  console.log("\n=== Testing Resign Functionality ===");
  
  const state = engine.createGame("RESIGN_TEST");
  const p1 = engine.addPlayer(state, "Alice");
  const p2 = engine.addPlayer(state, "Bob");
  
  engine.startGame(state);
  console.log(`Game started with ${state.players.length} players`);
  
  // Player 1 resigns
  console.log(`${p1.name} resigns...`);
  engine.resignPlayer(state, p1.id);
  
  if (state.winner === p2.id) {
    console.log(`✅ Resign test passed: ${p2.name} won`);
  } else {
    const winnerPlayer = state.players.find(p => p.id === state.winner);
    console.log(`❌ Resign test failed: Winner is ${winnerPlayer?.name || state.winner}`);
  }
}

// Test background music (just verify the files exist)
function testMusicFiles() {
  console.log("\n=== Testing Music Files ===");
  const fs = require("fs");
  const path = require("path");
  
  const musicDir = path.join(__dirname, "assets/mp3/soundtracks");
  try {
    const files = fs.readdirSync(musicDir);
    const mp3Files = files.filter((f: string) => f.endsWith(".mp3"));
    console.log(`✅ Found ${mp3Files.length} music files:`);
    mp3Files.forEach((f: string) => console.log(`   - ${f}`));
  } catch (error) {
    console.log(`❌ Could not read music directory: ${error}`);
  }
}

// Run tests
if (import.meta.main) {
  const args = process.argv.slice(2);
  const testType = args[0] || "simulate";
  
  switch (testType) {
    case "simulate":
      const playerCount = parseInt(args[1]) || 2;
      simulateGame(playerCount, true);
      break;
    case "resign":
      testResign();
      break;
    case "music":
      testMusicFiles();
      break;
    case "all":
      testResign();
      testMusicFiles();
      simulateGame(2, true);
      break;
    default:
      console.log("Usage: bun run server/src/test-game-sim.ts [simulate|resign|music|all] [playerCount]");
  }
}

export { simulateGame, testResign, testMusicFiles };
