import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n, type Locale } from "../../i18n";
import { useGameStore } from "../../hooks/useGameStore";
import type { ThemeName } from "../../theme/colors";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentHandLimit: number;
  onUpdateSettings?: (settings: { maxHandSize: number }) => void;
  canEdit: boolean;
  sfxEnabled: boolean;
  onToggleSfx: () => void;
  musicControls?: {
    isPlaying: boolean;
    onToggle: () => void;
    onNext: () => void;
  };
}

export function SettingsPanel({
  isOpen,
  onClose,
  currentHandLimit,
  onUpdateSettings,
  canEdit,
  sfxEnabled,
  onToggleSfx,
  musicControls,
}: SettingsPanelProps) {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useGameStore();
  const [handLimit, setHandLimit] = useState(currentHandLimit);

  const handleSave = () => {
    onUpdateSettings?.({ maxHandSize: handLimit });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-gray-900 rounded-2xl p-5 shadow-2xl border border-white/20 max-w-sm w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold text-lg">{t.settings.title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl"
            >
              &times;
            </button>
          </div>

          <div className="mb-4">
            <label className="text-gray-300 text-sm mb-2 block">
              Theme
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["classic", "ocean", "sunset", "forest"] as ThemeName[]).map((themeName) => (
                <button
                  key={themeName}
                  onClick={() => setTheme(themeName)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                    theme === themeName
                      ? "bg-blue-600 text-white"
                      : "bg-white/10 text-gray-300 hover:bg-white/20"
                  }`}
                >
                  {themeName}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="text-gray-300 text-sm mb-2 block">
              {t.settings.language}
            </label>
            <div className="flex gap-2">
              {(["en", "es"] as Locale[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLocale(lang)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    locale === lang
                      ? "bg-blue-600 text-white"
                      : "bg-white/10 text-gray-300 hover:bg-white/20"
                  }`}
                >
                  {lang === "en" ? "English" : "Español"}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="text-gray-300 text-sm mb-2 block">
              Sound Effects
            </label>
            <button
              onClick={onToggleSfx}
              className={`w-full px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                sfxEnabled
                  ? "bg-blue-600 text-white"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              {sfxEnabled ? "SFX ON" : "SFX OFF"}
            </button>
          </div>

          {musicControls && (
            <div className="mb-4">
              <label className="text-gray-300 text-sm mb-2 block">
                Background Music
              </label>
              <div className="flex gap-2">
                <button
                  onClick={musicControls.onToggle}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    musicControls.isPlaying
                      ? "bg-blue-600 text-white"
                      : "bg-white/10 text-gray-300 hover:bg-white/20"
                  }`}
                >
                  {musicControls.isPlaying ? "🎵 Playing" : "🔇 Paused"}
                </button>
                <button
                  onClick={musicControls.onNext}
                  className="px-4 py-2 bg-white/10 text-gray-300 hover:bg-white/20 rounded-lg text-sm font-semibold transition-colors"
                  title="Next track"
                >
                  ⏭
                </button>
              </div>
            </div>
          )}

          {canEdit && (
            <div className="mb-4">
              <label className="text-gray-300 text-sm mb-2 block">
                {t.settings.handLimit}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={handLimit}
                  onChange={(e) => setHandLimit(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-white font-bold text-sm w-8 text-center">
                  {handLimit > 19 ? "∞" : handLimit}
                </span>
              </div>
            </div>
          )}

          {canEdit && (
            <button
              onClick={handleSave}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              {t.settings.title === "Settings" ? "Save" : "Guardar"}
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
