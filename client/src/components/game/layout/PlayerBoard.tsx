// PlayerBoard — slim presentation of a player's table:
//   header line (name + stats / subtitle)
//   PropertySetsRow with the bank as the first cell
//
// Used inside both ActiveOpponentTable (read-only) and YourTable (interactive).
// Replaces re-using <PlayerArea> for these slots, which carried the old
// hand+bank+stats chrome we don't want here.

import { useState } from "react";
import type {
  ClientPlayer,
  Card,
  PropertyColor,
  GameSettings,
} from "../../../types/game";
import { isSetComplete, CardType } from "../../../types/game";
import { PropertySetsRow } from "./TableObjects";

interface PlayerBoardProps {
  player: ClientPlayer;
  isYou: boolean;
  isCurrentTurn: boolean;
  settings: GameSettings;
  draggingCard?: Card | null;
  onDropToBank?: (cardId: string) => void;
  onDropToProperty?: (cardId: string, color: PropertyColor) => void;
  onDropToRainbow?: (card: Card) => void;
  onWildcardClick?: (card: Card, currentColor: PropertyColor) => void;
  onCardDragStart?: (e: React.DragEvent, card: Card) => void;
  onCardDragEnd?: () => void;
  /** When true, sets render at the compact (smaller) scale. */
  compact?: boolean;
  /** Available width for the property/bank row. */
  maxWidth?: number;
  /** Cap height; row will multi-row + scroll inside if it overflows. */
  maxHeight?: number | null;
}

export function PlayerBoard({
  player,
  isYou,
  isCurrentTurn,
  settings,
  draggingCard,
  onDropToBank,
  onDropToProperty,
  onDropToRainbow,
  onWildcardClick,
  onCardDragStart,
  onCardDragEnd,
  compact = false,
  maxWidth = 800,
  maxHeight = null,
}: PlayerBoardProps) {
  const [dragOverColor, setDragOverColor] = useState<PropertyColor | null>(
    null,
  );
  const [isDragOverBank, setIsDragOverBank] = useState(false);

  const bankValues = player.bank.map((c) => c.value);

  // Drop handlers — only wired for "you" + onDrop*-handlers provided.
  const canDropProp = isYou && isCurrentTurn && !!onDropToProperty;
  const canDropBank = isYou && isCurrentTurn && !!onDropToBank;

  const handleSetDragOver = (color: PropertyColor, e: React.DragEvent) => {
    if (!canDropProp) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverColor(color);
  };
  const handleSetDragLeave = () => setDragOverColor(null);
  const handleSetDrop = (color: PropertyColor, e: React.DragEvent) => {
    if (!canDropProp) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverColor(null);
    const cardId = e.dataTransfer.getData("cardId");
    const cardData = e.dataTransfer.getData("cardData");
    if (!cardId) return;
    let card: Card | null = null;
    try {
      card = cardData ? (JSON.parse(cardData) as Card) : null;
    } catch {
      // ignore
    }
    // Rainbow → goes via onDropToRainbow when target is unassigned/wild rainbow
    if (color === "unassigned" && card && onDropToRainbow) {
      onDropToRainbow(card);
      return;
    }
    onDropToProperty?.(cardId, color);
  };

  const handleBankDragOver = (e: React.DragEvent) => {
    if (!canDropBank) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverBank(true);
  };
  const handleBankDragLeave = () => setIsDragOverBank(false);
  const handleBankDrop = (e: React.DragEvent) => {
    if (!canDropBank) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverBank(false);
    const cardId = e.dataTransfer.getData("cardId");
    if (cardId) onDropToBank?.(cardId);
  };

  // Bank cell drop overlay (we wrap PropertySetsRow's first cell with handlers
  // via a DOM listener — easier here is to just put a layered drop zone over
  // the whole row when dragging money. For now we attach to the row root.)
  const isDraggingMoney =
    draggingCard?.type === CardType.Money ||
    (draggingCard?.type !== CardType.Property &&
      draggingCard?.type !== CardType.PropertyWildcard &&
      draggingCard != null);

  return (
    <div style={{ width: "100%" }}>
      <div
        onDragOver={isDraggingMoney ? handleBankDragOver : undefined}
        onDragLeave={isDraggingMoney ? handleBankDragLeave : undefined}
        onDrop={isDraggingMoney ? handleBankDrop : undefined}
        style={{
          width: "100%",
          borderRadius: 8,
          padding: 0,
          boxShadow: isDragOverBank
            ? "0 0 0 2px #7adb88"
            : undefined,
          transition: "box-shadow var(--d-quick) var(--ease-out-soft)",
        }}
      >
        <PropertySetsRow
          sets={player.properties}
          bank={bankValues}
          maxWidth={maxWidth}
          maxHeight={maxHeight}
          align="center"
          compact={compact}
          isYou={isYou}
          isCurrentTurn={isCurrentTurn}
          useSocialistTheme={settings.useSocialistTheme}
          onSetDragOver={handleSetDragOver}
          onSetDragLeave={handleSetDragLeave}
          onSetDrop={handleSetDrop}
          onWildcardClick={onWildcardClick}
          onCardDragStart={onCardDragStart}
          onCardDragEnd={onCardDragEnd}
          dragOverColor={dragOverColor}
        />
      </div>
    </div>
  );
}

/**
 * Compute a player's "complete sets" count, respecting the allowDuplicateSets
 * setting. Used by board headers.
 */
export function completeSetsCount(
  player: ClientPlayer,
  allowDuplicateSets: boolean,
): number {
  const completes = player.properties.filter(isSetComplete);
  if (allowDuplicateSets) return completes.length;
  return new Set(completes.map((s) => s.color)).size;
}
