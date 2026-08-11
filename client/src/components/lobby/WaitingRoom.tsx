// Waiting room — redesigned per design's MockupWaitingRoom.
// Centered "Waiting Room / Room {code}" card with a player list and
// host controls. Settings panel on the right at desktop, stacked
// below at compact widths. Footer shows the share-code line.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeft } from "lucide-react";
import type { ClientGameState } from "../../types/game";
import { MusicControls } from "../common/MusicControls";
import { GameRulesModal } from "../common/GameRulesModal";
import { RulesButton } from "../common/RulesButton";
import { GameSettingsPanel } from "./GameSettingsPanel";
import { RoomQrCode } from "./RoomQrCode";
import { CopyRoomLinkButton } from "./CopyRoomLinkButton";
import { useModalParam } from "../../hooks/useModalParam";
import { type GameSettings } from "../../types/game";
import { useI18n } from "../../i18n";
import { useGameStore } from "../../hooks/useGameStore";
import { getTheme } from "../../theme/colors";
import { useLayout } from "../../hooks/useLayout";
import { PrimaryButton, SecondaryButton } from "../ui/Button";

interface WaitingRoomProps {
  gameState: ClientGameState;
  playerId: string;
  onStartGame: () => void;
  onUpdateSettings: (settings: GameSettings) => void;
  onAddBot: () => void;
  onRemovePlayer?: (playerIdToRemove: string) => void;
  onUpdateName?: (name: string) => void;
  onLeave: () => void;
  musicControls?: {
    isPlaying: boolean;
    onToggle: () => void;
    onNext: () => void;
  };
}

// Color palette for player avatars — picked from the design's PlayerCrest
// swatches; stable per player by index so colors don't shuffle on join.
const AVATAR_PALETTE = [
  "#f0c14a",
  "#6c9bd2",
  "#d96aa1",
  "#7adb88",
  "#e08840",
  "#b8a8ff",
];

const PANEL_BG =
  "linear-gradient(180deg, rgba(28,22,20,0.85) 0%, rgba(16,10,8,0.92) 100%)";
const PANEL_BORDER = "1px solid rgba(245,234,208,0.08)";

