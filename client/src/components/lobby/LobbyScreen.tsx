import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Settings } from "lucide-react";
import { MusicControls } from "../common/MusicControls";
import { GameRulesModal } from "../common/GameRulesModal";
import { SettingsPanel } from "../game/SettingsPanel";
import { useSoundSettings } from "../../hooks/useSoundManager";

import { useGameStore } from "../../hooks/useGameStore";
import { useI18n } from "../../i18n";

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
  const { playerName: savedPlayerName } = useGameStore();
  const [mode, setMode] = useState<"menu" | "join">("menu");
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState(savedPlayerName || "");
  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { sfxEnabled, toggleSfx } = useSoundSettings();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim() && playerName.trim()) {
      onJoinRoom(roomCode.trim(), playerName.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-800 to-emerald-950 flex items-center justify-center p-4">
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
          <h1 className="text-5xl font-black text-white tracking-tight mb-2">
            {t.lobby.title.split(" ")[0]}
          </h1>
          <h2 className="text-2xl font-bold text-emerald-300">
            {t.lobby.title.split(" ")[1]}
          </h2>
          <p className="text-emerald-400 mt-2 text-sm">{t.lobby.subtitle}</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          {mode === "menu" ? (
            <div className="space-y-4">
              <button
                onClick={() => {
                  onCreateRoom();
                }}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-lg transition-colors shadow-lg"
              >
                {t.lobby.createRoom}
              </button>
              <button
                onClick={() => setMode("join")}
                className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-lg transition-colors shadow-lg"
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
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-bold rounded-xl text-lg transition-colors shadow-lg"
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
