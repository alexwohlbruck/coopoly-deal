// GameSettingsPanel — host-controlled game-rules toggles, restyled to
// match the design system: dark inset card with cream/accent text,
// Bricolage display heading, JetBrains-Mono labels, accent-colored
// active states (no more emerald-500 from the legacy palette).

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Settings } from "lucide-react";
import { type GameSettings } from "../../types/game";
import { Toggle } from "../ui/Toggle";
import { useI18n } from "../../i18n";

interface GameSettingsPanelProps {
  isHost: boolean;
  settings: GameSettings;
  onSettingsChange: (settings: GameSettings) => void;
  defaultExpanded?: boolean;
}

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "rgba(245,234,208,0.55)",
  fontWeight: 600,
};

const ROW_LABEL_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  fontWeight: 600,
  color: "#f5ead0",
  lineHeight: 1.25,
};

const ROW_HINT_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  color: "rgba(245,234,208,0.5)",
  marginTop: 2,
  lineHeight: 1.3,
};

// CheckTile is now the shared <Toggle> component from ui/Toggle.tsx.
const CheckTile = Toggle;

export function GameSettingsPanel({
  isHost,
  settings,
  onSettingsChange,
  defaultExpanded = false,
}: GameSettingsPanelProps) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const updateSetting = <K extends keyof GameSettings>(
    key: K,
    value: GameSettings[K],
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const accent = "var(--accent, #f0c14a)";

  return (
    <div
      style={{
        borderRadius: 12,
        background: "rgba(0,0,0,0.18)",
        border: "1px solid rgba(255,255,255,0.06)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: "100%",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "#f5ead0",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Settings className="w-4 h-4" style={{ color: accent }} />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: "-0.01em",
            }}
          >
            {t.gameSettings.title}
          </span>
          {!isHost && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(245,234,208,0.4)",
              }}
            >
              {t.gameSettings.hostOnly}
            </span>
          )}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" style={{ opacity: 0.7 }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ opacity: 0.7 }} />
        )}
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 0.9, 0.32, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                padding: "12px 16px 16px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Max hand size */}
              <div>
                <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>
                  {t.gameSettings.maxHandSize}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <input
                    type="range"
                    min="7"
                    max="15"
                    value={
                      settings.maxHandSize === 999 ? 15 : settings.maxHandSize
                    }
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      updateSetting("maxHandSize", val === 15 ? 999 : val);
                    }}
                    disabled={!isHost}
                    style={{
                      flex: 1,
                      accentColor: "var(--accent, #f0c14a)",
                      opacity: isHost ? 1 : 0.4,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: 14,
                      color: "#f5ead0",
                      width: 36,
                      textAlign: "center",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {settings.maxHandSize === 999 ? "∞" : settings.maxHandSize}
                  </span>
                </div>
              </div>

              {/* Turn timer */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <span style={LABEL_STYLE}>{t.gameSettings.turnTimer}</span>
                  <CheckTile
                    checked={settings.turnTimer > 0}
                    onChange={(next) =>
                      updateSetting("turnTimer", next ? 20 : 0)
                    }
                    disabled={!isHost}
                  />
                </div>
                {settings.turnTimer > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <input
                      type="range"
                      min="10"
                      max="120"
                      step="10"
                      value={settings.turnTimer}
                      onChange={(e) => {
                        updateSetting("turnTimer", parseInt(e.target.value));
                      }}
                      disabled={!isHost}
                      style={{
                        flex: 1,
                        accentColor: "var(--accent, #f0c14a)",
                        opacity: isHost ? 1 : 0.4,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: 14,
                        color: "#f5ead0",
                        width: 36,
                        textAlign: "center",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {settings.turnTimer}s
                    </span>
                  </div>
                )}
              </div>

              {/* Moves per turn */}
              <div>
                <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>
                  {t.gameSettings.movesPerTurn}
                </div>
                <div style={ROW_HINT_STYLE}>{t.gameSettings.movesPerTurnHint}</div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginTop: 6,
                  }}
                >
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={settings.movesPerTurn}
                    onChange={(e) => {
                      updateSetting("movesPerTurn", parseInt(e.target.value));
                    }}
                    disabled={!isHost}
                    style={{
                      flex: 1,
                      accentColor: "var(--accent, #f0c14a)",
                      opacity: isHost ? 1 : 0.4,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: 14,
                      color: "#f5ead0",
                      width: 36,
                      textAlign: "center",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {settings.movesPerTurn}
                  </span>
                </div>
              </div>

              {/* Sets to win */}
              <div>
                <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>
                  {t.gameSettings.setsToWin}
                </div>
                <div style={ROW_HINT_STYLE}>{t.gameSettings.setsToWinHint}</div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginTop: 6,
                  }}
                >
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={settings.setsToWin}
                    onChange={(e) => {
                      updateSetting("setsToWin", parseInt(e.target.value));
                    }}
                    disabled={!isHost}
                    style={{
                      flex: 1,
                      accentColor: "var(--accent, #f0c14a)",
                      opacity: isHost ? 1 : 0.4,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: 14,
                      color: "#f5ead0",
                      width: 36,
                      textAlign: "center",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {settings.setsToWin}
                  </span>
                </div>
              </div>

              {/* Draw cards per turn */}
              <div>
                <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>
                  {t.gameSettings.drawCardsPerTurn}
                </div>
                <div style={ROW_HINT_STYLE}>{t.gameSettings.drawCardsPerTurnHint}</div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginTop: 6,
                  }}
                >
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={settings.drawCardsPerTurn}
                    onChange={(e) => {
                      updateSetting("drawCardsPerTurn", parseInt(e.target.value));
                    }}
                    disabled={!isHost}
                    style={{
                      flex: 1,
                      accentColor: "var(--accent, #f0c14a)",
                      opacity: isHost ? 1 : 0.4,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: 14,
                      color: "#f5ead0",
                      width: 36,
                      textAlign: "center",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {settings.drawCardsPerTurn}
                  </span>
                </div>
              </div>

              {/* Toggles */}
              {[
                {
                  key: "allowDuplicateSets" as const,
                  label: t.gameSettings.allowDuplicateSets,
                  hint: t.gameSettings.allowDuplicateSetsHint,
                },
                {
                  key: "wildcardFlipCountsAsMove" as const,
                  label: t.gameSettings.wildcardFlipCountsAsMove,
                  hint: t.gameSettings.wildcardFlipHint,
                },
                {
                  key: "requireHouseBeforeHotel" as const,
                  label: t.gameSettings.requireHouseBeforeHotel,
                  hint: t.gameSettings.requireHouseBeforeHotelHint,
                },
              ].map(({ key, label, hint }) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={ROW_LABEL_STYLE}>{label}</div>
                    <div style={ROW_HINT_STYLE}>{hint}</div>
                  </div>
                  <CheckTile
                    checked={!!settings[key]}
                    onChange={(next) => updateSetting(key, next)}
                    disabled={!isHost}
                  />
                </div>
              ))}

              {/* Bot speed */}
              <div>
                <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>{t.gameSettings.botSpeed}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["slow", "normal", "fast", "instant"] as const).map(
                    (speed) => {
                      const active = settings.botSpeed === speed;
                      const speedLabels = {
                        slow: t.gameSettings.slow,
                        normal: t.gameSettings.normal,
                        fast: t.gameSettings.fast,
                        instant: t.gameSettings.instant,
                      } as const;
                      return (
                        <button
                          key={speed}
                          type="button"
                          onClick={() => updateSetting("botSpeed", speed)}
                          disabled={!isHost}
                          style={{
                            flex: 1,
                            padding: "6px 8px",
                            borderRadius: 8,
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            fontWeight: 700,
                            border: "1px solid",
                            borderColor: active
                              ? "transparent"
                              : "rgba(255,255,255,0.08)",
                            background: active
                              ? "linear-gradient(180deg, var(--accent, #f0c14a) 0%, color-mix(in oklab, var(--accent, #f0c14a) 70%, #000) 100%)"
                              : "rgba(255,255,255,0.05)",
                            color: active ? "#1a1208" : "rgba(245,234,208,0.7)",
                            cursor: isHost ? "pointer" : "not-allowed",
                            opacity: isHost ? 1 : 0.5,
                            boxShadow: active
                              ? "inset 0 1px 0 rgba(255,255,255,0.4)"
                              : "none",
                            transition:
                              "background var(--d-quick) var(--ease-out-soft)",
                          }}
                        >
                          {speedLabels[speed]}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              {!isHost && (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "rgba(245,234,208,0.4)",
                    textAlign: "center",
                    paddingTop: 8,
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  {t.gameSettings.hostOnlyNote}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
