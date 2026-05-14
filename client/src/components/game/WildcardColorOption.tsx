// WildcardColorOption — preview-style picker tile for the wildcard
// color choice dialogs. Replaces a flat colored button with a small
// "what-if" set preview: the band's color, current count of that
// color in the player's table, and the rent ladder with the row
// where this card would land highlighted. Helps the player decide
// which color is most valuable without leaving the dialog.

import {
  PropertyColor,
  PROPERTY_COLOR_HEX,
  RENT_VALUES,
  SET_SIZE,
  getPropertyColorLabel,
  type ClientPlayer,
} from "../../types/game";
import { useI18n } from "../../i18n";

interface WildcardColorOptionProps {
  color: PropertyColor;
  /** When provided, used to look up the current set count + a "(current)" badge. */
  player?: ClientPlayer;
  /** True if this color is currently the wildcard's assigned color
   *  (Flip dialog) — shown as "Current" and disables click. */
  isCurrent?: boolean;
  /** True if this is the "best" option of the available choices —
   *  i.e. the one that gives the highest rent gain. */
  isBest?: boolean;
  /** Disables the button (e.g. complete set with allowDuplicateSets off). */
  disabled?: boolean;
  onClick?: () => void;
  useSocialistTheme?: boolean;
}

/**
 * Compute the "rent gain" if we played a wildcard into this color
 * for this player — i.e. how much the set's rent would change. Used
 * to highlight the best option.
 */
export function rentGainFor(
  color: PropertyColor,
  player: ClientPlayer,
): number {
  const set = player.properties.find((s) => s.color === color);
  const cur = set?.cards.length ?? 0;
  const rents = RENT_VALUES[color] ?? [];
  const before = cur > 0 ? (rents[cur - 1] ?? 0) : 0;
  const next = cur + 1;
  // Cap at set size — if already complete, no gain.
  if (cur >= (SET_SIZE[color] ?? rents.length)) return 0;
  const after = rents[next - 1] ?? 0;
  return after - before;
}

