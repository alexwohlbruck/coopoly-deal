// PlayerBoard — slim presentation of a player's table:
//   header line (name + stats / subtitle)
//   PropertySetsRow with the bank as the first cell
//
// Used inside both ActiveOpponentTable (read-only) and YourTable (interactive).
// Replaces re-using <PlayerArea> for these slots, which carried the old
// hand+bank+stats chrome we don't want here.

import { useState, useCallback } from "react";
import type {
  ClientPlayer,
  Card,
  PropertyColor,
  GameSettings,
} from "../../../types/game";
import { isSetComplete, CardType } from "../../../types/game";
import { PropertySetsRow } from "./TableObjects";
import type { TouchDropSpec } from "../../../utils/drop-zone";

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
  onRearrangeProperty?: (
    cardId: string,
    toColor: PropertyColor,
    createNewSet?: boolean,
  ) => void;
  /** Fired when wildcard drag starts/ends (for parent to track draggingCard). */
  onDragActiveChange?: (isDragging: boolean, card: Card | null) => void;
  /** When true, sets render at the compact (smaller) scale. */
  compact?: boolean;
  /** When true, allow the row to wrap to multiple lines if it overflows.
   *  Defaults to false (single row, parent scrolls horizontally). */
  wrap?: boolean;
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
  onRearrangeProperty,
  onDragActiveChange,
  compact = false,
  wrap = false,
}: PlayerBoardProps) {
  const [dragOverColor, setDragOverColor] = useState<PropertyColor | null>(
    null,
  );
  const [isDragOverBank, setIsDragOverBank] = useState(false);

  const bankCards = player.bank;

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
    const sourceColor = e.dataTransfer.getData("sourceColor");
    if (!cardId) return;

    // If the card was dragged from an existing property set (sourceColor
    // is present), this is a rearrange rather than a new play from hand.
    if (sourceColor && onRearrangeProperty) {
      onRearrangeProperty(cardId, color);
      return;
    }

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

  // ── Pointer-based wildcard rearrangement ────────────────────────
  // When a wildcard is dragged from one property set to a drop zone,
  // dispatch the appropriate action.
  const handleWildcardDrop = useCallback(
    (card: Card, _sourceColor: PropertyColor, targetSpec: TouchDropSpec) => {
      if (targetSpec.kind === "set" && onRearrangeProperty) {
        onRearrangeProperty(card.id, targetSpec.color as PropertyColor);
      }
      // "bank" and "new-set" targets are ignored for wildcard rearrangement —
      // use the tap → dialog flow for those less common operations.
    },
    [onRearrangeProperty],
  );

  // Bank cell drop overlay (we wrap PropertySetsRow's first cell with handlers
  // via a DOM listener — easier here is to just put a layered drop zone over
  // the whole row when dragging money. For now we attach to the row root.)
  const isDraggingMoney =
    draggingCard?.type === CardType.Money ||
    (draggingCard?.type !== CardType.Property &&
      draggingCard?.type !== CardType.PropertyWildcard &&
      draggingCard != null);

  return (
    <div
      onDragOver={isDraggingMoney ? handleBankDragOver : undefined}
      onDragLeave={isDraggingMoney ? handleBankDragLeave : undefined}
      onDrop={isDraggingMoney ? handleBankDrop : undefined}
      style={{
        borderRadius: 8,
        boxShadow: isDragOverBank ? "0 0 0 2px #7adb88" : undefined,
        transition: "box-shadow var(--d-quick) var(--ease-out-soft)",
      }}
    >
      <PropertySetsRow
        sets={player.properties}
        bank={bankCards}
        align="center"
        compact={compact}
        wrap={wrap}
        isYou={isYou}
        isCurrentTurn={isCurrentTurn}
        useSocialistTheme={settings.useSocialistTheme}
        onSetDragOver={handleSetDragOver}
        onSetDragLeave={handleSetDragLeave}
        onSetDrop={handleSetDrop}
        onWildcardClick={onWildcardClick}
        onWildcardDrop={handleWildcardDrop}
        onDragActiveChange={onDragActiveChange}
        dragOverColor={dragOverColor}
        touchDropEnabled={canDropProp || canDropBank}
        // Show the "+ NEW" drop slot only while a drag is in flight
        // so it doesn't clutter the row at rest.
        isDragInProgress={!!draggingCard}
      />
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
