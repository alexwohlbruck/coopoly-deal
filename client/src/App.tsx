import { useCallback, useEffect, useRef, useState } from "react";
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
import { PublicGamesScreen } from "./components/lobby/PublicGamesScreen";
import { WaitingRoom } from "./components/lobby/WaitingRoom";
import { GameTable } from "./components/game/GameTable";
import { CardTestScreen } from "./components/dev/CardTestScreen";
import {
  GamePhase,
  type PublicRoomSummary,
  type ServerMessage,
} from "./types/game";
import { AnimatePresence, motion } from "framer-motion";

// Module-level flag: set by handleGoHome so DeepLinkRedirect sends us to "/"
// instead of "/join/:code" during the leaving transition.
let isLeaving = false;

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
    isSpectating,
    error,
    toast,
    sessionStats,
    setPlayer,
    setRoomCode,
    setGameState,
    setSpectating,
    setError,
    setToast,
    recordWin,
    recordLoss,
    reset,
  } = useGameStore();

  const useSocialistTheme = useGameStore((s) => s.useSocialistTheme);

  // Keep the HTML page title & SEO meta tags in sync with the mode.
  useEffect(() => {
    const title = useSocialistTheme
      ? "Co-Opoly Deal — The Socialist Card Game"
      : "Monopoly Deal Online — Play the Card Game Free with Friends";
    const description = useSocialistTheme
      ? "Play Co-Opoly Deal online — the socialist twist on the classic property card game. Seize the means of production with friends!"
      : "Play Monopoly Deal online for free with friends. Collect properties, charge rent, and steal sets in this fast-paced multiplayer card game. No download required — just share a game code and play!";

    document.title = title;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
  }, [useSocialistTheme]);

  // Auto-rejoin: true on mount if we have persisted credentials and are on a
  // game/room route. Read from localStorage directly because Zustand v5's
  // persist middleware rehydrates asynchronously — getState() returns defaults
  // (null roomCode) on the very first render before rehydration completes.
  const [isReconnecting, setIsReconnecting] = useState(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("coopoly-settings") ?? "{}",
      );
      const rc = stored?.state?.roomCode;
      const pn = stored?.state?.playerName;
      const path = window.location.pathname;
      // Spectating is re-established from the URL alone — no credentials.
      if (path.startsWith("/spectate/")) return true;
      return !!(
        rc &&
        pn &&
        (path.startsWith("/game/") || path.startsWith("/room/"))
      );
    } catch {
      return false;
    }
  });

  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [publicRooms, setPublicRooms] = useState<PublicRoomSummary[] | null>(
    null,
  );
  const sendRef = useRef<(data: Record<string, unknown>) => void>(() => {});

  const { play } = useSoundManager();
  const { haptic } = useHaptics();
  const { isPlaying, toggleMusic, nextTrack, startMusic } =
    useBackgroundMusic();

  const handleMessage = useCallback(
    (msg: ServerMessage) => {
      // Read fresh — the flag flips inside this same handler.
      const isSpectatingNow = () => useGameStore.getState().isSpectating;

      switch (msg.type) {
        case "ROOM_JOINED":
          setPlayer(msg.payload.playerId, playerName ?? "Player");
          setRoomCode(msg.payload.roomCode);
          setGameState(msg.payload.state);
          setSpectating(false);
          setIsReconnecting(false);
          // Navigate based on game phase (rejoin mid-game goes straight to game)
          if (
            msg.payload.state.phase === GamePhase.Playing ||
            msg.payload.state.phase === GamePhase.Finished
          ) {
            navigate(`/game/${msg.payload.roomCode}`, { replace: true });
          } else {
            navigate(`/room/${msg.payload.roomCode}`, { replace: true });
          }
          break;

        case "GAME_STATE_UPDATE":
          setGameState(msg.payload.state);
          // Spectators live on /spectate/:code and must not be pulled into
          // the player-only /game route.
          if (
            !isSpectatingNow() &&
            msg.payload.state.phase === GamePhase.Playing &&
            !location.pathname.startsWith("/game/")
          ) {
            navigate(`/game/${msg.payload.state.id}`, { replace: true });
          }
          break;

        case "GAME_STARTED":
          if (gameState?.id && !isSpectatingNow()) {
            navigate(`/game/${gameState.id}`, { replace: true });
          }
          break;

        case "PUBLIC_ROOMS":
          setPublicRooms(msg.payload.rooms);
          break;

        case "SPECTATING":
          setSpectating(true);
          setRoomCode(msg.payload.roomCode);
          setGameState(msg.payload.state);
          setIsReconnecting(false);
          navigate(`/spectate/${msg.payload.roomCode}`, { replace: true });
          break;

        case "SPECTATE_ENDED":
          setSpectating(false);
          setToast(msg.payload.reason);
          navigate("/", { replace: true });
          break;

        case "PLAYER_JOINED":
          play("playerJoin");
          setToast(`${msg.payload.playerName} joined`);
          break;

        case "PLAYER_LEFT":
          setToast(
            useGameStore.getState().useSocialistTheme
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
          // A spectator neither won nor lost — don't touch session stats.
          if (isSpectatingNow()) {
            setToast(`${msg.payload.winnerName} wins!`);
            break;
          }
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
          // Waiting rooms aren't spectatable, so send watchers home.
          if (isSpectatingNow()) {
            setSpectating(false);
            setToast("That game returned to its lobby");
            navigate("/", { replace: true });
            break;
          }
          if (gameState?.id) {
            navigate(`/room/${gameState.id}`, { replace: true });
          }
          break;

        case "ONLINE_COUNT":
          setOnlineCount(msg.payload.count);
          break;

        case "ERROR":
          play("error");
          haptic("error");
          setError(msg.payload.message);
          // If we were trying to rejoin (or are on a game/room route
          // without an active session), redirect home instead of
          // bouncing to the join screen where "game already started"
          // would be shown.
          if (
            !useGameStore.getState().gameState &&
            (window.location.pathname.startsWith("/game/") ||
              window.location.pathname.startsWith("/room/") ||
              window.location.pathname.startsWith("/spectate/"))
          ) {
            setIsReconnecting(false);
            navigate("/", { replace: true });
          } else {
            setIsReconnecting(false);
          }
          setTimeout(() => setError(null), 4000);
          break;
      }
    },
    [
      playerId,
      playerName,
      gameState?.id,
      location.pathname,
      navigate,
      setPlayer,
      setRoomCode,
      setGameState,
      setSpectating,
      setError,
      setToast,
      recordWin,
      recordLoss,
      play,
      haptic,
    ],
  );

  // Auto-rejoin on WebSocket open if we have persisted room credentials.
  // Falls back to raw localStorage because Zustand v5 may not have
  // finished async rehydration by the time the WebSocket opens.
  const handleWsOpen = useCallback(() => {
    let rc = useGameStore.getState().roomCode;
    let pn = useGameStore.getState().playerName;
    if (!rc || !pn) {
      try {
        const stored = JSON.parse(
          localStorage.getItem("coopoly-settings") ?? "{}",
        );
        rc = rc || stored?.state?.roomCode;
        pn = pn || stored?.state?.playerName;
      } catch {
        // ignore
      }
    }
    const path = window.location.pathname;
    if (rc && pn && (path.startsWith("/room/") || path.startsWith("/game/"))) {
      sendRef.current({ type: "JOIN_ROOM", payload: { roomCode: rc, playerName: pn } });
    } else if (path === "/games") {
      sendRef.current({ type: "LIST_PUBLIC_ROOMS" });
      setIsReconnecting(false);
    } else if (path.startsWith("/spectate/")) {
      // Stays "reconnecting" until SPECTATING (or an error) comes back.
      const code = path.split("/")[2];
      if (code) {
        sendRef.current({ type: "SPECTATE_ROOM", payload: { roomCode: code } });
      } else {
        setIsReconnecting(false);
      }
    } else {
      // Sitting on the lobby — subscribe to the public room browser.
      sendRef.current({ type: "LIST_PUBLIC_ROOMS" });
      setIsReconnecting(false);
    }
  }, []);

  const { connect, send, disconnect } = useWebSocket(handleMessage, handleWsOpen);

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Safety timeout: if reconnection takes too long, stop blocking the UI.
  // Navigate home so DeepLinkRedirect doesn't send us to the join screen.
  useEffect(() => {
    if (isReconnecting) {
      const t = setTimeout(() => {
        setIsReconnecting(false);
        if (
          !useGameStore.getState().gameState &&
          (window.location.pathname.startsWith("/game/") ||
            window.location.pathname.startsWith("/room/") ||
            window.location.pathname.startsWith("/spectate/"))
        ) {
          navigate("/", { replace: true });
        }
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [isReconnecting, navigate]);

  // (Re)subscribe to the public room browser whenever we land on the lobby
  // or the browser itself. handleWsOpen covers connecting while already
  // here; this covers arriving later — leaving a game, or getting bounced
  // off a dead link. The lobby only needs the count for its button badge.
  useEffect(() => {
    if (location.pathname === "/" || location.pathname === "/games") {
      sendRef.current({ type: "LIST_PUBLIC_ROOMS" });
    }
  }, [location.pathname]);

  // Clear toast after delay
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast, setToast]);

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

  const handleCreateRoom = useCallback(async (name: string) => {
    startMusic();
    try {
      const res = await fetch("/api/rooms", { method: "POST" });
      const data = await res.json();
      handleJoinRoom(data.roomCode, name, true);
    } catch {
      setError("Failed to create game");
    }
  }, [setError, startMusic, handleJoinRoom]);

  const handleBrowsePublicGames = useCallback(
    (name: string) => {
      // Carry the lobby's name over so the browser page starts prefilled.
      if (name) useGameStore.getState().setPlayerName(name);
      navigate("/games");
    },
    [navigate],
  );

  const handleSpectateRoom = useCallback(
    (code: string) => {
      startMusic();
      send({ type: "SPECTATE_ROOM", payload: { roomCode: code } });
    },
    [send, startMusic],
  );

  const handleSetPublic = useCallback(
    (isPublic: boolean) => {
      send({
        type: "SET_ROOM_VISIBILITY",
        payload: { isPublic },
      });
    },
    [send],
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
    // Set leaving flag so DeepLinkRedirect sends us to "/" instead of
    // "/join/:code" during the transition. Without this, disconnect() +
    // reset() null out gameState while still on /game/:code, which triggers
    // DeepLinkRedirect → /join/:code before navigate("/") takes effect.
    isLeaving = true;
    disconnect();
    reset();
    navigate("/", { replace: true });
    setTimeout(() => {
      isLeaving = false;
      connect();
    }, 100);
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
              onJoinRoom={(code, name) => handleJoinRoom(code, name)}
              musicControls={musicProps}
              onlineCount={onlineCount}
              publicRoomCount={publicRooms?.length ?? 0}
              onBrowsePublicGames={handleBrowsePublicGames}
            />
          }
        />
        <Route
          path="/games"
          element={
            // The browser has no name field of its own — a direct visit
            // without a stored name goes back to the lobby to pick one.
            playerName ? (
              <PublicGamesScreen
                rooms={publicRooms}
                onJoin={(code) => handleJoinRoom(code, playerName)}
                onSpectate={handleSpectateRoom}
                onBack={() => navigate("/")}
                musicControls={musicProps}
              />
            ) : (
              <Navigate to="/" replace />
            )
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
                onUpdateName={(name) => {
                  send({ type: "UPDATE_PLAYER_NAME", payload: { playerName: name } });
                  useGameStore.getState().setPlayer(playerId, name);
                }}
                onSetPublic={handleSetPublic}
                onLeave={handleGoHome}
                musicControls={musicProps}
              />
            ) : isReconnecting ? (
              <ReconnectingScreen />
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
            ) : isReconnecting ? (
              <ReconnectingScreen />
            ) : (
              <DeepLinkRedirect />
            )
          }
        />
        <Route
          path="/spectate/:code"
          element={
            gameState && isSpectating ? (
              <SpectatorTable
                gameState={gameState}
                musicControls={musicProps}
                onGoHome={handleGoHome}
              />
            ) : isReconnecting ? (
              <ReconnectingScreen />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

// Spectator view — the normal table with an empty player id, so no hand,
// no bottom bar and no dialogs render. Every play callback is inert.
function SpectatorTable({
  gameState,
  musicControls,
  onGoHome,
}: {
  gameState: NonNullable<ReturnType<typeof useGameStore.getState>["gameState"]>;
  musicControls: {
    isPlaying: boolean;
    onToggle: () => void;
    onNext: () => void;
  };
  onGoHome: () => void;
}) {
  const noop = () => {};
  return (
    <GameTable
      gameState={gameState}
      playerId=""
      isSpectating
      onPlayToBank={noop}
      onPlayToProperty={noop}
      onPlayAction={noop}
      onEndTurn={noop}
      onDiscardCards={noop}
      onPayWithCards={noop}
      onJustSayNo={noop}
      onAcceptAction={noop}
      onGoHome={onGoHome}
      musicControls={musicControls}
    />
  );
}

function ReconnectingScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg-primary, #1a1412)" }}
    >
      <div className="text-center">
        <div
          className="animate-spin w-8 h-8 border-2 border-current border-t-transparent rounded-full mx-auto mb-4"
          style={{ color: "var(--accent, #f0c14a)" }}
        />
        <p
          style={{
            color: "#f5ead0",
            fontFamily: "var(--font-ui)",
            fontSize: 14,
            opacity: 0.7,
          }}
        >
          Reconnecting…
        </p>
      </div>
    </div>
  );
}

// Direct visits to /game/:code without an active WS session redirect to
// /room/:code where the join gate handles name entry / auto-join.
// When the user is intentionally leaving (handleGoHome), redirect to "/".
function DeepLinkRedirect() {
  const { code } = useParams();
  if (isLeaving) return <Navigate to="/" replace />;
  return <Navigate to={code ? `/room/${code}` : "/"} replace />;
}

