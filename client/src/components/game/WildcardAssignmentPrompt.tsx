import type { Card, PropertyColor, PendingWildcardAssignment } from "../../types/game";
import { PROPERTY_COLOR_HEX, PROPERTY_COLOR_LABEL } from "../../types/game";
import { BottomSheet } from "../common/BottomSheet";

interface WildcardAssignmentPromptProps {
  assignment: PendingWildcardAssignment;
  card: Card;
  onAssign: (cardId: string, color: PropertyColor) => void;
}

export function WildcardAssignmentPrompt({
  assignment,
  onAssign,
}: WildcardAssignmentPromptProps) {
  return (
    <BottomSheet isOpen={true} onClose={() => {}} title="Assign Wildcard Color" height="h-64">
      <div className="p-4">
        <p className="text-gray-300 text-sm mb-4 text-center">
          You received a wildcard! Choose which color to assign it to:
        </p>
        <div className="grid grid-cols-2 gap-2">
          {assignment.availableColors.map((color) => (
            <button
              key={color}
              onClick={() => onAssign(assignment.cardId, color)}
              className="py-3 rounded-lg text-white font-semibold text-sm transition-opacity hover:opacity-80"
              style={{ backgroundColor: PROPERTY_COLOR_HEX[color] }}
            >
              {PROPERTY_COLOR_LABEL[color]}
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}
