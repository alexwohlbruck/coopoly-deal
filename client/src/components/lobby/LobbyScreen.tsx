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
  const [mode, setMode] = useState<"menu" | "join">("menu");
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState(savedPlayerName || "");
  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { sfxEnabled, toggleSfx } = useSoundSettings();
  const themeData = getTheme(theme);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim() && playerName.trim()) {
      onJoinRoom(roomCode.trim(), playerName.trim());
    }
  };

  return (
    <div
      className={`min-h-screen ${themeData.feltClass} felt-surface flex items-center justify-center p-4`}
    >
      {/* Music controls in top right */}
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

      {/* Rules button in top left */}
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
            padding: 32,
            boxShadow: "var(--sh-panel)",
            backdropFilter: "blur(8px)",
          }}
        >
          {mode === "menu" ? (
            <div className="space-y-3">
              <button
                onClick={() => {
                  onCreateRoom();
                }}
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  borderRadius: 10,
                  background:
                    "linear-gradient(180deg, var(--accent) 0%, color-mix(in oklab, var(--accent) 65%, #000) 100%)",
                  color: "#1a1208",
                  border: "none",
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 10px -2px rgba(0,0,0,0.5)",
                }}
              >
                {t.lobby.createRoom}
              </button>
              <button
                onClick={() => setMode("join")}
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  borderRadius: 10,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
                  color: "rgba(245,234,208,0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
              >
                {t.lobby.joinRoom}
              </button>
            </div>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <button
                type="button"
                onClick={() => setMode("menu")}
                className="text-emerald-300 hover:text-white text-sm transition-colors"
              >
                &larr; {t.lobby.back}
              </button>
              <div>
                <label className="block text-emerald-200 text-sm font-medium mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder={t.lobby.enterName}
                  maxLength={20}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-emerald-200 text-sm font-medium mb-1">
                  {t.waiting.roomCode}
                </label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) =>
                    setRoomCode(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder={t.lobby.enterCode}
                  maxLength={6}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-center text-2xl tracking-[0.5em] font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={roomCode.length < 6 || !playerName.trim()}
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  borderRadius: 10,
                  background:
                    roomCode.length < 6 || !playerName.trim()
                      ? "rgba(255,255,255,0.06)"
                      : "linear-gradient(180deg, var(--accent) 0%, color-mix(in oklab, var(--accent) 65%, #000) 100%)",
                  color:
                    roomCode.length < 6 || !playerName.trim()
                      ? "rgba(255,255,255,0.35)"
                      : "#1a1208",
                  border: "none",
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  cursor:
                    roomCode.length < 6 || !playerName.trim()
                      ? "not-allowed"
                      : "pointer",
                  boxShadow:
                    roomCode.length < 6 || !playerName.trim()
                      ? "none"
                      : "inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 10px -2px rgba(0,0,0,0.5)",
                }}
              >
                {t.lobby.join}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
