// PlayerBoard — slim presentation of a player's table:
//   header line (name + stats / subtitle)
//   PropertySetsRow with the bank as the first cell
//
// Used inside both ActiveOpponentTable (read-only) and YourTable (interactive).
// Replaces re-using <PlayerArea> for these slots, which carried the old
// hand+bank+stats chrome we don't want here.

import { useCallback } from "react";
import type {
  ClientPlayer,
  Card,
  PropertyColor,
  GameSettings,
} from "../../../types/game";
import { isSetComplete } from "../../../types/game";
import { PropertySetsRow } from "./TableObjects";
import type { TouchDropSpec } from "../../../utils/drop-zone";
import { useGameStore } from "../../../hooks/useGameStore";

interface PlayerBoardProps {
  player: ClientPlayer;
  isYou: boolean;
  isCurrentTurn: boolean;
  settings: GameSettings;
  draggingCard?: Card | null;
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
  settings: _settings,
  draggingCard,
  onWildcardClick,
  onRearrangeProperty,
  onDragActiveChange,
  compact = false,
  wrap = false,
}: PlayerBoardProps) {
  const useSocialistTheme = useGameStore((s) => s.useSocialistTheme);

  const bankCards = player.bank;

  // Drop handlers — only wired for "you" + relevant handlers provided.
  const canDropProp = isYou && isCurrentTurn;
  const canDropBank = isYou && isCurrentTurn;

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

  return (
    <div>
      <PropertySetsRow
        sets={player.properties}
        bank={bankCards}
        align="center"
        compact={compact}
        wrap={wrap}
        isYou={isYou}
        isCurrentTurn={isCurrentTurn}
        useSocialistTheme={useSocialistTheme}
        onWildcardClick={onWildcardClick}
        onWildcardDrop={handleWildcardDrop}
        onDragActiveChange={onDragActiveChange}
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
