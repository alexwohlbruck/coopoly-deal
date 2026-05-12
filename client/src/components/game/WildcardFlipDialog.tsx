import type {
  Card,
  PropertyColor,
  ClientPlayer,
  GameSettings,
} from "../../types/game";
import {
  PROPERTY_COLOR_HEX,
  PropertyColor as PC,
  SET_SIZE,
} from "../../types/game";
import { BottomSheet } from "../common/BottomSheet";
import {
  WildcardColorOption,
  rentGainFor,
} from "./WildcardColorOption";
import { useGameStore } from "../../hooks/useGameStore";
import { useI18n } from "../../i18n";

interface WildcardFlipDialogProps {
  card: Card;
  player: ClientPlayer;
  settings: GameSettings;
  currentColor: PropertyColor;
  onFlip: (newColor: PropertyColor) => void;
  onClose: () => void;
}

export function WildcardFlipDialog({
  card,
  player,
  settings,
  currentColor,
  onFlip,
  onClose,
}: WildcardFlipDialogProps) {
  const useSocialistTheme = useGameStore((s) => s.useSocialistTheme);
  const { t } = useI18n();
  const isMultiWildcard = card.colors && card.colors.length > 2;

  const availableColors = isMultiWildcard
    ? settings.wildcardFlipCountsAsMove
      ? (() => {
          const valid = (card.colors ?? []).filter(
            (c) =>
              c !== PC.Unassigned &&
              player.properties.some(
                (s) =>
                  s.color === c &&
                  s.cards.length > 0 &&
                  s.cards.length < SET_SIZE[c],
              ),
          );
          return valid.length > 0
            ? valid
            : (card.colors ?? []).filter((c) => c !== PC.Unassigned);
        })()
      : [
          ...(card.colors ?? []).filter(
            (c) =>
              c !== PC.Unassigned &&
              player.properties.some(
                (s) =>
                  s.color === c &&
                  s.cards.length > 0 &&
                  s.cards.length < SET_SIZE[c],
              ),
          ),
          PC.Unassigned,
        ]
    : card.colors || [];

  // Determine the "best" choice — the color that yields the highest
  // rent gain. Skip if it equals the currentColor (already there) or
  // tie with currentColor (no improvement).
  const gains = availableColors
    .filter((c) => c !== PC.Unassigned)
    .map((c) => ({ color: c, gain: rentGainFor(c, player) }));
  const maxGain = gains.reduce((m, g) => Math.max(m, g.gain), 0);
  const bestColor =
    maxGain > 0
      ? gains.find(
          (g) => g.gain === maxGain && g.color !== currentColor,
        )?.color
      : undefined;

  return (
    <BottomSheet
      isOpen={true}
      onClose={onClose}
      title={t.game.changeWildcardColor}
      height="h-auto"
      playSound={true}
    >
      <p
        style={{
          color: "rgba(245,234,208,0.7)",
          fontSize: 13,
          marginBottom: 14,
        }}
      >
        {t.game.wildcardFlipInstruction}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {availableColors.map((color) => {
          if (color === PC.Unassigned) {
            // Rainbow gradient — keep the existing visual since this
            // option doesn't map to a single color's rent table.
            const wildcardColors = Object.values(PROPERTY_COLOR_HEX);
            const gradientStops = wildcardColors
              .map((c, i, arr) => {
                const startPct = (i / arr.length) * 100;
                const endPct = ((i + 1) / arr.length) * 100;
                return `${c} ${startPct}%, ${c} ${endPct}%`;
              })
              .join(", ");
            return (
              <button
                key={color}
                onClick={() => {
                  onFlip(color);
                  onClose();
                }}
                disabled={color === currentColor}
                style={{
                  gridColumn: "span 2",
                  padding: "12px 14px",
                  borderRadius: 12,
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: 14,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "#fff",
                  textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                  background: `linear-gradient(90deg, ${gradientStops})`,
                  border: "2px solid rgba(255,255,255,0.3)",
                  cursor: color === currentColor ? "not-allowed" : "pointer",
                  opacity: color === currentColor ? 0.5 : 1,
                  boxShadow: "var(--sh-object)",
                }}
              >
                {t.game.decideLater}
                {color === currentColor && (
                  <span
                    style={{
                      display: "block",
                      fontSize: 10,
                      fontWeight: 600,
                      marginTop: 2,
                      letterSpacing: "0.08em",
                      opacity: 0.85,
                    }}
                  >
                    {t.common.current}
                  </span>
                )}
              </button>
            );
          }

          return (
            <WildcardColorOption
              key={color}
              color={color}
              player={player}
              isCurrent={color === currentColor}
              isBest={color === bestColor}
              onClick={() => {
                onFlip(color);
                onClose();
              }}
              useSocialistTheme={useSocialistTheme}
            />
          );
        })}
      </div>
    </BottomSheet>
  );
}
