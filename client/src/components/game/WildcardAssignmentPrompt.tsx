import {
  PropertyColor,
  type Card,
  type PendingWildcardAssignment,
  type GameSettings,
} from "../../types/game";
import { PROPERTY_COLOR_HEX, getPropertyColorLabel } from "../../types/game";
import { BottomSheet } from "../common/BottomSheet";

interface WildcardAssignmentPromptProps {
  assignment: PendingWildcardAssignment;
  card: Card;
  settings: GameSettings;
  onAssign: (cardId: string, color: PropertyColor) => void;
}

export function WildcardAssignmentPrompt({
  assignment,
  settings,
  onAssign,
}: WildcardAssignmentPromptProps) {
  return (
    <BottomSheet
      isOpen={true}
      onClose={() => {}}
      title="Assign Wildcard Color"
      height="h-64"
      playSound={true}
    >
      <div className="p-4">
        <p className="text-gray-300 text-sm mb-4 text-center">
          You received a wildcard! Choose which color to assign it to:
        </p>
        <div className="grid grid-cols-2 gap-2">
          {assignment.availableColors.map((color) => {
            if (color === PropertyColor.Unassigned) {
              return (
                <button
                  key={color}
                  onClick={() => onAssign(assignment.cardId, color)}
                  className="col-span-2 py-3 rounded-lg text-white font-semibold text-sm transition-opacity hover:opacity-80 border-2 border-white/20 shadow-sm"
                  style={{
                    background:
                      "linear-gradient(to right, #8B4513, #87CEEB, #FF69B4, #FFA500, #FF0000, #FFFF00, #008000, #00008B, #000000, #A0D6B4)",
                    textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                  }}
                >
                  I'll decide later
                </button>
              );
            }
            return (
              <button
                key={color}
                onClick={() => onAssign(assignment.cardId, color)}
                className="py-3 rounded-lg text-white font-semibold text-sm transition-opacity hover:opacity-80"
                style={{ backgroundColor: PROPERTY_COLOR_HEX[color] }}
              >
                {getPropertyColorLabel(color, settings.useSocialistTheme)}
              </button>
            );
          })}
        </div>
      </div>
    </BottomSheet>
  );
}
