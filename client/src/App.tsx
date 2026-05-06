import { useCallback, useEffect } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useParams,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useWebSocket } from "./hooks/useWebSocket";
import { useGameStore } from "./hooks/useGameStore";
import { useSoundManager } from "./hooks/useSoundManager";
import { useHaptics } from "./hooks/useHaptics";
import { useBackgroundMusic } from "./hooks/useBackgroundMusic";
import { LobbyScreen } from "./components/lobby/LobbyScreen";
import { WaitingRoom } from "./components/lobby/WaitingRoom";
import { NameEntryDialog } from "./components/lobby/NameEntryDialog";
import { GameTable } from "./components/game/GameTable";
import { CardTestScreen } from "./components/dev/CardTestScreen";
import { GamePhase, type ServerMessage } from "./types/game";
import { AnimatePresence, motion } from "framer-motion";

export default function App() {
  return (
    <Routes>
      <Route path="/test/cards" element={<CardTestScreen />} />
      <Route path="*" element={<AppMain />} />
    </Routes>
  );
}

function AppMain() {
  const navigate = useNavigate();
  const location = useLocation();

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
  const { haptic } = useHaptics();
  const { isPlaying, toggleMusic, nextTrack, startMusic } =
    useBackgroundMusic();

  const handleMessage = useCallback(
    (msg: ServerMessage) => {
      switch (msg.type) {
        case "ROOM_JOINED":
          setPlayer(msg.payload.playerId, playerName ?? "Player");
          setRoomCode(msg.payload.roomCode);
          setGameState(msg.payload.state);
          navigate(`/room/${msg.payload.roomCode}`, { replace: true });
          break;

        case "GAME_STATE_UPDATE":
          setGameState(msg.payload.state);
          if (
            msg.payload.state.phase === GamePhase.Playing &&
            !location.pathname.startsWith("/game/")
          ) {
            navigate(`/game/${msg.payload.state.id}`, { replace: true });
          }
          break;

        case "GAME_STARTED":
          if (gameState?.id) {
            navigate(`/game/${gameState.id}`, { replace: true });
          }
          break;

        case "PLAYER_JOINED":
          play("playerJoin");
          setToast(`${msg.payload.playerName} joined`);
          break;

        case "PLAYER_LEFT":
          setToast(
            gameState?.settings?.useSocialistTheme
              ? "A comrade disconnected"
              : "A player disconnected",
          );
          break;

        case "TURN_STARTED":
          if (msg.payload.playerId === playerId) {
            play("turnStart");
            haptic("select");
            setToast("Your turn!");
          }
          break;

        case "GAME_ENDED":
          if (msg.payload.winnerId === playerId) {
            play("gameWin");
            haptic("win");
            recordWin();
          } else {
            play("gameLose");
            haptic("buzz");
            recordLoss();
          }
          setToast(
            msg.payload.winnerId === playerId
              ? "You win!"
              : `${msg.payload.winnerName} wins!`,
          );
          break;

        case "RETURNED_TO_LOBBY":
          if (gameState?.id) {
            navigate(`/room/${gameState.id}`, { replace: true });
          }
          break;

        case "ERROR":
          play("error");
          haptic("error");
          setError(msg.payload.message);
          setTimeout(() => setError(null), 4000);
          break;
      }
    },
    [
      playerId,
      playerName,
      gameState?.id,
      gameState?.settings?.useSocialistTheme,
      location.pathname,
      navigate,
      setPlayer,
      setRoomCode,
      setGameState,
      setError,
      setToast,
      recordWin,
      recordLoss,
      play,
      haptic,
    ],
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
    startMusic();
    try {
      const res = await fetch("/api/rooms", { method: "POST" });
      const data = await res.json();
      navigate(`/join/${data.roomCode}`);
    } catch {
      setError("Failed to create room");
    }
  }, [navigate, setError, startMusic]);

  const handleJoinRoom = useCallback(
    (code: string, name: string, isHost: boolean = false) => {
      startMusic();
      setPlayer("", name);
      send({
        type: "JOIN_ROOM",
        payload: { roomCode: code, playerName: name },
      });

      if (isHost) {
        setTimeout(() => {
          const { preferredSettings, gameState: gs } = useGameStore.getState();
          if (gs?.phase === GamePhase.Waiting) {
            send({
              type: "UPDATE_SETTINGS",
              payload: { settings: preferredSettings },
            });
          }
        }, 500);
      }
    },
    [send, setPlayer, startMusic],
  );

  const handleStartGame = useCallback(() => {
    startMusic();
    send({ type: "START_GAME" });
  }, [send, startMusic]);

  const handleAddBot = useCallback(() => {
    send({ type: "ADD_BOT" });
  }, [send]);

  const handleRemovePlayer = useCallback(
    (playerIdToRemove: string) => {
      send({ type: "REMOVE_PLAYER", payload: { playerIdToRemove } });
    },
    [send],
  );

  const handleRematch = useCallback(() => {
    send({ type: "REMATCH" });
  }, [send]);

  const handleGoHome = useCallback(() => {
    navigate("/", { replace: true });
    setTimeout(() => {
      disconnect();
      reset();
      setTimeout(() => connect(), 100);
    }, 0);
  }, [disconnect, reset, connect, navigate]);

  const handleResign = useCallback(() => {
    send({ type: "RESIGN" });
  }, [send]);

  const handleReturnToLobby = useCallback(() => {
    send({ type: "RETURN_TO_LOBBY" });
  }, [send]);

  const handleDevInjectCard = useCallback(
    (cardType: unknown, targetPlayerId: string, colors?: unknown[]) => {
      send({
        type: "DEV_INJECT_CARD",
        payload: { cardType, targetPlayerId, colors },
      });
    },
    [send],
  );

  const handleDevGiveCompleteSet = useCallback(
    (color: unknown, targetPlayerId: string) => {
      send({
        type: "DEV_GIVE_COMPLETE_SET",
        payload: { color, targetPlayerId },
      });
    },
    [send],
  );

  const handleDevSetMoney = useCallback(
    (amount: number, targetPlayerId: string) => {
      send({ type: "DEV_SET_MONEY", payload: { amount, targetPlayerId } });
    },
    [send],
  );

  const musicProps = {
    isPlaying,
    onToggle: toggleMusic,
    onNext: nextTrack,
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.18, ease: [0.22, 0.9, 0.32, 1] }}
            className="fixed left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
            style={{
              top: 70,
              padding: "8px 14px",
              borderRadius: 999,
              background:
                "linear-gradient(180deg, rgba(28,22,20,0.92) 0%, rgba(16,10,8,0.96) 100%)",
              border: "1px solid rgba(245,234,208,0.12)",
              color: "#f5ead0",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              fontWeight: 600,
              boxShadow:
                "0 6px 16px -4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: "var(--accent, #f0c14a)",
                boxShadow: "0 0 6px var(--accent, #f0c14a)",
              }}
            />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

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

      <Routes>
        <Route
          path="/"
          element={
            <LobbyScreen
              onCreateRoom={handleCreateRoom}
              onJoinRoom={handleJoinRoom}
              musicControls={musicProps}
            />
          }
        />
        <Route
          path="/join/:code"
          element={
            <NameEntryRoute
              onSubmit={(name, code) => handleJoinRoom(code, name, true)}
            />
          }
        />
        <Route
          path="/room/:code"
          element={
            gameState && playerId ? (
              <WaitingRoom
                gameState={gameState}
                playerId={playerId}
                onStartGame={handleStartGame}
                onUpdateSettings={(settings) => {
                  send({ type: "UPDATE_SETTINGS", payload: { settings } });
                  if (gameState.players[0]?.id === playerId) {
                    useGameStore.getState().setPreferredSettings(settings);
                  }
                }}
                onAddBot={handleAddBot}
                onRemovePlayer={handleRemovePlayer}
                musicControls={musicProps}
              />
            ) : (
              <DeepLinkRedirect />
            )
          }
        />
        <Route
          path="/game/:code"
          element={
            gameState && playerId ? (
              <GameTable
                gameState={gameState}
                playerId={playerId}
                sessionStats={sessionStats}
                onPlayToBank={(cardId) => {
                  play("cardPlay");
                  haptic("play");
                  send({
                    type: "PLAY_CARD_TO_BANK",
                    payload: { cardId },
                  });
                }}
                onPlayToProperty={(cardId, asColor, groupWithUnassigned) => {
                  play("cardPlay");
                  haptic("play");
                  send({
                    type: "PLAY_CARD_TO_PROPERTY",
                    payload: { cardId, asColor, groupWithUnassigned },
                  });
                }}
                onPlayAction={(payload) => {
                  play("actionPlayed");
                  haptic("play");
                  send({ type: "PLAY_ACTION_CARD", payload });
                }}
                onRearrangeProperty={(cardId, toColor, createNewSet) => {
                  send({
                    type: "REARRANGE_PROPERTY",
                    payload: { cardId, toColor, createNewSet },
                  });
                }}
                onAssignReceivedWildcard={(cardId, color) => {
                  send({
                    type: "ASSIGN_RECEIVED_WILDCARD",
                    payload: { cardId, color },
                  });
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
                onReturnToLobby={handleReturnToLobby}
                onGoHome={handleGoHome}
                onResign={handleResign}
                musicControls={musicProps}
                onDevInjectCard={handleDevInjectCard}
                onDevGiveCompleteSet={handleDevGiveCompleteSet}
                onDevSetMoney={handleDevSetMoney}
              />
            ) : (
              <DeepLinkRedirect />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

// Direct visits to /room/:code or /game/:code without an active WS session
// can't restore the game state, so bounce the user to the join flow for
// that room (where they can enter a name and reconnect).
function DeepLinkRedirect() {
  const { code } = useParams();
  return <Navigate to={code ? `/join/${code}` : "/"} replace />;
}

function NameEntryRoute({
  onSubmit,
}: {
  onSubmit: (name: string, code: string) => void;
}) {
  const { code } = useParams();
  const navigate = useNavigate();
  if (!code) return <Navigate to="/" replace />;
  return (
    <NameEntryDialog
      roomCode={code}
      onSubmit={(name) => onSubmit(name, code)}
      onBack={() => navigate("/")}
    />
  );
}