export function WildcardColorOption({
  color,
  player,
  isCurrent = false,
  isBest = false,
  disabled = false,
  onClick,
  useSocialistTheme = false,
}: WildcardColorOptionProps) {
  const { t } = useI18n();
  const setSize = SET_SIZE[color] ?? 3;
  const rents = RENT_VALUES[color] ?? [];
  const set = player?.properties.find((s) => s.color === color);
  const currentCount = set?.cards.length ?? 0;
  const willCompleteSet = currentCount + 1 >= setSize;
  const targetRow = Math.min(currentCount, rents.length - 1); // 0-indexed row to highlight (rent after adding)
  const bandHex = PROPERTY_COLOR_HEX[color] ?? "#888";
  const bandFg =
    color === PropertyColor.Yellow || color === PropertyColor.LightBlue
      ? "#3a2a08"
      : "#fff";

  return (
    <button
      onClick={onClick}
      disabled={disabled || isCurrent}
      style={{
        position: "relative",
        textAlign: "left",
        padding: 0,
        borderRadius: 12,
        background: "var(--card-paper)",
        color: "var(--card-ink)",
        overflow: "hidden",
        border: "none",
        cursor: disabled || isCurrent ? "not-allowed" : "pointer",
        opacity: disabled || isCurrent ? 0.55 : 1,
        boxShadow: isBest
          ? "var(--sh-object), 0 0 0 2px var(--accent, #f0c14a)"
          : "var(--sh-object), inset 0 0 0 1px rgba(0,0,0,0.08)",
        transition:
          "box-shadow var(--d-base) var(--ease-out-soft), transform var(--d-quick) var(--ease-out-soft)",
        display: "flex",
        flexDirection: "column",
        minHeight: 124,
      }}
    >
      {/* Color band header. BEST badge (when applicable) sits as the
          first item so it doesn't overlap the count chip on the right. */}
      <div
        style={{
          background: bandHex,
          color: bandFg,
          padding: "6px 10px",
          fontFamily: "var(--font-display)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 6,
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
          }}
        >
          {isBest && !isCurrent && (
            <span
              style={{
                background: "var(--accent, #f0c14a)",
                color: "#1a1208",
                fontFamily: "var(--font-mono)",
                fontSize: 8,
                letterSpacing: "0.08em",
                fontWeight: 800,
                padding: "1px 5px",
                borderRadius: 4,
                textTransform: "uppercase",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
                flexShrink: 0,
              }}
            >
              {t.common.best}
            </span>
          )}
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {getPropertyColorLabel(color, useSocialistTheme)}
          </span>
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            background: "rgba(0,0,0,0.3)",
            padding: "1px 6px",
            borderRadius: 999,
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
          }}
        >
          {currentCount}/{setSize}
        </span>
      </div>

      {/* Rent ladder */}
      <div
        className="paper-grain"
        style={{
          flex: 1,
          padding: "6px 10px 8px",
          fontVariantNumeric: "tabular-nums",
          background:
            "linear-gradient(180deg, var(--card-paper) 0%, var(--card-paper-2) 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            fontSize: 11,
          }}
        >
          {rents.map((rent, i) => {
            const isTarget = i === targetRow;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: isTarget
                    ? "color-mix(in oklab, var(--accent, #f0c14a) 22%, transparent)"
                    : undefined,
                  color: isTarget ? "var(--card-ink)" : "var(--card-ink-soft)",
                  fontWeight: isTarget ? 700 : 400,
                  borderBottom:
                    i < rents.length - 1
                      ? "1px dotted rgba(0,0,0,0.12)"
                      : "none",
                }}
              >
                <span>
                  {i + 1}
                  {i + 1 === setSize ? "★" : ""}
                </span>
                <span>${rent}M</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer status: "Add → 2/3 · +$1M" or similar */}
      <div
        style={{
          padding: "4px 10px 6px",
          fontFamily: "var(--font-mono)",
          fontSize: 9.5,
          letterSpacing: "0.08em",
          color: "var(--card-ink-soft)",
          textTransform: "uppercase",
          textAlign: "center",
          background: "color-mix(in oklab, var(--card-paper) 70%, #000)",
          borderTop: "1px solid rgba(0,0,0,0.08)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {isCurrent
          ? t.common.current
          : willCompleteSet
            ? `${t.common.completesSet} ★`
            : `${t.common.add} → ${currentCount + 1}/${setSize}`}
      </div>

    </button>
  );
}

// ────────────────────────────────────────────────────────────────────
// DecideLaterButton — "I'll decide later" button that matches the
// WildcardColorOption tile style: rainbow strip at the top, paper
// body below. Replaces the old full-rainbow-gradient buttons for
// visual consistency.
// ────────────────────────────────────────────────────────────────────

interface DecideLaterButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Shown below the label (e.g. "Current" when already unassigned). */
  subtitle?: string;
}

export function DecideLaterButton({
  label,
  onClick,
  disabled = false,
  subtitle,
}: DecideLaterButtonProps) {
  const rainbowStops = Object.values(PROPERTY_COLOR_HEX)
    .map((c, i, arr) => {
      const a = (i / arr.length) * 100;
      const b = ((i + 1) / arr.length) * 100;
      return `${c} ${a}%, ${c} ${b}%`;
    })
    .join(", ");

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        gridColumn: "span 2",
        padding: 0,
        borderRadius: 12,
        background: "var(--card-paper)",
        color: "var(--card-ink)",
        overflow: "hidden",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        boxShadow: "var(--sh-object), inset 0 0 0 1px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Rainbow strip header */}
      <div
        style={{
          background: `linear-gradient(90deg, ${rainbowStops})`,
          height: 8,
          width: "100%",
          flexShrink: 0,
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.18)",
        }}
      />
      {/* Label body */}
      <div
        className="paper-grain"
        style={{
          flex: 1,
          padding: "10px 14px",
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: 14,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          textAlign: "center",
          background:
            "linear-gradient(180deg, var(--card-paper) 0%, var(--card-paper-2) 100%)",
        }}
      >
        {label}
        {subtitle && (
          <span
            style={{
              display: "block",
              fontSize: 10,
              fontWeight: 600,
              marginTop: 2,
              letterSpacing: "0.08em",
              opacity: 0.65,
            }}
          >
            {subtitle}
          </span>
        )}
      </div>
    </button>
  );
}
