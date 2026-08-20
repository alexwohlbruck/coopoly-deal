// PublicRoomList — the list body for the public games page. Waiting rooms
// with a free seat can be joined; games already underway are offered as
// spectate-only. The list is pushed over the WebSocket, so it updates live.
// Page chrome (back, title) lives in PublicGamesScreen.

import { motion, AnimatePresence } from "framer-motion";
import { Users, Eye, Timer, Trophy, Bot } from "lucide-react";
import type { PublicRoomSummary } from "../../types/game";
import { GamePhase } from "../../types/game";
import { useI18n } from "../../i18n";
import { PrimaryButton, SecondaryButton } from "../ui/Button";

interface PublicRoomListProps {
  rooms: PublicRoomSummary[] | null;
  onJoin: (roomCode: string) => void;
  onSpectate: (roomCode: string) => void;
}

const CREAM = "#f5ead0";

const CHIP_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.04em",
  color: "rgba(245,234,208,0.5)",
  whiteSpace: "nowrap",
};

export function PublicRoomList({
  rooms,
  onJoin,
  onSpectate,
}: PublicRoomListProps) {
  const { t } = useI18n();

  return (
    <div
      style={{
        background:
          "linear-gradient(180deg, rgba(28,22,20,0.85) 0%, rgba(16,10,8,0.92) 100%)",
        border: "1px solid rgba(245,234,208,0.1)",
        borderRadius: 16,
        padding: 8,
        boxShadow: "var(--sh-panel)",
        backdropFilter: "blur(8px)",
      }}
    >
      {!rooms || rooms.length === 0 ? (
        <div style={{ padding: "36px 16px", textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              fontWeight: 600,
              color: "rgba(245,234,208,0.6)",
            }}
          >
            {t.lobby.noPublicGames}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              lineHeight: 1.5,
              color: "rgba(245,234,208,0.4)",
              marginTop: 6,
            }}
          >
            {t.lobby.noPublicGamesHint}
          </div>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {rooms.map((room) => (
            <PublicRoomRow
              key={room.roomCode}
              room={room}
              onJoin={onJoin}
              onSpectate={onSpectate}
            />
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}

function PublicRoomRow({
  room,
  onJoin,
  onSpectate,
}: {
  room: PublicRoomSummary;
  onJoin: (roomCode: string) => void;
  onSpectate: (roomCode: string) => void;
}) {
  const { t } = useI18n();
  // A finished game is joinable, not watchable — it's parked on the end
  // screen waiting for a rematch, and joiners are dealt into it.
  const started = room.phase === GamePhase.Playing;
  const finished = room.phase === GamePhase.Finished;
  const isFull = !room.joinable && !started;

  const statusLabel = started
    ? t.lobby.inProgress
    : isFull
      ? t.lobby.full
      : finished
        ? t.finished.gameOver
        : t.lobby.waitingForPlayers;
  const statusColor = started
    ? "#6c9bd2"
    : isFull
      ? "rgba(245,234,208,0.45)"
      : finished
        ? "#d8a657"
        : "#7adb88";

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 10px",
        borderRadius: 10,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              fontWeight: 600,
              color: CREAM,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {room.hostName}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 8,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: statusColor,
              flexShrink: 0,
            }}
          >
            · {statusLabel}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 3,
          }}
        >
          <span style={CHIP_STYLE}>
            <Users className="w-3 h-3" />
            {room.playerCount}/{room.maxPlayers}
          </span>
          {room.botCount > 0 && (
            <span style={CHIP_STYLE}>
              <Bot className="w-3 h-3" />
              {room.botCount}
            </span>
          )}
          <span style={CHIP_STYLE}>
            <Timer className="w-3 h-3" />
            {room.settings.turnTimer > 0 ? `${room.settings.turnTimer}s` : "∞"}
          </span>
          <span style={CHIP_STYLE}>
            <Trophy className="w-3 h-3" />
            {room.settings.setsToWin} · {room.settings.movesPerTurn}
          </span>
          {room.spectatorCount > 0 && (
            <span style={CHIP_STYLE}>
              <Eye className="w-3 h-3" />
              {room.spectatorCount}
            </span>
          )}
        </div>
      </div>

      {started ? (
        <SecondaryButton
          size="sm"
          onClick={() => onSpectate(room.roomCode)}
          style={{ flexShrink: 0 }}
        >
          {t.lobby.spectate}
        </SecondaryButton>
      ) : (
        <PrimaryButton
          size="sm"
          disabled={isFull}
          onClick={() => onJoin(room.roomCode)}
          style={{ flexShrink: 0 }}
        >
          {t.lobby.join}
        </PrimaryButton>
      )}
    </motion.div>
  );
}
