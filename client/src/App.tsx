import { useCallback, useEffect, useState } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { useGameStore } from "./hooks/useGameStore";
import { useSoundManager } from "./hooks/useSoundManager";
import { useBackgroundMusic } from "./hooks/useBackgroundMusic";
import { LobbyScreen } from "./components/lobby/LobbyScreen";
import { WaitingRoom } from "./components/lobby/WaitingRoom";
import { NameEntryDialog } from "./components/lobby/NameEntryDialog";
import { GameTable } from "./components/game/GameTable";
import { GamePhase, type ServerMessage } from "./types/game";
import { AnimatePresence, motion } from "framer-motion";

type Screen = "lobby" | "nameEntry" | "waiting" | "game";

export default function App() {
  const [screen, setScreen] = useState<Screen>("lobby");
  const [pendingRoomCode, setPendingRoomCode] = useState<string | null>(null);

  const {
    playerId,
    playerName,
    gameState,
    error,
    toast,
    sessionStats,
    setPlayer,
    setRoomCode,
    setGameState,
    setError,
    setToast,
    recordWin,
    recordLoss,
    reset,
  } = useGameStore();

  const { play } = useSoundManager();
  const { isPlaying, toggleMusic, nextTrack, startMusic } = useBackgroundMusic();

  const handleMessage = useCallback(
    (msg: ServerMessage) => {
      switch (msg.type) {
        case "ROOM_JOINED":
          setPlayer(msg.payload.playerId, playerName ?? "Player");
          setRoomCode(msg.payload.roomCode);
          setGameState(msg.payload.state);
          setScreen("waiting");
          break;

        case "GAME_STATE_UPDATE":
          setGameState(msg.payload.state);
          if (msg.payload.state.phase === GamePhase.Playing && screen !== "game") {
            setScreen("game");
          }
          break;

        case "GAME_STARTED":
          setScreen("game");
          break;

        case "PLAYER_JOINED":
          play("playerJoin");
          setToast(`${msg.payload.playerName} joined`);
          break;

        case "PLAYER_LEFT":
          setToast("A player disconnected");
          break;

        case "TURN_STARTED":
          if (msg.payload.playerId === playerId) {
            play("turnStart");
            setToast("Your turn!");
          }
          break;

        case "GAME_ENDED":
          if (msg.payload.winnerId === playerId) {
            play("gameWin");
            recordWin();
          } else {
            play("gameLose");
            recordLoss();
          }
          setToast(
            msg.payload.winnerId === playerId
              ? "You win!"
              : `${msg.payload.winnerName} wins!`
          );
          break;

        case "ERROR":
          play("error");
          setError(msg.payload.message);
          setTimeout(() => setError(null), 4000);
          break;
      }
    },
    [playerId, playerName, screen, setPlayer, setRoomCode, setGameState, setError, setToast, recordWin, recordLoss, play]
  );

  const { connect, send, disconnect } = useWebSocket(handleMessage);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Clear toast after delay
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast, setToast]);

  const handleCreateRoom = useCallback(async () => {
    startMusic(); // Start music on first user interaction
    try {
      const res = await fetch("/api/rooms", { method: "POST" });
      const data = await res.json();
      setPendingRoomCode(data.roomCode);
      setScreen("nameEntry");
    } catch {
      setError("Failed to create room");
    }
  }, [setError, startMusic]);

  const handleJoinRoom = useCallback(
    (code: string, name: string) => {
      startMusic(); // Start music on first user interaction
      setPlayer("", name);
      send({ type: "JOIN_ROOM", payload: { roomCode: code, playerName: name } });
    },
    [send, setPlayer, startMusic]
  );

  const handleNameSubmit = useCallback(
    (name: string) => {
      if (pendingRoomCode) {
        handleJoinRoom(pendingRoomCode, name);
      }
    },
    [pendingRoomCode, handleJoinRoom]
  );

  const handleStartGame = useCallback(() => {
    startMusic(); // Start music on first user interaction
    send({ type: "START_GAME" });
  }, [send, startMusic]);

  const handleAddBot = useCallback(() => {
    send({ type: "ADD_BOT" } as any);
  }, [send]);

  const handleRemovePlayer = useCallback((playerIdToRemove: string) => {
    send({ type: "REMOVE_PLAYER", payload: { playerIdToRemove } } as any);
  }, [send]);

  const handleRematch = useCallback(() => {
    send({ type: "REMATCH" });
  }, [send]);

  const handleGoHome = useCallback(() => {
    disconnect();
    reset();
    setScreen("lobby");
    setTimeout(() => connect(), 100);
  }, [disconnect, reset, connect]);

  const handleResign = useCallback(() => {
    send({ type: "RESIGN" });
  }, [send]);

  const handleDevInjectCard = useCallback((cardType: any, targetPlayerId: string, colors?: any[]) => {
    send({ type: "DEV_INJECT_CARD", payload: { cardType, targetPlayerId, colors } });
  }, [send]);

  const handleDevGiveCompleteSet = useCallback((color: any, targetPlayerId: string) => {
    send({ type: "DEV_GIVE_COMPLETE_SET", payload: { color, targetPlayerId } });
  }, [send]);

  const handleDevSetMoney = useCallback((amount: number, targetPlayerId: string) => {
    send({ type: "DEV_SET_MONEY", payload: { amount, targetPlayerId } });
  }, [send]);

  return (
    <div className="min-h-screen">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-white/10 backdrop-blur-lg text-white px-6 py-3 rounded-xl shadow-lg border border-white/20"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-red-600/90 backdrop-blur-lg text-white px-6 py-3 rounded-xl shadow-lg"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screens */}
      {screen === "lobby" && (
        <LobbyScreen
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          musicControls={{ isPlaying, onToggle: toggleMusic, onNext: nextTrack }}
        />
      )}

      {screen === "nameEntry" && pendingRoomCode && (
        <NameEntryDialog
          roomCode={pendingRoomCode}
          onSubmit={handleNameSubmit}
          onBack={() => setScreen("lobby")}
        />
      )}

      {screen === "waiting" && gameState && playerId && (
        <WaitingRoom
          gameState={gameState}
          playerId={playerId}
          onStartGame={handleStartGame}
          onAddBot={handleAddBot}
          onRemovePlayer={handleRemovePlayer}
          musicControls={{ isPlaying, onToggle: toggleMusic, onNext: nextTrack }}
        />
      )}

      {screen === "game" && gameState && playerId && (
        <GameTable
          gameState={gameState}
          playerId={playerId}
          sessionStats={sessionStats}
          onPlayToBank={(cardId) => {
            play("cardPlay");
            send({ type: "PLAY_CARD_TO_BANK", payload: { cardId } });
          }}
          onPlayToProperty={(cardId, asColor, groupWithUnassigned) => {
            play("cardPlay");
            send({ type: "PLAY_CARD_TO_PROPERTY", payload: { cardId, asColor, groupWithUnassigned } });
          }}
          onPlayAction={(payload) => {
            console.log('[App] onPlayAction called', payload);
            play("actionPlayed");
            console.log('[App] Sending PLAY_ACTION_CARD to server');
            send({ type: "PLAY_ACTION_CARD", payload });
            console.log('[App] PLAY_ACTION_CARD sent');
          }}
          onRearrangeProperty={(cardId, toColor, createNewSet) => {
            send({ type: "REARRANGE_PROPERTY", payload: { cardId, toColor, createNewSet } });
          }}
          onAssignReceivedWildcard={(cardId, color) => {
            send({ type: "ASSIGN_RECEIVED_WILDCARD", payload: { cardId, color } });
          }}
          onEndTurn={() => send({ type: "END_TURN" })}
          onDiscardCards={(cardIds) =>
            send({ type: "DISCARD_CARDS", payload: { cardIds } })
          }
          onPayWithCards={(cardIds) => {
            play("payment");
            send({ type: "PAY_WITH_CARDS", payload: { cardIds } });
          }}
          onJustSayNo={() => {
            play("justSayNo");
            send({ type: "JUST_SAY_NO" });
          }}
          onAcceptAction={() => send({ type: "ACCEPT_ACTION" })}
          onRematch={handleRematch}
          onGoHome={handleGoHome}
          onResign={handleResign}
          musicControls={{ isPlaying, onToggle: toggleMusic, onNext: nextTrack }}
          onDevInjectCard={handleDevInjectCard}
          onDevGiveCompleteSet={handleDevGiveCompleteSet}
          onDevSetMoney={handleDevSetMoney}
        />
      )}
    </div>
  );
}