export function WaitingRoom({
  gameState,
  playerId,
  onStartGame,
  onUpdateSettings,
  onAddBot,
  onRemovePlayer,
  onUpdateName,
  onLeave,
  musicControls,
}: WaitingRoomProps) {
  const { t } = useI18n();
  const { theme, useSocialistTheme } = useGameStore();
  const s = useSocialistTheme;
  const themeData = getTheme(theme);
  const layout = useLayout();
  const isCompact = layout === "compact";
  const { modal, open, close } = useModalParam();

  const [qrEnlarged, setQrEnlarged] = useState(false);

  const me = gameState.players.find((p) => p.id === playerId);
  const [nameDraft, setNameDraft] = useState(me?.name ?? "");
  const isHost = gameState.players[0]?.id === playerId;
  const canStart = gameState.players.length >= 2;

  return (
    <div
      className={`min-h-dynamic-screen ${themeData.feltClass} felt-surface flex items-start justify-center`}
      style={{
        // Push content down past the top chrome (Rules button + music controls).
        padding: isCompact ? "70px 12px 24px" : "92px 24px 32px",
      }}
    >
      {/* Top-right music — shared chrome with the home lobby. */}
      {musicControls && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <MusicControls
            isPlaying={musicControls.isPlaying}
            onToggle={musicControls.onToggle}
            onNext={musicControls.onNext}
          />
        </div>
      )}

      {/* Top-left rules pill — shared component matches the home lobby. */}
      <div className="fixed top-4 left-4 z-50">
        <RulesButton onClick={() => open("rules")} />
      </div>

      <GameRulesModal
        isOpen={modal === "rules"}
        maxHandSize={gameState.settings.maxHandSize}
        allowDuplicateSets={gameState.settings.allowDuplicateSets}
        onClose={close}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 0.9, 0.32, 1] }}
        style={{
          width: "100%",
          maxWidth: isCompact ? 460 : 760,
          display: "flex",
          flexDirection: isCompact ? "column" : "row",
          gap: isCompact ? 14 : 24,
          alignItems: "flex-start",
          justifyContent: "center",
        }}
      >
        {/* ── Players card ─────────────────────────────────────── */}
        <div
          style={{
            flex: isCompact ? undefined : "0 0 400px",
            width: isCompact ? "100%" : 400,
            padding: isCompact ? 18 : 24,
            borderRadius: 16,
            background: PANEL_BG,
            border: PANEL_BORDER,
            boxShadow: "var(--sh-panel)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <button
              onClick={onLeave}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: "rgba(245,234,208,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color var(--d-quick) var(--ease-out-soft)",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#f5ead0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(245,234,208,0.4)";
              }}
              title={t.waiting.leaveRoom}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.1em",
                color: "rgba(245,234,208,0.55)",
                textTransform: "uppercase",
              }}
            >
              {t.waiting.waitingRoom}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              paddingBottom: 16,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              marginBottom: 14,
            }}
          >
            {/* Room code + copy-the-join-link pill. */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: isCompact ? 40 : 48,
                  fontWeight: 800,
                  color: "#f5ead0",
                  letterSpacing: "0.08em",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                }}
              >
                {gameState.id}
              </div>
              <CopyRoomLinkButton roomCode={gameState.id} />
            </div>
            <button
              onClick={() => setQrEnlarged(true)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                borderRadius: 8,
                transition: "transform var(--d-quick) var(--ease-out-soft)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.03)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
              title={t.waiting.clickToEnlarge}
            >
              <RoomQrCode roomCode={gameState.id} size={isCompact ? 140 : 180} />
            </button>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.08em",
                color: "rgba(245,234,208,0.4)",
                textTransform: "uppercase",
              }}
            >
              {t.waiting.scanToJoin}
            </span>
          </div>

          <div
            style={{
              paddingBottom: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.06em",
                color: "rgba(245,234,208,0.5)",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              <span>
                {s
                  ? t.socialist.players
                  : t.waiting.players}
              </span>
              <span>
                {gameState.players.length} / 6
              </span>
            </div>

            <AnimatePresence initial={false}>
              {gameState.players.map((player, i) => {
                const color = AVATAR_PALETTE[i % AVATAR_PALETTE.length];
                const isMe = player.id === playerId;
                const isHostRow = i === 0 && !player.isBot;
                const tag = player.isBot
                  ? t.waiting.cpu
                  : isHostRow
                    ? isMe
                      ? t.waiting.youHost
                      : t.waiting.host
                    : isMe
                      ? t.waiting.you
                      : t.waiting.player;
                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ delay: i * 0.06, duration: 0.22 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "6px 0",
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 999,
                        background: `linear-gradient(180deg, ${color}, color-mix(in oklab, ${color} 60%, #000))`,
                        color: "#1a1208",
                        fontFamily: "var(--font-display)",
                        fontWeight: 800,
                        fontSize: 13,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.2)",
                        flexShrink: 0,
                      }}
                    >
                      {(player.isBot ? "B" : player.name[0])?.toUpperCase()}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#f5ead0",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {player.name}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 9,
                          letterSpacing: "0.06em",
                          color,
                        }}
                      >
                        {tag}
                      </span>
                    </div>
                    {isHost && !isHostRow && onRemovePlayer && (
                      <button
                        onClick={() => onRemovePlayer(player.id)}
                        title={
                          s
                            ? t.socialist.removePlayer
                            : t.waiting.removePlayer
                        }
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          color: "rgba(255,200,200,0.7)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                          flexShrink: 0,
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Your name */}
          {onUpdateName && (
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.06)",
                paddingTop: 14,
              }}
            >
              <label
                style={{
                  display: "block",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  color: "rgba(245,234,208,0.55)",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                {t.lobby.yourName}
              </label>
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => {
                  const val = e.target.value;
                  setNameDraft(val);
                  const trimmed = val.trim();
                  if (trimmed && onUpdateName) onUpdateName(trimmed);
                }}
                maxLength={20}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#f5ead0",
                  fontFamily: "var(--font-ui)",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </div>
          )}

          {isHost ? (
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <SecondaryButton
                onClick={onAddBot}
                disabled={gameState.players.length >= 6}
                size="md"
                style={{ flex: 1 }}
              >
                + {t.waiting.addBot}
              </SecondaryButton>
              <PrimaryButton
                onClick={onStartGame}
                disabled={!canStart}
                size="md"
                style={{ flex: 1 }}
              >
                {canStart
                  ? t.waiting.startGame
                  : s
                    ? t.socialist.needPlayers
                    : t.waiting.needPlayers}
              </PrimaryButton>
            </div>
          ) : (
            <p
              style={{
                marginTop: 14,
                textAlign: "center",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.08em",
                color: "rgba(245,234,208,0.55)",
                textTransform: "uppercase",
              }}
            >
              {s
                ? t.socialist.waitingForMore
                : t.waiting.waitingForMore}
            </p>
          )}
        </div>

        {/* ── Settings panel ───────────────────────────────────── */}
        <div
          style={{
            flex: isCompact ? undefined : "0 0 320px",
            width: isCompact ? "100%" : 320,
          }}
        >
          <GameSettingsPanel
            isHost={isHost}
            settings={gameState.settings}
            onSettingsChange={onUpdateSettings}
            defaultExpanded={!isCompact}
          />
        </div>
      </motion.div>

      {/* Enlarged QR overlay */}
      <AnimatePresence>
        {qrEnlarged && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setQrEnlarged(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(12px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
              cursor: "pointer",
            }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              transition={{ duration: 0.2, ease: [0.22, 0.9, 0.32, 1] }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 56,
                  fontWeight: 800,
                  color: "#f5ead0",
                  letterSpacing: "0.1em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {gameState.id}
              </div>
              <RoomQrCode roomCode={gameState.id} size={Math.min(400, window.innerWidth - 80)} />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  letterSpacing: "0.1em",
                  color: "rgba(245,234,208,0.5)",
                  textTransform: "uppercase",
                }}
              >
                {t.waiting.scanToJoinClose}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

