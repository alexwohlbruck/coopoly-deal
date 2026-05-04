import type {
  Card,
  PropertyColor,
  ClientPlayer,
  GameSettings,
} from "../../types/game";
import {
  PROPERTY_COLOR_HEX,
  getPropertyColorLabel,
  PropertyColor as PC,
  SET_SIZE,
} from "../../types/game";
import { BottomSheet } from "../common/BottomSheet";

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

  return (
    <BottomSheet
      isOpen={true}
      onClose={onClose}
      title="Change Wildcard Color"
      height="h-auto"
      playSound={true}
    >
      <p className="text-gray-300 text-sm mb-4">
        Select a new color for this wildcard property:
      </p>

      <div className="grid grid-cols-2 gap-3">
        {availableColors.map((color) => {
          if (color === PC.Unassigned) {
            // Rainbow gradient matching the wildcard property colors
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
                className={`
                  col-span-2 px-4 py-3 rounded-xl font-bold text-white transition-all border-2 border-white/30 shadow-lg relative overflow-hidden
                  ${color === currentColor ? "opacity-50 cursor-not-allowed ring-2 ring-yellow-400" : "hover:scale-105 hover:shadow-xl"}
                `}
                style={{
                  background: `linear-gradient(90deg, ${gradientStops})`,
                  textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                }}
              >
                <span className="relative z-10">
                  I'll decide later
                  {color === currentColor && (
                    <span className="block text-xs mt-1 font-normal">(Current)</span>
                  )}
                </span>
              </button>
            );
          }

          return (
            <button
              key={color}
              onClick={() => {
                onFlip(color);
                onClose();
              }}
              disabled={color === currentColor}
              className={`
                px-4 py-3 rounded-xl font-semibold text-white transition-all
                ${color === currentColor ? "opacity-50 cursor-not-allowed ring-2 ring-yellow-400" : "hover:scale-105 hover:shadow-lg"}
              `}
              style={{ backgroundColor: PROPERTY_COLOR_HEX[color] }}
            >
              {getPropertyColorLabel(color, settings.useSocialistTheme)}
              {color === currentColor && (
                <span className="block text-xs mt-1">(Current)</span>
              )}
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
