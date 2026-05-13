import type { ServerWebSocket } from "bun";
import {
  type ClientMessage,
  type ServerMessage,
  GamePhase,
  toClientState,
} from "../models/types.ts";
import { RoomManager } from "../rooms/room-manager.ts";
import { BotPlayer } from "../engine/bot.ts";
import { getRandomBotName } from "../utils/bot-names.ts";
import { devTools } from "../dev-tools.ts";
import { track } from "../analytics.ts";

function gameSettingsData(game: import("../models/types.ts").GameState) {
  const bots = game.players.filter((p) => p.isBot).length;
  return {
    players: game.players.length,
    bots,
    humans: game.players.length - bots,
    max_hand_size: game.settings.maxHandSize,
    turn_timer: game.settings.turnTimer,
    allow_duplicate_sets: game.settings.allowDuplicateSets,
    wildcard_flip_counts_as_move: game.settings.wildcardFlipCountsAsMove,
    bot_speed: game.settings.botSpeed,
  };
}

interface WSData {
  playerId: string | null;
  roomCode: string | null;
}

type GameWebSocket = ServerWebSocket<WSData>;

const playerSockets = new Map<string, GameWebSocket>();

// Pending auto-end timers per room (cancelled if a human reconnects)
const autoEndTimers = new Map<string, Timer>();

