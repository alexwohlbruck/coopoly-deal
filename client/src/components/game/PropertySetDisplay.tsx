import {
  CardType,
  PropertyColor,
  PROPERTY_COLOR_HEX,
  isSetComplete,
  SET_SIZE,
  calculateRent,
  getPropertyColorLabel,
} from "../../types/game";
import type { PropertySet, Card } from "../../types/game";
import { FannedCards } from "../cards/FannedCards";

interface PropertySetDisplayProps {
  set: PropertySet;
  onWildcardClick?: (card: Card, currentColor: PropertyColor) => void;
  isYou: boolean;
  isCurrentTurn: boolean;
  isDragOver?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragStart?: (e: React.DragEvent, card: Card) => void;
  onDragEnd?: () => void;
  useSocialistTheme?: boolean;
}

export function PropertySetDisplay({
  set,
  onWildcardClick,
  isYou,
  isCurrentTurn,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  useSocialistTheme = false,
}: PropertySetDisplayProps) {
  const complete = isSetComplete(set);
  const color = PROPERTY_COLOR_HEX[set.color];

  const allCards = [
    ...set.cards,
    ...(set.house ? [set.house] : []),
    ...(set.hotel ? [set.hotel] : []),
  ];

  // Determine orientation for dual-color wildcards
  const getCardOrientation = (card: Card): "top" | "bottom" | undefined => {
    if (
      card.type !== CardType.PropertyWildcard ||
      !card.colors ||
      card.colors.length !== 2
    ) {
      return undefined;
    }
    // If the set color matches the SECOND color in the array, we want that color on bottom
    // So we return "bottom" to flip the card
    // If it matches the FIRST color, we want it on top, so return "top"
    return card.colors[1] === set.color ? "bottom" : "top";
  };

  const rent = calculateRent(set);

  return (
    <div
      className={`flex flex-col items-center gap-0.5 shrink-0 relative transition-all ${
        isDragOver ? "ring-4 ring-green-400 bg-green-400/10 rounded-lg p-1" : ""
      }`}
      data-property-drop-zone={set.color}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {set.color !== PropertyColor.Unassigned && (
        <div
          className={`px-2 py-0.5 rounded text-center flex items-center gap-2 ${complete ? "ring-1 ring-yellow-400" : ""}`}
          style={{ backgroundColor: color }}
        >
          <p className="text-white font-bold text-[9px] sm:text-[10px]">
            {getPropertyColorLabel(set.color, useSocialistTheme)}{" "}
            {set.cards.length}/{SET_SIZE[set.color]}
          </p>
          {rent > 0 && (
            <span className="text-white bg-black/30 px-1 rounded text-[8px] sm:text-[9px] font-mono">
              ${rent}M
            </span>
          )}
        </div>
      )}

      {/* Use FannedCards for hover expansion with wildcard click support */}
      <FannedCards
        cards={allCards}
        small={true}
        maxVisible={8}
        getCardOrientation={getCardOrientation}
        useSocialistTheme={useSocialistTheme}
        draggable={
          isYou && isCurrentTurn
            ? (card) => card.type === CardType.PropertyWildcard
            : undefined
        }
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onCardClick={
          isYou && isCurrentTurn && onWildcardClick
            ? (card) => {
                if (card.type === CardType.PropertyWildcard) {
                  onWildcardClick(card, set.color);
                }
              }
            : undefined
        }
      />
    </div>
  );
}
