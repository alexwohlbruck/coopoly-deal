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
            return (
              <button
                key={color}
                onClick={() => {
                  onFlip(color);
                  onClose();
                }}
                disabled={color === currentColor}
                className={`
                  col-span-2 px-4 py-3 rounded-xl font-semibold text-white transition-all border-2 border-white/20 shadow-sm
                  ${color === currentColor ? "opacity-50 cursor-not-allowed ring-2 ring-yellow-400" : "hover:scale-105 hover:shadow-lg"}
                `}
                style={{
                  background:
                    "linear-gradient(to right, #8B4513, #87CEEB, #FF69B4, #FFA500, #FF0000, #FFFF00, #008000, #00008B, #000000, #A0D6B4)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                }}
              >
                I'll decide later
                {color === currentColor && (
                  <span className="block text-xs mt-1">(Current)</span>
                )}
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
