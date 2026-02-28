import { useState } from "react";
import { CardType, PropertyColor } from "../../types/game";
import type { Card } from "../../types/game";
import { type GameSettings } from "../../types/game";

interface EmptyPropertyDropZoneProps {
  onDrop: (cardId: string, color: PropertyColor) => void;
  onDropWildcard?: (card: Card) => void;
  onRearrangeProperty?: (
    cardId: string,
    color: PropertyColor,
    createNewSet?: boolean,
  ) => void;
  existingColors: PropertyColor[];
  settings?: GameSettings;
}

export function EmptyPropertyDropZone({
  onDrop,
  onDropWildcard,
  onRearrangeProperty,
  existingColors,
  settings,
}: EmptyPropertyDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    const cardData = e.dataTransfer.getData("cardData");
    if (!cardData) return;

    try {
      const card = JSON.parse(cardData);

      // Only allow property and wildcard cards
      if (
        card.type !== CardType.Property &&
        card.type !== CardType.PropertyWildcard
      ) {
        return;
      }

      // For properties, check if color already exists
      if (card.type === CardType.Property) {
        const cardColor = card.colors?.[0];
        if (cardColor && existingColors.includes(cardColor)) {
          return; // Color already exists
        }
      }

      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setIsDragOver(true);
    } catch {
      return;
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const cardId = e.dataTransfer.getData("cardId");
    const cardData = e.dataTransfer.getData("cardData");
    const sourceColor = e.dataTransfer.getData("sourceColor");

    if (!cardId || !cardData) return;

    try {
      const card = JSON.parse(cardData);

      // Only allow property and wildcard cards
      if (
        card.type !== CardType.Property &&
        card.type !== CardType.PropertyWildcard
      ) {
        return;
      }

      // Infer color from card
      let color: PropertyColor;

      if (card.type === CardType.Property) {
        // Regular property - use its fixed color
        color = card.colors?.[0] as PropertyColor;
        if (!color || existingColors.includes(color)) {
          return;
        }
      } else {
        // Wildcard
        if (
          card.colors &&
          card.colors.length > 2 &&
          !settings?.wildcardFlipCountsAsMove
        ) {
          // Rainbow wildcard automatically gets unassigned when dropped to empty zone
          color = PropertyColor.Unassigned;
        } else {
          // Dual wildcard or rainbow when flip counts as move - trigger the dialog
          if (onDropWildcard) {
            onDropWildcard(card);
            return;
          }
          color = card.colors?.[0] as PropertyColor;
        }
      }

      if (sourceColor && onRearrangeProperty) {
        onRearrangeProperty(cardId, color, true);
      } else {
        onDrop(cardId, color);
      }
    } catch {
      return;
    }
  };

  return (
    <div
      className="mt-2 flex items-center justify-center"
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      data-property-drop-zone="new"
    >
      <div
        className={`w-32 h-20 rounded-lg border-2 border-dashed flex items-center justify-center transition-all ${
          isDragOver
            ? "border-green-400 bg-green-400/20 scale-105"
            : "border-gray-600 hover:border-gray-500"
        }`}
      >
        <span className="text-gray-400 text-xs text-center">New set</span>
      </div>
    </div>
  );
}
