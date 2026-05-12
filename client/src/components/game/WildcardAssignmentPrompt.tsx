import {
  PropertyColor,
  PROPERTY_COLOR_HEX,
  type Card,
  type ClientPlayer,
  type PendingWildcardAssignment,
  type GameSettings,
} from "../../types/game";
import { BottomSheet } from "../common/BottomSheet";
import {
  WildcardColorOption,
  rentGainFor,
} from "./WildcardColorOption";
import { useGameStore } from "../../hooks/useGameStore";
import { useI18n } from "../../i18n";

interface WildcardAssignmentPromptProps {
  assignment: PendingWildcardAssignment;
  card: Card;
  /** The receiving player — needed so the option tiles can show
   *  current set counts and rent gains for each color choice. */
  player: ClientPlayer;
  settings: GameSettings;
  onAssign: (cardId: string, color: PropertyColor) => void;
}

export function WildcardAssignmentPrompt({
  assignment,
  player,
  settings: _settings,
  onAssign,
}: WildcardAssignmentPromptProps) {
  const useSocialistTheme = useGameStore((s) => s.useSocialistTheme);
  const { t } = useI18n();
  // Determine the "best" choice — the color that yields the highest
  // rent gain. Skipped for the rainbow / unassigned option.
  const gains = assignment.availableColors
    .filter((c) => c !== PropertyColor.Unassigned)
    .map((c) => ({ color: c, gain: rentGainFor(c, player) }));
  const maxGain = gains.reduce((m, g) => Math.max(m, g.gain), 0);
  const bestColor =
    maxGain > 0 ? gains.find((g) => g.gain === maxGain)?.color : undefined;

  return (
    <BottomSheet
      isOpen={true}
      onClose={() => {}}
      closable={false}
      title={t.game.assignWildcardColor}
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
        {t.game.wildcardAssignInstruction}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {assignment.availableColors.map((color) => {
          if (color === PropertyColor.Unassigned) {
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
                onClick={() => onAssign(assignment.cardId, color)}
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
                  cursor: "pointer",
                  boxShadow: "var(--sh-object)",
                }}
              >
                {t.game.decideLater}
              </button>
            );
          }
          return (
            <WildcardColorOption
              key={color}
              color={color}
              player={player}
              isBest={color === bestColor}
              onClick={() => onAssign(assignment.cardId, color)}
              useSocialistTheme={useSocialistTheme}
            />
          );
        })}
      </div>
    </BottomSheet>
  );
}
