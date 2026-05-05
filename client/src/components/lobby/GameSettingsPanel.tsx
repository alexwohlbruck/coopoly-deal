// GameSettingsPanel — host-controlled game-rules toggles, restyled to
// match the design system: dark inset card with cream/accent text,
// Bricolage display heading, JetBrains-Mono labels, accent-colored
// active states (no more emerald-500 from the legacy palette).

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Settings } from "lucide-react";
import { type GameSettings } from "../../types/game";

interface GameSettingsPanelProps {
  isHost: boolean;
  settings: GameSettings;
  onSettingsChange: (settings: GameSettings) => void;
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

// Custom checkbox-as-pill: replaces the default browser checkbox with
// a small framed switch matching the rest of the design.
function CheckTile({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: 36,
        height: 22,
        borderRadius: 999,
        background: checked
          ? "linear-gradient(180deg, var(--accent, #f0c14a) 0%, color-mix(in oklab, var(--accent, #f0c14a) 70%, #000) 100%)"
          : "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.08)",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "background var(--d-quick) var(--ease-out-soft)",
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 16 : 2,
          width: 16,
          height: 16,
          borderRadius: 999,
          background: checked ? "#1a1208" : "rgba(245,234,208,0.85)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(0,0,0,0.4)",
          transition: "left var(--d-quick) var(--ease-out-soft)",
        }}
      />
    </button>
  );
}

export function GameSettingsPanel({
  isHost,
  settings,
  onSettingsChange,
}: GameSettingsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
            Game Settings
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
              Host only
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
                  Max Hand Size
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
                  <span style={LABEL_STYLE}>Turn Timer</span>
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

              {/* Toggles */}
              {[
                {
                  key: "allowDuplicateSets" as const,
                  label: "Allow Duplicate Color Sets",
                  hint: "Win with multiple complete sets of the same color",
                },
                {
                  key: "wildcardFlipCountsAsMove" as const,
                  label: "Wildcard Flip Counts as Move",
                  hint: "Changing a wildcard's color uses one of your 3 moves (disables Rainbow set)",
                },
                {
                  key: "useSocialistTheme" as const,
                  label: "Commune Mode",
                  hint: "Reframe the deal: comrades, levies, and expropriation in place of players, rent, and theft.",
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
                <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Bot Speed</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["slow", "normal", "fast", "instant"] as const).map(
                    (speed) => {
                      const active = settings.botSpeed === speed;
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
                          {speed}
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
                  Only the host can change game settings
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
