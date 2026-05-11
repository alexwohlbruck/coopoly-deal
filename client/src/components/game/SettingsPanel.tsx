import { useState } from "react";
import { Github } from "lucide-react";
import { useI18n, type Locale } from "../../i18n";
import { useGameStore } from "../../hooks/useGameStore";
import { THEME_IDS, themes, type ThemeName } from "../../theme/colors";
import { BottomSheet } from "../common/BottomSheet";
import {
  SOUND_THEMES,
  SOUND_THEME_LABEL,
  SOUND_THEME_HINT,
  useSoundSettings,
  previewSound,
  type SoundTheme,
} from "../../hooks/useSoundManager";
import { previewHaptic } from "../../hooks/useHaptics";
import { useModalParam } from "../../hooks/useModalParam";

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
  const { open: openModal } = useModalParam();

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
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 13,
              letterSpacing: "-0.005em",
              color: "#f5ead0",
              background:
                "linear-gradient(180deg, rgba(28,22,20,0.9) 0%, rgba(16,10,8,0.96) 100%)",
              border: "1px solid rgba(245,234,208,0.12)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
              cursor: "pointer",
              appearance: "none",
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='%23f0c14a' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 14px center",
              paddingRight: 32,
            }}
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

          {/* Sound theme — dropdown so we can list all 9 themes
              compactly. Selecting also previews a representative
              sound from that theme. Disabled when SFX is off. */}
          <div
            style={{
              marginTop: 10,
              opacity: sfxEnabled ? 1 : 0.4,
              pointerEvents: sfxEnabled ? "auto" : "none",
            }}
          >
            <select
              value={soundTheme}
              onChange={(e) => {
                const id = e.target.value as SoundTheme;
                setSoundTheme(id);
                // Preview via the non-hook path (avoids the stale
                // closure that would play the previously-selected
                // theme).
                previewSound(id, "setComplete");
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: 13,
                letterSpacing: "-0.005em",
                color: "#f5ead0",
                background:
                  "linear-gradient(180deg, rgba(28,22,20,0.9) 0%, rgba(16,10,8,0.96) 100%)",
                border: "1px solid rgba(245,234,208,0.12)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                cursor: "pointer",
                appearance: "none",
                // Caret on the right, drawn as a CSS arrow so it
                // matches the cream/accent palette better than the
                // browser default.
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='%23f0c14a' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 14px center",
                paddingRight: 32,
              }}
            >
              {SOUND_THEMES.map((id: SoundTheme) => (
                <option key={id} value={id}>
                  {SOUND_THEME_LABEL[id]}{SOUND_THEME_HINT[id] ? ` — ${SOUND_THEME_HINT[id]}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Haptic feedback */}
        <div>
          <label className="flex items-center justify-between text-gray-300 text-sm">
            <span>
              <span className="font-medium">{t.settings.haptics}</span>
            </span>
            <button
              onClick={() => {
                toggleHaptics();
                // Preview only when turning ON. previewHaptic bypasses
                // the enabled check (the hook-based haptic would
                // capture the still-false enabled value here).
                if (!hapticsEnabled) previewHaptic("complete");
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
                  {t.common.next}
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
              {t.settings.handLimit}
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

        {/* Footer action group — tip jar + Credits + Source code.
            Tighter gap than the surrounding `space-y-6` settings rows
            since these three pills read as one block of "about / where
            to find more". */}
        <div
          style={{
            marginTop: 4,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <a
            href="https://buymeacoffee.com/alexwohlbruck"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "rgba(245,234,208,0.6)",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(245,234,208,0.08)",
              textDecoration: "none",
            }}
          >
            <span aria-hidden="true">☕</span>
            <span>{t.lobby.buyMeACoffee}</span>
          </a>

          {/* Credits — opens the credits modal. Closes this panel as a
              side effect (mutually-exclusive ?modal= URL state) which
              is fine; user can close credits to return to the
              underlying screen. */}
          <button
            onClick={() => openModal("credits")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "rgba(245,234,208,0.6)",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(245,234,208,0.08)",
              cursor: "pointer",
            }}
          >
            <span aria-hidden="true">✦</span>
            <span>{t.settings.credits}</span>
          </button>

          {/* Source code link — same shape as the credits button. */}
          <a
            href="https://github.com/alexwohlbruck/coopoly-deal"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "rgba(245,234,208,0.6)",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(245,234,208,0.08)",
              textDecoration: "none",
            }}
          >
            <Github className="w-3.5 h-3.5" />
            <span>{t.common.sourceCode}</span>
          </a>
        </div>

        {/* Author credit. Same component as the lobby for consistency. */}
        <div
          style={{
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.06em",
            color: "rgba(245,234,208,0.4)",
            marginTop: -4,
          }}
        >
          {t.lobby.madeWithLoveBy.split("♥")[0]}
          <span aria-hidden="true" style={{ color: "#e26a6a" }}>
            ♥
          </span>
          {t.lobby.madeWithLoveBy.split("♥")[1]}{" "}
          <a
            href="https://alex.wohlbruck.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "rgba(245,234,208,0.7)",
              textDecoration: "none",
              borderBottom: "1px dotted rgba(245,234,208,0.3)",
            }}
          >
            Alex Wohlbruck
          </a>
        </div>
      </div>
    </BottomSheet>
  );
}
