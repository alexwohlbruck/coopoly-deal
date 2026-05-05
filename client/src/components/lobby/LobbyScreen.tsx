import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Settings } from "lucide-react";
import { MusicControls } from "../common/MusicControls";
import { GameRulesModal } from "../common/GameRulesModal";
import { SettingsPanel } from "../game/SettingsPanel";
import { useSoundSettings } from "../../hooks/useSoundManager";

import { useGameStore } from "../../hooks/useGameStore";
import { useI18n } from "../../i18n";
import { getTheme } from "../../theme/colors";
import { PrimaryButton, SecondaryButton } from "../ui/Button";

interface LobbyScreenProps {
  onCreateRoom: () => void;
  onJoinRoom: (code: string, name: string) => void;
  musicControls?: {
    isPlaying: boolean;
    onToggle: () => void;
    onNext: () => void;
  };
}

export function LobbyScreen({
  onCreateRoom,
  onJoinRoom,
  musicControls,
}: LobbyScreenProps) {
  const { t } = useI18n();
  const { playerName: savedPlayerName, theme } = useGameStore();
  const [roomCode, setRoomCode] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { sfxEnabled, toggleSfx } = useSoundSettings();
  const themeData = getTheme(theme);

  const canJoin = roomCode.length === 6;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    // Server-side will prompt for name if not set; otherwise reuse stored.
    if (canJoin) {
      onJoinRoom(roomCode.trim(), savedPlayerName || "");
    }
  };

  return (
    <div
      className={`min-h-screen min-h-dvh ${themeData.feltClass} felt-surface flex items-center justify-center p-4`}
    >
      {/* Music + settings — top right */}
      {musicControls && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-lg text-white p-2 rounded-lg transition-colors border border-white/20"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <MusicControls
            isPlaying={musicControls.isPlaying}
            onToggle={musicControls.onToggle}
            onNext={musicControls.onNext}
          />
        </div>
      )}

      {/* Rules — top left */}
      <button
        onClick={() => setShowRules(true)}
        className="fixed top-4 left-4 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-lg text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border border-white/20"
      >
        <BookOpen className="w-4 h-4" />
        <span className="font-semibold">Rules</span>
      </button>

      <GameRulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentHandLimit={7}
        canEdit={false}
        sfxEnabled={sfxEnabled}
        onToggleSfx={toggleSfx}
        musicControls={musicControls}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 0.9, 0.32, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "rgba(245,234,208,0.55)",
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            Welcome back{savedPlayerName ? `, ${savedPlayerName}` : ""}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 44,
              fontWeight: 800,
              color: "#f5ead0",
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            Co-Opoly Deal
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "rgba(245,234,208,0.65)",
              marginTop: 8,
            }}
          >
            {t.lobby.subtitle}
          </p>
        </div>

        <div
          style={{
            background:
              "linear-gradient(180deg, rgba(28,22,20,0.85) 0%, rgba(16,10,8,0.92) 100%)",
            border: "1px solid rgba(245,234,208,0.1)",
            borderRadius: 18,
            padding: 24,
            boxShadow: "var(--sh-panel)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* Create — primary CTA */}
          <PrimaryButton
            onClick={onCreateRoom}
            fullWidth
            size="lg"
          >
            {t.lobby.createRoom}
          </PrimaryButton>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.18em",
              color: "rgba(245,234,208,0.4)",
              textTransform: "uppercase",
              padding: "2px 0",
            }}
          >
            <div
              style={{
                flex: 1,
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, rgba(245,234,208,0.18), transparent)",
              }}
            />
            <span>or join</span>
            <div
              style={{
                flex: 1,
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, rgba(245,234,208,0.18), transparent)",
              }}
            />
          </div>

          {/* Inline join form: code input + Join button side-by-side */}
          <form onSubmit={handleJoin} style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, ""))}
              placeholder="Room code · 6 digits"
              maxLength={6}
              inputMode="numeric"
              style={{
                flex: 1,
                padding: "13px 14px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#f5ead0",
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                letterSpacing: "0.18em",
                outline: "none",
                textAlign: "center",
              }}
            />
            <SecondaryButton
              type="submit"
              disabled={!canJoin}
              size="lg"
              style={{ minWidth: 96 }}
            >
              {t.lobby.join}
            </SecondaryButton>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
