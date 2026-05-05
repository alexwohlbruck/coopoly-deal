import { useState } from "react";
import { useI18n, type Locale } from "../../i18n";
import { useGameStore } from "../../hooks/useGameStore";
import { THEME_IDS, themes, type ThemeName } from "../../theme/colors";
import { BottomSheet } from "../common/BottomSheet";
import {
  SOUND_THEMES,
  SOUND_THEME_LABEL,
  SOUND_THEME_HINT,
  useSoundSettings,
  type SoundTheme,
  useSoundManager,
} from "../../hooks/useSoundManager";
import { useHaptics } from "../../hooks/useHaptics";

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
  const soundTheme = useSoundSettings((s) => s.soundTheme);
  const setSoundTheme = useSoundSettings((s) => s.setSoundTheme);
  const hapticsEnabled = useSoundSettings((s) => s.hapticsEnabled);
  const toggleHaptics = useSoundSettings((s) => s.toggleHaptics);
  // Demo helpers — preview the sound theme + haptics when the user
  // clicks the relevant chip in settings.
  const { play } = useSoundManager();
  const { haptic } = useHaptics();

  const handleSave = () => {
    onUpdateSettings?.({ maxHandSize: handLimit });
    onClose();
  };

  const footer =
    canEdit && onUpdateSettings ? (
      <button
        onClick={handleSave}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-lg transition-colors"
      >
        {t.settings.save}
      </button>
    ) : undefined;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={t.settings.title}
      height="h-[80vh]"
      footer={footer}
    >
      <div className="space-y-6 pb-4">
        {/* Theme Selection */}
        <div>
          <label className="text-gray-300 text-sm font-medium mb-2 block">
            {t.settings.theme}
          </label>
          <div className="grid grid-cols-5 gap-2">
            {THEME_IDS.map((themeName: ThemeName) => {
              const t = themes[themeName];
              return (
                <button
                  key={themeName}
                  onClick={() => setTheme(themeName)}
                  className={`h-10 rounded-lg border-2 transition-all ${
                    theme === themeName
                      ? "border-white scale-105"
                      : "border-transparent hover:border-white/30"
                  }`}
                  style={{
                    background: `radial-gradient(120% 90% at 50% 30%, ${t.felt} 0%, ${t.felt2} 100%)`,
                    boxShadow: `inset 0 0 0 1px ${t.accent}33`,
                  }}
                  title={t.name}
                />
              );
            })}
          </div>
        </div>

        {/* Language Selection */}
        <div>
          <label className="text-gray-300 text-sm font-medium mb-2 block">
            {t.settings.language}
          </label>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>

        {/* Sound Effects + theme picker */}
        <div>
          <label className="flex items-center justify-between text-gray-300 text-sm">
            <span className="font-medium">{t.settings.soundEffects}</span>
            <button
              onClick={onToggleSfx}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                sfxEnabled ? "bg-emerald-600" : "bg-gray-600"
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  sfxEnabled ? "translate-x-6" : ""
                }`}
              />
            </button>
          </label>

          {/* Sound theme — disabled visually when sfx are off. Tap a
              chip to switch theme AND preview the new sound. */}
          <div
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
              opacity: sfxEnabled ? 1 : 0.4,
              pointerEvents: sfxEnabled ? "auto" : "none",
            }}
          >
            {SOUND_THEMES.map((id: SoundTheme) => {
              const active = soundTheme === id;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setSoundTheme(id);
                    // Preview a representative sound after the state
                    // change commits.
                    setTimeout(() => play("setComplete"), 0);
                  }}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: active
                      ? "linear-gradient(180deg, var(--accent, #f0c14a) 0%, color-mix(in oklab, var(--accent, #f0c14a) 70%, #000) 100%)"
                      : "rgba(255,255,255,0.05)",
                    border: "1px solid",
                    borderColor: active
                      ? "transparent"
                      : "rgba(255,255,255,0.08)",
                    color: active ? "#1a1208" : "rgba(245,234,208,0.78)",
                    cursor: "pointer",
                    textAlign: "left",
                    boxShadow: active
                      ? "inset 0 1px 0 rgba(255,255,255,0.4)"
                      : "none",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: 12,
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {SOUND_THEME_LABEL[id]}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      letterSpacing: "0.04em",
                      opacity: 0.85,
                      marginTop: 2,
                      lineHeight: 1.2,
                    }}
                  >
                    {SOUND_THEME_HINT[id]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Haptic feedback */}
        <div>
          <label className="flex items-center justify-between text-gray-300 text-sm">
            <span>
              <span className="font-medium">Haptic Feedback</span>
              <span
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "rgba(245,234,208,0.5)",
                  marginTop: 2,
                }}
              >
                Vibration on cards, errors, and wins (mobile only)
              </span>
            </span>
            <button
              onClick={() => {
                toggleHaptics();
                // Preview only when turning ON.
                if (!hapticsEnabled) setTimeout(() => haptic("complete"), 0);
              }}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                hapticsEnabled ? "bg-emerald-600" : "bg-gray-600"
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  hapticsEnabled ? "translate-x-6" : ""
                }`}
              />
            </button>
          </label>
        </div>

        {/* Music Controls */}
        {musicControls && (
          <div>
            <label className="flex items-center justify-between text-gray-300 text-sm">
              <span className="font-medium">{t.settings.backgroundMusic}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={musicControls.onNext}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
                >
                  Next
                </button>
                <button
                  onClick={musicControls.onToggle}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    musicControls.isPlaying ? "bg-emerald-600" : "bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      musicControls.isPlaying ? "translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>
            </label>
          </div>
        )}

        {/* Hand Limit (if editable) */}
        {canEdit && onUpdateSettings && (
          <div>
            <label className="text-gray-300 text-sm font-medium mb-2 block">
              Hand Limit
            </label>
            <input
              type="number"
              value={handLimit}
              onChange={(e) => setHandLimit(Number(e.target.value))}
              min={5}
              max={10}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
