import { useState } from "react";
import { Github } from "lucide-react";
import { useI18n, type Locale } from "../../i18n";
import { useGameStore, isMonopolyDealDomain } from "../../hooks/useGameStore";
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
import { Toggle } from "../ui/Toggle";
import { GoldStar } from "../ui/GoldStar";

// ─── Shared inline styles ──────────────────────────────────────────

const ROW_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const ROW_LABEL_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  fontWeight: 600,
  color: "#f5ead0",
};

const SECTION_LABEL_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  fontWeight: 600,
  color: "rgba(245,234,208,0.7)",
  marginBottom: 8,
  display: "block",
};

const SELECT_STYLE: React.CSSProperties = {
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
  appearance: "none" as const,
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='%23f0c14a' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 14px center",
  paddingRight: 32,
};

const PILL_LINK_STYLE: React.CSSProperties = {
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
  cursor: "pointer",
};

// ────────────────────────────────────────────────────────────────────

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
  const { theme, setTheme, useSocialistTheme, setUseSocialistTheme } = useGameStore();
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
      <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 16 }}>
        {/* Theme Selection */}
        <div>
          <span style={SECTION_LABEL_STYLE}>{t.settings.theme}</span>
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

          {/* Co-Opoly Deal mode — inline with theme swatches */}
          {!isMonopolyDealDomain && (
            <div style={{ ...ROW_STYLE, marginTop: 12 }}>
              <span style={{ ...ROW_LABEL_STYLE, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}><GoldStar size={13} /> Co-Opoly Deal</span>
              <Toggle
                checked={useSocialistTheme}
                onChange={(next) => setUseSocialistTheme(next)}
              />
            </div>
          )}
        </div>

        {/* Language Selection */}
        <div>
          <span style={SECTION_LABEL_STYLE}>{t.settings.language}</span>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            style={SELECT_STYLE}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>

        {/* Sound Effects + theme picker */}
        <div>
          <div style={ROW_STYLE}>
            <span style={ROW_LABEL_STYLE}>{t.settings.soundEffects}</span>
            <Toggle checked={sfxEnabled} onChange={onToggleSfx} />
          </div>

          {/* Sound theme dropdown — disabled when SFX is off */}
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
                previewSound(id, "setComplete");
              }}
              style={SELECT_STYLE}
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
        <div style={ROW_STYLE}>
          <span style={ROW_LABEL_STYLE}>{t.settings.haptics}</span>
          <Toggle
            checked={hapticsEnabled}
            onChange={() => {
              toggleHaptics();
              if (!hapticsEnabled) previewHaptic("complete");
            }}
          />
        </div>

        {/* Music Controls */}
        {musicControls && (
          <div style={ROW_STYLE}>
            <span style={ROW_LABEL_STYLE}>{t.settings.backgroundMusic}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={musicControls.onNext}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(245,234,208,0.7)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer",
                }}
              >
                {t.common.next}
              </button>
              <Toggle
                checked={musicControls.isPlaying}
                onChange={musicControls.onToggle}
              />
            </div>
          </div>
        )}

        {/* Hand Limit (if editable) */}
        {canEdit && onUpdateSettings && (
          <div>
            <span style={SECTION_LABEL_STYLE}>{t.settings.handLimit}</span>
            <input
              type="number"
              value={handLimit}
              onChange={(e) => setHandLimit(Number(e.target.value))}
              min={5}
              max={10}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "#f5ead0",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(245,234,208,0.12)",
              }}
            />
          </div>
        )}

        {/* Footer action group — tip jar + Credits + Source code */}
        <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 8 }}>
          <a
            href="https://buymeacoffee.com/alexwohlbruck"
            target="_blank"
            rel="noopener noreferrer"
            style={PILL_LINK_STYLE}
          >
            <span aria-hidden="true">☕</span>
            <span>{t.lobby.buyMeACoffee}</span>
          </a>

          <button onClick={() => openModal("credits")} style={PILL_LINK_STYLE}>
            <span aria-hidden="true">✦</span>
            <span>{t.settings.credits}</span>
          </button>

          <a
            href="https://github.com/alexwohlbruck/coopoly-deal"
            target="_blank"
            rel="noopener noreferrer"
            style={PILL_LINK_STYLE}
          >
            <Github className="w-3.5 h-3.5" />
            <span>{t.common.sourceCode}</span>
          </a>
        </div>

        {/* Author credit */}
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
          <span aria-hidden="true" style={{ color: "#e26a6a" }}>♥</span>
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