export function createWebSocketHandlers(roomManager: RoomManager) {
  function send(ws: GameWebSocket, message: ServerMessage): void {
    ws.send(JSON.stringify(message));
  }

  function broadcastToRoom(
    roomCode: string,
    message: ServerMessage,
    excludePlayerId?: string,
  ): void {
    const game = roomManager.getRoom(roomCode);
    if (!game) return;
    for (const player of game.players) {
      if (player.id === excludePlayerId) continue;
      const sock = playerSockets.get(player.id);
      if (sock) {
        sock.send(JSON.stringify(message));
      }
    }
  }

  function sendStateToAll(roomCode: string): void {
    const game = roomManager.getRoom(roomCode);
    if (!game) return;
    for (const player of game.players) {
      const sock = playerSockets.get(player.id);
      if (sock) {
        send(sock, {
          type: "GAME_STATE_UPDATE",
          payload: { state: toClientState(game, player.id) },
        });
      }
    }
  }

  roomManager.setOnStateChange((roomCode) => {
    sendStateToAll(roomCode);
    checkBotTurn(roomCode);
  });

  roomManager.setOnRoomCleaned((_roomCode, playerIds) => {
    for (const id of playerIds) {
      playerSockets.delete(id);
    }
  });

  function handleMessage(ws: GameWebSocket, raw: string): void {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw) as ClientMessage;
    } catch {
      send(ws, {
        type: "ERROR",
        payload: { message: "Invalid message format" },
      });
      return;
    }

    try {
      switch (msg.type) {
        case "JOIN_ROOM":
          handleJoinRoom(ws, msg.payload.roomCode, msg.payload.playerName);
          break;

        case "START_GAME":
          handleStartGame(ws);
          break;

        case "PLAY_CARD_TO_BANK":
          handlePlayCardToBank(ws, msg.payload.cardId);
          break;

        case "PLAY_CARD_TO_PROPERTY":
          handlePlayCardToProperty(
            ws,
            msg.payload.cardId,
            msg.payload.asColor,
            msg.payload.groupWithUnassigned,
            msg.payload.createNewSet,
          );
          break;

        case "PLAY_ACTION_CARD":
          handlePlayActionCard(ws, msg.payload);
          break;

        case "END_TURN":
          handleEndTurn(ws);
          break;

        case "DISCARD_CARDS":
          handleDiscardCards(ws, msg.payload.cardIds);
          break;

        case "PAY_WITH_CARDS":
          handlePayWithCards(ws, msg.payload.cardIds);
          break;

        case "JUST_SAY_NO":
          handleJustSayNo(ws);
          break;

        case "ACCEPT_ACTION":
          handleAcceptAction(ws);
          break;

        case "REARRANGE_PROPERTY":
          handleRearrangeProperty(
            ws,
            msg.payload.cardId,
            msg.payload.toColor,
            msg.payload.createNewSet,
          );
          break;

        case "ASSIGN_RECEIVED_WILDCARD":
          handleAssignReceivedWildcard(
            ws,
            msg.payload.cardId,
            msg.payload.color,
          );
          break;

        case "UPDATE_SETTINGS":
          handleUpdateSettings(ws, msg.payload.settings);
          break;

        case "REMATCH":
          handleRematch(ws);
          break;

        case "RETURN_TO_LOBBY":
          handleReturnToLobby(ws);
          break;

        case "ADD_BOT":
          handleAddBot(ws);
          break;

        case "REMOVE_PLAYER":
          handleRemovePlayer(ws, msg.payload.playerIdToRemove);
          break;

        case "RESIGN":
          handleResign(ws);
          break;

        case "UPDATE_PLAYER_NAME":
          handleUpdatePlayerName(ws, msg.payload.playerName);
          break;

        case "DEV_INJECT_CARD":
          handleDevInjectCard(
            ws,
            msg.payload.cardType,
            msg.payload.targetPlayerId ?? "",
            msg.payload.colors,
          );
          break;

        case "DEV_GIVE_COMPLETE_SET":
          handleDevGiveCompleteSet(
            ws,
            msg.payload.color,
            msg.payload.targetPlayerId ?? "",
          );
          break;

        case "DEV_SET_MONEY":
          handleDevSetMoney(
            ws,
            msg.payload.amount,
            msg.payload.targetPlayerId ?? "",
          );
          break;

        default:
          send(ws, {
            type: "ERROR",
            payload: { message: "Unknown message type" },
          });
      }
    } catch (err: any) {
      send(ws, {
        type: "ERROR",
        payload: { message: err.message ?? "Unknown error" },
      });
    }
  }

  function handleJoinRoom(
    ws: GameWebSocket,
    roomCode: string,
    playerName: string,
  ): void {
    const { game, player } = roomManager.joinRoom(roomCode, playerName);

    ws.data.playerId = player.id;
    ws.data.roomCode = roomCode;
    playerSockets.set(player.id, ws);

    // Cancel any pending auto-end timer (human reconnected)
    const pendingEnd = autoEndTimers.get(roomCode);
    if (pendingEnd) {
      clearTimeout(pendingEnd);
      autoEndTimers.delete(roomCode);
    }

    send(ws, {
      type: "ROOM_JOINED",
      payload: {
        playerId: player.id,
        roomCode,
        state: toClientState(game, player.id),
      },
    });

    broadcastToRoom(
      roomCode,
      {
        type: "PLAYER_JOINED",
        payload: { playerName: player.name, playerId: player.id },
      },
      player.id,
    );

    sendStateToAll(roomCode);
  }

  function handleUpdatePlayerName(
    ws: GameWebSocket,
    playerName: string,
  ): void {
    const { roomCode, playerId } = ws.data;
    if (!roomCode || !playerId) throw new Error("Not in a room");

    const trimmed = playerName.trim().slice(0, 20);
    if (!trimmed) throw new Error("Name cannot be empty");

    const game = roomManager.getRoom(roomCode);
    if (!game) throw new Error("Room not found");
    if (game.phase !== GamePhase.Waiting)
      throw new Error("Cannot change name during a game");

    const player = game.players.find((p) => p.id === playerId);
    if (!player) throw new Error("Player not found");

    player.name = trimmed;
    sendStateToAll(roomCode);
  }

  function handleStartGame(ws: GameWebSocket): void {
    const { roomCode } = ws.data;
    if (!roomCode) throw new Error("Not in a room");

    roomManager.startGame(roomCode);
    broadcastToRoom(roomCode, { type: "GAME_STARTED" });
    sendStateToAll(roomCode);

    const game = roomManager.getRoom(roomCode)!;
    track("game_started", gameSettingsData(game));
    const currentPlayer = game.players[game.currentPlayerIndex]!;
    broadcastToRoom(roomCode, {
      type: "TURN_STARTED",
      payload: { playerId: currentPlayer.id },
    });

    checkBotTurn(roomCode);
  }

  function handlePlayCardToBank(ws: GameWebSocket, cardId: string): void {
    const { roomCode, playerId } = ws.data;
    if (!roomCode || !playerId) throw new Error("Not in a room");

    const game = roomManager.getRoom(roomCode)!;
    const turnPlayerBefore = game.turn?.playerId;
    roomManager.getEngine().playCardToBank(game, playerId, cardId);
    sendStateToAll(roomCode);
    checkTurnChanged(roomCode, turnPlayerBefore);
    checkBotTurn(roomCode);
  }

  function handlePlayCardToProperty(
    ws: GameWebSocket,
    cardId: string,
    asColor: any,
    groupWithUnassigned?: boolean,
    createNewSet?: boolean,
  ): void {
    const { roomCode, playerId } = ws.data;
    if (!roomCode || !playerId) throw new Error("Not in a room");

    const game = roomManager.getRoom(roomCode)!;
    const turnPlayerBefore = game.turn?.playerId;
    roomManager
      .getEngine()
      .playCardToProperty(
        game,
        playerId,
        cardId,
        asColor,
        groupWithUnassigned,
        createNewSet,
      );
    sendStateToAll(roomCode);
    checkGameEnd(roomCode);
    checkTurnChanged(roomCode, turnPlayerBefore);
    checkBotTurn(roomCode);
  }

  function handlePlayActionCard(ws: GameWebSocket, payload: any): void {
    const { roomCode, playerId } = ws.data;
    if (!roomCode || !playerId) throw new Error("Not in a room");

    const game = roomManager.getRoom(roomCode)!;
    const turnPlayerBefore = game.turn?.playerId;
    roomManager.getEngine().playActionCard(game, playerId, payload);
    sendStateToAll(roomCode);

    if (game.turn?.pendingAction) {
      broadcastToRoom(roomCode, {
        type: "ACTION_REQUIRED",
        payload: { action: game.turn.pendingAction },
      });
    }

    checkGameEnd(roomCode);
    checkTurnChanged(roomCode, turnPlayerBefore);
    checkBotTurn(roomCode);
  }

  function handleEndTurn(ws: GameWebSocket): void {
    const { roomCode, playerId } = ws.data;
    if (!roomCode || !playerId) throw new Error("Not in a room");

    const game = roomManager.getRoom(roomCode)!;
    const turnPlayerBefore = game.turn?.playerId;
    roomManager.getEngine().endTurn(game, playerId);
    sendStateToAll(roomCode);
    checkTurnChanged(roomCode, turnPlayerBefore);
    checkBotTurn(roomCode);
  }

  function handleDiscardCards(ws: GameWebSocket, cardIds: string[]): void {
    const { roomCode, playerId } = ws.data;
    if (!roomCode || !playerId) throw new Error("Not in a room");

    const game = roomManager.getRoom(roomCode)!;
    roomManager.getEngine().discardCards(game, playerId, cardIds);
    sendStateToAll(roomCode);
  }

  function handlePayWithCards(ws: GameWebSocket, cardIds: string[]): void {
    const { roomCode, playerId } = ws.data;
    if (!roomCode || !playerId) throw new Error("Not in a room");

    const game = roomManager.getRoom(roomCode)!;
    const turnPlayerBefore = game.turn?.playerId;
    roomManager.getEngine().respondPayWithCards(game, playerId, cardIds);
    sendStateToAll(roomCode);
    checkGameEnd(roomCode);
    checkTurnChanged(roomCode, turnPlayerBefore);
    checkBotTurn(roomCode);
  }

  function handleJustSayNo(ws: GameWebSocket): void {
    const { roomCode, playerId } = ws.data;
    if (!roomCode || !playerId) throw new Error("Not in a room");

    const game = roomManager.getRoom(roomCode)!;
    roomManager.getEngine().respondJustSayNo(game, playerId);
    sendStateToAll(roomCode);
    checkBotTurn(roomCode);
  }

  function handleAcceptAction(ws: GameWebSocket): void {
    const { roomCode, playerId } = ws.data;
    if (!roomCode || !playerId) throw new Error("Not in a room");

    const game = roomManager.getRoom(roomCode)!;
    const turnPlayerBefore = game.turn?.playerId;
    roomManager.getEngine().respondAcceptAction(game, playerId);
    sendStateToAll(roomCode);
    checkGameEnd(roomCode);
    checkTurnChanged(roomCode, turnPlayerBefore);
    checkBotTurn(roomCode);
  }

  function handleRearrangeProperty(
    ws: GameWebSocket,
    cardId: string,
    toColor: any,
    createNewSet?: boolean,
  ): void {
    const { roomCode, playerId } = ws.data;
    if (!roomCode || !playerId) throw new Error("Not in a room");

    const game = roomManager.getRoom(roomCode)!;
    roomManager
      .getEngine()
      .rearrangeProperty(game, playerId, cardId, toColor, createNewSet);
    sendStateToAll(roomCode);
    checkGameEnd(roomCode);
    checkBotTurn(roomCode);
  }

  function handleAssignReceivedWildcard(
    ws: GameWebSocket,
    cardId: string,
    color: any,
  ): void {
    const { roomCode, playerId } = ws.data;
    if (!roomCode || !playerId) throw new Error("Not in a room");

    const game = roomManager.getRoom(roomCode)!;
    roomManager
      .getEngine()
      .assignReceivedWildcard(game, playerId, cardId, color);
    sendStateToAll(roomCode);
    checkBotTurn(roomCode);
  }

  const botPlayer = new BotPlayer(roomManager.getEngine());

  const botTurnLocks = new Map<string, boolean>();

  function handleAddBot(ws: GameWebSocket): void {
    const { roomCode } = ws.data;
    if (!roomCode) throw new Error("Not in a room");

    const game = roomManager.getRoom(roomCode);
    if (!game) throw new Error("Room not found");
    if (game.phase !== GamePhase.Waiting)
      throw new Error("Cannot add bot after game started");

    const usedNames = game.players.map((p) => p.name);
    const botName = getRandomBotName(usedNames);
    const bot = roomManager.getEngine().addPlayer(game, botName);
    bot.isBot = true;

    broadcastToRoom(roomCode, {
      type: "PLAYER_JOINED",
      payload: { playerName: bot.name, playerId: bot.id },
    });
    sendStateToAll(roomCode);
  }

  function handleRemovePlayer(
    ws: GameWebSocket,
    playerIdToRemove: string,
  ): void {
    const { roomCode, playerId } = ws.data;
    if (!roomCode || !playerId) throw new Error("Not in a room");

    const game = roomManager.getRoom(roomCode);
    if (!game) throw new Error("Room not found");
    if (game.phase !== GamePhase.Waiting)
      throw new Error("Cannot remove player after game started");

    // Only host can remove players
    if (game.players[0]?.id !== playerId) {
      throw new Error("Only the host can remove players");
    }

    roomManager.getEngine().removePlayer(game, playerIdToRemove);

    broadcastToRoom(roomCode, {
      type: "PLAYER_LEFT",
      payload: { playerId: playerIdToRemove },
    });
    sendStateToAll(roomCode);
  }

  async function checkBotTurn(roomCode: string): Promise<void> {
    if (botTurnLocks.get(roomCode)) return;
    botTurnLocks.set(roomCode, true);

    try {
      await runBotTurnLoop(roomCode);
    } finally {
      botTurnLocks.delete(roomCode);
    }
  }

  async function runBotTurnLoop(roomCode: string): Promise<void> {
    const MAX_ITERATIONS = 50;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const game = roomManager.getRoom(roomCode);
      if (!game || game.phase !== GamePhase.Playing) return;

      if (
        game.turn?.pendingWildcardAssignments &&
        game.turn.pendingWildcardAssignments.length > 0
      ) {
        const assignment = game.turn.pendingWildcardAssignments[0]!;
        const bot = game.players.find((p) => p.id === assignment.playerId);
        if (bot?.isBot) {
          const botSpeed = game.settings?.botSpeed ?? "normal";
          if (botSpeed !== "instant") {
            const baseDelay = Math.max(
              600,
              1800 -
                (game.players.filter((p) => p.connected).length - 2) * 300,
            );
            let delay = baseDelay + Math.random() * 600;
            if (botSpeed === "slow") delay *= 2;
            if (botSpeed === "fast") delay *= 0.5;
            await new Promise((resolve) => setTimeout(resolve, delay));
          }

          if (game.phase !== GamePhase.Playing) return;

          const color = assignment.availableColors[0];
          if (color) {
            try {
              roomManager
                .getEngine()
                .assignReceivedWildcard(game, bot.id, assignment.cardId, color);
              sendStateToAll(roomCode);
              checkGameEnd(roomCode);
            } catch (e) {
              console.error(`[Bot] wildcard assignment failed for ${bot.name}:`, e);
            }
          }
          continue;
        }
        return;
      }

      if (game.turn?.pendingAction) {
        const action = game.turn.pendingAction;
        const playerCount = game.players.filter((p) => p.connected).length;

        let botsToRespond = action.targetPlayerIds
          .filter((pid) => !action.respondedPlayerIds.includes(pid))
          .map((pid) => game.players.find((pl) => pl.id === pid))
          .filter((p) => p?.isBot);

        if (action.justSayNoChain && botsToRespond.length === 0) {
          const chainTargetId = action.justSayNoChain.targetPlayerId;

          const sourcePlayer = game.players.find(
            (p) => p.id === action.sourcePlayerId,
          );
          if (sourcePlayer?.isBot && sourcePlayer.id !== chainTargetId) {
            botsToRespond = [sourcePlayer];
          }

          if (botsToRespond.length === 0) {
            const initiatorId = action.justSayNoChain.initiatorTargetId;
            const botTarget = game.players.find(
              (p) => p.id === initiatorId && p.isBot && p.id !== chainTargetId,
            );
            if (botTarget) {
              botsToRespond = [botTarget];
            }
          }
        }

        if (botsToRespond.length === 0) return;

        for (const bot of botsToRespond) {
          if (!bot) continue;
          if (game.phase !== GamePhase.Playing) return;

          const botSpeed = game.settings?.botSpeed ?? "normal";
          if (botSpeed !== "instant") {
            const baseDelay = Math.max(600, 1800 - (playerCount - 2) * 300);
            let delay = baseDelay + Math.random() * 600;
            if (botSpeed === "slow") delay *= 2;
            if (botSpeed === "fast") delay *= 0.5;
            await new Promise((resolve) => setTimeout(resolve, delay));
          }

          if (game.phase !== GamePhase.Playing) return;

          try {
            botPlayer.respondToAction(game, bot.id);
          } catch (e) {
            console.error(`[Bot] respondToAction failed for ${bot.name}:`, e);
            try {
              roomManager.getEngine().respondAcceptAction(game, bot.id);
            } catch {}
          }
          sendStateToAll(roomCode);
          checkGameEnd(roomCode);
        }

        continue;
      }

      const currentPlayer = game.players[game.currentPlayerIndex];
      if (!currentPlayer?.isBot) return;

      const botSpeed = game.settings?.botSpeed ?? "normal";
      if (botSpeed !== "instant") {
        const playerCount = game.players.filter((p) => p.connected).length;
        const baseDelay = Math.max(400, 1000 - (playerCount - 2) * 150);
        let initialDelay = baseDelay + Math.random() * 300;
        if (botSpeed === "slow") initialDelay *= 2;
        if (botSpeed === "fast") initialDelay *= 0.5;
        await new Promise((resolve) => setTimeout(resolve, initialDelay));
      }

      if (game.phase !== GamePhase.Playing) return;

      try {
        await botPlayer.playTurnAsync(game, currentPlayer.id, () => {
          sendStateToAll(roomCode);
          checkGameEnd(roomCode);
        });
      } catch (e) {
        console.error(`[Bot] playTurnAsync failed for ${currentPlayer.name}:`, e);
        try {
          roomManager.getEngine().endTurn(game, currentPlayer.id);
        } catch {}
      }

      sendStateToAll(roomCode);
      checkGameEnd(roomCode);
    }
  }

  function checkTurnChanged(
    roomCode: string,
    previousTurnPlayerId?: string,
  ): void {
    const game = roomManager.getRoom(roomCode);
    if (!game || !game.turn) return;
    if (game.turn.playerId !== previousTurnPlayerId) {
      broadcastToRoom(roomCode, {
        type: "TURN_STARTED",
        payload: { playerId: game.turn.playerId },
      });
    }
  }

  function handleUpdateSettings(
    ws: GameWebSocket,
    settings: Partial<any>,
  ): void {
    const { roomCode } = ws.data;
    if (!roomCode) throw new Error("Not in a room");

    const game = roomManager.getRoom(roomCode);
    if (!game) throw new Error("Room not found");
    if (game.phase !== GamePhase.Waiting)
      throw new Error("Cannot change settings after game started");

    game.settings = { ...game.settings, ...settings };
    sendStateToAll(roomCode);
  }

  function handleRematch(ws: GameWebSocket): void {
    const { roomCode } = ws.data;
    if (!roomCode) throw new Error("Not in a room");

    const game = roomManager.getRoom(roomCode);
    if (!game) throw new Error("Room not found");

    roomManager.getEngine().rematchGame(game);
    track("rematch", gameSettingsData(game));

    broadcastToRoom(roomCode, { type: "GAME_STARTED" });
    sendStateToAll(roomCode);

    const currentPlayer = game.players[game.currentPlayerIndex]!;
    broadcastToRoom(roomCode, {
      type: "TURN_STARTED",
      payload: { playerId: currentPlayer.id },
    });

    checkBotTurn(roomCode);
  }

  function handleReturnToLobby(ws: GameWebSocket): void {
    const { roomCode } = ws.data;
    if (!roomCode) throw new Error("Not in a room");

    const game = roomManager.getRoom(roomCode);
    if (!game) throw new Error("Room not found");

    roomManager.getEngine().returnToLobby(game);
    broadcastToRoom(roomCode, { type: "RETURNED_TO_LOBBY" });
    sendStateToAll(roomCode);
  }

  function handleResign(ws: GameWebSocket): void {
    const { roomCode, playerId } = ws.data;
    if (!roomCode || !playerId) throw new Error("Not in a room");

    const game = roomManager.getRoom(roomCode);
    if (!game) throw new Error("Room not found");

    roomManager.getEngine().resignPlayer(game, playerId);
    sendStateToAll(roomCode);
    checkGameEnd(roomCode, "resign");
    checkBotTurn(roomCode);
  }

  function checkGameEnd(roomCode: string, endedBy: "win" | "resign" = "win"): void {
    const game = roomManager.getRoom(roomCode);
    if (!game) return;
    if (
      game.phase === GamePhase.Finished &&
      game.winner &&
      !game.gameEndedBroadcasted
    ) {
      game.gameEndedBroadcasted = true;
      const winner = game.players.find((p) => p.id === game.winner);
      broadcastToRoom(roomCode, {
        type: "GAME_ENDED",
        payload: {
          winnerId: game.winner,
          winnerName: winner?.name ?? "Unknown",
        },
      });

      const duration = game.startedAt
        ? Math.round((Date.now() - game.startedAt) / 1000)
        : 0;
      track("game_ended", {
        ...gameSettingsData(game),
        duration_seconds: duration,
        ended_by: endedBy,
        winner_was_bot: winner?.isBot ?? false,
      });
    }
  }

  function handleClose(ws: GameWebSocket): void {
    const { playerId, roomCode } = ws.data;
    if (playerId) {
      playerSockets.delete(playerId);
    }
    if (roomCode && playerId) {
      const game = roomManager.getRoom(roomCode);
      if (game) {
        roomManager.getEngine().removePlayer(game, playerId);
        broadcastToRoom(roomCode, {
          type: "PLAYER_LEFT",
          payload: { playerId },
        });
        sendStateToAll(roomCode);

        // End game if only bots remain (with grace period for reconnection)
        if (game.phase === GamePhase.Playing) {
          const connectedHumans = game.players.filter(
            (p) => p.connected && !p.isBot,
          );
          if (connectedHumans.length === 0 && !autoEndTimers.has(roomCode)) {
            const timer = setTimeout(() => {
              autoEndTimers.delete(roomCode);
              const g = roomManager.getRoom(roomCode);
              if (!g || g.phase !== GamePhase.Playing) return;
              const stillNoHumans = g.players.filter(
                (p) => p.connected && !p.isBot,
              );
              if (stillNoHumans.length === 0) {
                g.phase = GamePhase.Finished;
                g.winner = g.players.find((p) => p.connected)?.id ?? null;
                sendStateToAll(roomCode);
                checkGameEnd(roomCode, "resign");
              }
            }, 5000);
            autoEndTimers.set(roomCode, timer);
          }
        }
      }
    }
  }

  // Developer Tools Handlers
  function handleDevInjectCard(
    ws: GameWebSocket,
    cardType: any,
    targetPlayerId: string,
    colors?: any[],
  ): void {
    const { roomCode } = ws.data;
    if (!roomCode) throw new Error("Not in a game");

    const game = roomManager.getRoom(roomCode);
    if (!game) throw new Error("Room not found");

    const card = devTools.createCard(cardType, { colors });
    devTools.injectCard(game, targetPlayerId, card);

    sendStateToAll(roomCode);
    console.log(
      `[DevTools] Injected ${cardType} card for player ${targetPlayerId}`,
    );
  }

  function handleDevGiveCompleteSet(
    ws: GameWebSocket,
    color: any,
    targetPlayerId: string,
  ): void {
    const { roomCode } = ws.data;
    if (!roomCode) throw new Error("Not in a game");

    const game = roomManager.getRoom(roomCode);
    if (!game) throw new Error("Room not found");

    devTools.giveCompleteSet(game, targetPlayerId, color);

    // Check for win after giving a complete set
    const player = game.players.find((p) => p.id === targetPlayerId);
    if (player) {
      roomManager.getEngine().checkWin(game, player);
    }

    sendStateToAll(roomCode);
  }

  function handleDevSetMoney(
    ws: GameWebSocket,
    amount: number,
    targetPlayerId: string,
  ): void {
    const { roomCode } = ws.data;
    if (!roomCode) throw new Error("Not in a game");

    const game = roomManager.getRoom(roomCode);
    if (!game) throw new Error("Room not found");

    devTools.setMoney(game, targetPlayerId, amount);
    sendStateToAll(roomCode);
  }

  return {
    open(ws: GameWebSocket) {
      ws.data.playerId = null;
      ws.data.roomCode = null;
    },
    message(ws: GameWebSocket, message: string | Buffer) {
      const raw = typeof message === "string" ? message : message.toString();
      handleMessage(ws, raw);
    },
    close(ws: GameWebSocket) {
      handleClose(ws);
    },
  };
}
