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

interface WSData {
  playerId: string | null;
  roomCode: string | null;
}

type GameWebSocket = ServerWebSocket<WSData>;

const playerSockets = new Map<string, GameWebSocket>();

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

        case "ADD_BOT":
          handleAddBot(ws);
          break;

        case "REMOVE_PLAYER":
          handleRemovePlayer(ws, msg.payload.playerIdToRemove);
          break;

        case "RESIGN":
          handleResign(ws);
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

  function handleStartGame(ws: GameWebSocket): void {
    const { roomCode } = ws.data;
    if (!roomCode) throw new Error("Not in a room");

    roomManager.startGame(roomCode);
    broadcastToRoom(roomCode, { type: "GAME_STARTED" });
    sendStateToAll(roomCode);

    const game = roomManager.getRoom(roomCode)!;
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
    const game = roomManager.getRoom(roomCode);
    if (!game || game.phase !== GamePhase.Playing) return;

    if (
      game.turn?.pendingWildcardAssignments &&
      game.turn.pendingWildcardAssignments.length > 0
    ) {
      const assignment = game.turn.pendingWildcardAssignments[0]!;
      const bot = game.players.find((p) => p.id === assignment.playerId);
      if (bot?.isBot) {
        // Delay before assigning
        const botSpeed = game.settings?.botSpeed ?? "normal";
        if (botSpeed !== "instant") {
          const baseDelay = Math.max(
            600,
            1800 - (game.players.filter((p) => p.connected).length - 2) * 300,
          );
          let delay = baseDelay + Math.random() * 600;
          if (botSpeed === "slow") delay *= 2;
          if (botSpeed === "fast") delay *= 0.5;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        if (game.phase !== GamePhase.Playing) return;

        // Just pick the first available color for now
        const color = assignment.availableColors[0];
        if (color) {
          roomManager
            .getEngine()
            .assignReceivedWildcard(game, bot.id, assignment.cardId, color);
          sendStateToAll(roomCode);
          checkGameEnd(roomCode);
          await checkBotTurn(roomCode);
        }
        return;
      }
    }

    if (game.turn?.pendingAction) {
      const action = game.turn.pendingAction;
      const playerCount = game.players.filter((p) => p.connected).length;

      // Find all bots that need to respond
      let botsToRespond = action.targetPlayerIds
        .filter((pid) => !action.respondedPlayerIds.includes(pid))
        .map((pid) => game.players.find((pl) => pl.id === pid))
        .filter((p) => p?.isBot);

      // If there's a Just Say No chain, either the source or target player needs to respond
      if (action.justSayNoChain && botsToRespond.length === 0) {
        // The targetPlayerId in the chain is the person who just played JSN
        // The person who needs to respond is the OTHER player involved
        const chainTargetId = action.justSayNoChain.targetPlayerId;

        // Check if source player is a bot and needs to respond
        const sourcePlayer = game.players.find(
          (p) => p.id === action.sourcePlayerId,
        );
        if (sourcePlayer?.isBot && sourcePlayer.id !== chainTargetId) {
          botsToRespond = [sourcePlayer];
        }

        // Also check if any target player is a bot and needs to respond
        if (botsToRespond.length === 0) {
          const botTarget = action.targetPlayerIds
            .map((pid) => game.players.find((p) => p.id === pid))
            .find((p) => p?.isBot && p.id !== chainTargetId);
          if (botTarget) {
            botsToRespond = [botTarget];
          }
        }
      }

      if (botsToRespond.length === 0) return;

      // Each bot responds with a randomized delay, but in parallel
      await Promise.all(
        botsToRespond.map(async (bot) => {
          if (!bot) return;

          const botSpeed = game.settings?.botSpeed ?? "normal";
          if (botSpeed !== "instant") {
            // Scaled delay: 2 players = 1200-1800ms, 6 players = 600-1200ms
            const baseDelay = Math.max(600, 1800 - (playerCount - 2) * 300);
            let delay = baseDelay + Math.random() * 600;
            if (botSpeed === "slow") delay *= 2;
            if (botSpeed === "fast") delay *= 0.5;
            await new Promise((resolve) => setTimeout(resolve, delay));
          }

          // Ensure game is still playing before responding
          if (game.phase !== GamePhase.Playing) return;

          botPlayer.respondToAction(game, bot.id);
          sendStateToAll(roomCode);
          checkGameEnd(roomCode);
        }),
      );

      // After all bots have responded, check if there are more actions
      await checkBotTurn(roomCode);
      return;
    }

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer?.isBot) return;

    const botSpeed = game.settings?.botSpeed ?? "normal";
    if (botSpeed !== "instant") {
      // Initial delay before bot starts thinking
      const playerCount = game.players.filter((p) => p.connected).length;
      const baseDelay = Math.max(400, 1000 - (playerCount - 2) * 150);
      let initialDelay = baseDelay + Math.random() * 300;
      if (botSpeed === "slow") initialDelay *= 2;
      if (botSpeed === "fast") initialDelay *= 0.5;
      await new Promise((resolve) => setTimeout(resolve, initialDelay));
    }

    if (game.phase !== GamePhase.Playing) return;

    // Use async version with state updates between moves
    await botPlayer.playTurnAsync(game, currentPlayer.id, () => {
      sendStateToAll(roomCode);
      checkGameEnd(roomCode);
    });

    sendStateToAll(roomCode);
    checkGameEnd(roomCode);

    await checkBotTurn(roomCode);
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

    broadcastToRoom(roomCode, { type: "GAME_STARTED" });
    sendStateToAll(roomCode);

    const currentPlayer = game.players[game.currentPlayerIndex]!;
    broadcastToRoom(roomCode, {
      type: "TURN_STARTED",
      payload: { playerId: currentPlayer.id },
    });

    checkBotTurn(roomCode);
  }

  function handleResign(ws: GameWebSocket): void {
    const { roomCode, playerId } = ws.data;
    if (!roomCode || !playerId) throw new Error("Not in a room");

    const game = roomManager.getRoom(roomCode);
    if (!game) throw new Error("Room not found");

    roomManager.getEngine().resignPlayer(game, playerId);
    sendStateToAll(roomCode);
    checkGameEnd(roomCode);
    checkBotTurn(roomCode);
  }

  function checkGameEnd(roomCode: string): void {
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
