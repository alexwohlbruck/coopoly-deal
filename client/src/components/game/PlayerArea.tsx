import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import type { ClientPlayer, Card } from "../../types/game";
import { CardType, PropertyColor, isSetComplete } from "../../types/game";

import { type GameSettings } from "../../types/game";
import { PropertySetDisplay } from "./PropertySetDisplay";
import { EmptyPropertyDropZone } from "./EmptyPropertyDropZone";
import { FannedCards } from "../cards/FannedCards";
import { useGameStore } from "../../hooks/useGameStore";

interface PlayerAreaProps {
  player: ClientPlayer;
  isCurrentTurn: boolean;
  isYou: boolean;
  settings: GameSettings;
  isWaitingForAction?: boolean;
  onDropToBank?: (cardId: string) => void;
  onDropToProperty?: (cardId: string, color: PropertyColor) => void;
  onRearrangeProperty?: (
    cardId: string,
    color: PropertyColor,
    createNewSet?: boolean,
  ) => void;
  onDropWildcard?: (card: Card) => void;
  onDropToRainbow?: (card: Card) => void;
  onWildcardClick?: (card: Card, currentColor: PropertyColor) => void;
  draggingCard?: Card | null;
}

export function PlayerArea({
  player,
  isCurrentTurn,
  isYou,
  settings,
  isWaitingForAction,
  onDropToBank,
  onDropToProperty,
  onRearrangeProperty: _onRearrangeProperty,
  onDropWildcard,
  onDropToRainbow: _onDropToRainbow,
  onWildcardClick,
  draggingCard,
}: PlayerAreaProps) {
  const useSocialistTheme = useGameStore((s) => s.useSocialistTheme);
  const bankTotal = player.bank.reduce((sum, c) => sum + c.value, 0);

  const completeSetsList = player.properties.filter(isSetComplete);
  const completeSets = settings?.allowDuplicateSets
    ? completeSetsList.length
    : new Set(completeSetsList.map((s) => s.color)).size;

  const [isDragOverBank, setIsDragOverBank] = useState(false);
  const [dragOverSetColor] = useState<PropertyColor | null>(null);

  // Show drop zones when dragging
  const isDraggingProperty =
    draggingCard &&
    (draggingCard.type === CardType.Property ||
      draggingCard.type === CardType.PropertyWildcard);
  const showDropZones = draggingCard && isYou && isCurrentTurn;
  const showEmptyDropZone = isDraggingProperty && isYou && isCurrentTurn;

  const setsContainerRef = useRef<HTMLDivElement>(null);
  const [setsLayout, setSetsLayout] = useState<{ rows: number[]; setWidth: number }>({ rows: [], setWidth: 96 });

  const handleBankDragOver = (e: React.DragEvent) => {
    if (!isYou || !onDropToBank) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverBank(true);
  };

  const handleBankDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDragOverBank(false);
  };

  const handleBankDrop = (e: React.DragEvent) => {
    if (!isYou || !onDropToBank) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverBank(false);
    const cardId = e.dataTransfer.getData("cardId");
    if (cardId) {
      onDropToBank(cardId);
    }
  };

  const bankCards = player.bank;
  const handCards = player.hand && player.hand.length > 0 ? player.hand : [];
  const handBackCards =
    !isYou && player.handCount > 0 && handCards.length === 0
      ? Array.from({ length: player.handCount }, (_, i) => ({
          id: `back-${i}`,
          type: CardType.Money,
          value: 0,
        }))
      : [];

  // Calculate responsive layout for property sets
  useEffect(() => {
    if (!setsContainerRef.current || player.properties.length === 0) {
      setSetsLayout({ rows: [], setWidth: 96 });
      return;
    }

    const calculateLayout = () => {
      if (!setsContainerRef.current) return;

      const containerWidth = setsContainerRef.current.offsetWidth;
      const numSets = player.properties.length;

      // Determine target card width based on screen size
      let targetCardWidth: number;
      if (containerWidth < 640) {
        targetCardWidth = 64; // Mobile: smaller cards
      } else if (containerWidth < 1024) {
        targetCardWidth = 80; // Tablet
      } else {
        targetCardWidth = 96; // Desktop+
      }

      // Calculate set width (card + collapsed spread for avg 3 cards)
      const collapsedSpread = targetCardWidth * 0.125;
      const avgCardsPerSet = 3;
      const SET_WIDTH = targetCardWidth + (avgCardsPerSet - 1) * collapsedSpread;
      const GAP = 6;

      // Calculate how many sets we can fit per row
      let maxSetsPerRow: number;
      if (containerWidth < 640) {
        maxSetsPerRow = 4; // Mobile minimum
      } else if (containerWidth < 1024) {
        maxSetsPerRow = 6;
      } else if (containerWidth < 1536) {
        maxSetsPerRow = 8;
      } else {
        maxSetsPerRow = 10;
      }

      // Calculate actual columns based on available space
      const fittableCols = Math.floor((containerWidth + GAP) / (SET_WIDTH + GAP));
      const actualCols = Math.min(maxSetsPerRow, Math.max(4, fittableCols));

      // Distribute sets across rows (prefer 1-2 rows)
      const MAX_ROWS = 3;
      const rows: number[] = [];
      
      if (numSets <= actualCols) {
        rows.push(numSets);
      } else {
        const numRows = Math.min(MAX_ROWS, Math.ceil(numSets / actualCols));
        const basePerRow = Math.floor(numSets / numRows);
        const remainder = numSets % numRows;
        
        for (let i = 0; i < numRows; i++) {
          rows.push(basePerRow + (i < remainder ? 1 : 0));
        }
      }

      setSetsLayout({ rows, setWidth: targetCardWidth });
    };

    calculateLayout();
    window.addEventListener("resize", calculateLayout);
    return () => window.removeEventListener("resize", calculateLayout);
  }, [player.properties.length]);

  return (
    <motion.div
      animate={isCurrentTurn ? { scale: 1.02 } : { scale: 1 }}
      style={{
        transformOrigin: "center center",
      }}
      className={`
        rounded-xl p-2 relative w-full max-w-4xl mx-auto
        ${isCurrentTurn ? "bg-white/15 ring-2 ring-yellow-400/60" : "bg-white/5"}
        ${isYou ? "border border-blue-400/40" : "border border-white/10"}
      `}
    >
      <div className="w-full">
        {/* Waiting indicator */}
        {isWaitingForAction && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg z-10"
            title={
              useSocialistTheme
                ? "Waiting for comrade response"
                : "Waiting for player response"
            }
          >
            <Clock className="w-4 h-4 text-white" />
          </motion.div>
        )}

        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm
            ${isCurrentTurn ? "bg-yellow-500" : "bg-emerald-600"}
            ${!player.connected ? "opacity-40" : ""}
          `}
          >
            {player.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <span
              className={`text-white font-semibold text-sm truncate ${!player.connected ? "opacity-40" : ""}`}
            >
              {player.name}
              {isYou && (
                <span className="text-emerald-400 text-xs ml-1">(you)</span>
              )}
            </span>
            <span className="text-emerald-300 text-xs font-mono">
              ${bankTotal}M
            </span>
            <span className="text-yellow-300 text-xs">{completeSets}/3</span>
            <span className="text-gray-400 text-xs">{player.handCount} cards</span>
          </div>
        </div>

        {/* Property sets */}
        <div ref={setsContainerRef} className="w-full">
          {player.properties.length > 0 && setsLayout.rows.length > 0 && (
            <div className="flex flex-col items-center gap-1.5">
              {setsLayout.rows.map((setsInRow, rowIndex) => {
                const startIdx = setsLayout.rows
                  .slice(0, rowIndex)
                  .reduce((sum, count) => sum + count, 0);
                const endIdx = startIdx + setsInRow;
                const rowSets = player.properties.slice(startIdx, endIdx);

                return (
                  <div
                    key={`set-row-${rowIndex}`}
                    className="flex items-start justify-center gap-1.5"
                  >
                    {rowSets.map((set, i) => (
                      <PropertySetDisplay
                        key={`${set.color}-${startIdx + i}`}
                        set={set}
                        onWildcardClick={onWildcardClick}
                        isYou={isYou}
                        isCurrentTurn={isCurrentTurn}
                        isDragOver={dragOverSetColor === set.color}
                        useSocialistTheme={useSocialistTheme}
                        cardWidth={setsLayout.setWidth}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty drop zone - only show when dragging property */}
          {showEmptyDropZone && onDropToProperty && (
            <EmptyPropertyDropZone
              onDrop={onDropToProperty}
              onDropWildcard={onDropWildcard}
              existingColors={player.properties.map((s) => s.color)}
              settings={settings}
            />
          )}
        </div>

        {/* Bank + hand - smaller stacks, only show when dragging or has cards */}
        {(bankCards.length > 0 || (!isYou && handBackCards.length > 0) || showDropZones) && (
          <div className="flex items-start justify-center gap-1.5 mt-1.5">
            {/* Bank */}
            {(bankCards.length > 0 || (showDropZones && isYou && onDropToBank)) && (
              <div
                className={`flex items-center relative transition-all ${
                  isDragOverBank
                    ? "ring-4 ring-blue-400 bg-blue-400/10 rounded-lg p-1"
                    : showDropZones
                      ? "ring-2 ring-blue-400/50 ring-dashed rounded-lg p-0.5"
                      : ""
                }`}
                onDragOver={onDropToBank ? handleBankDragOver : undefined}
                onDragLeave={onDropToBank ? handleBankDragLeave : undefined}
                onDrop={onDropToBank ? handleBankDrop : undefined}
              >
                {bankCards.length > 0 ? (
                  <FannedCards
                    cards={[...bankCards].sort((a, b) => a.value - b.value)}
                    cardWidth={64} // Bank cards - readable but not dominant
                    maxVisible={10}
                    useSocialistTheme={useSocialistTheme}
                  />
                ) : (
                  <div
                    className={`w-16 h-24 border-2 border-dashed rounded flex items-center justify-center transition-colors ${
                      showDropZones
                        ? "border-blue-400 bg-blue-400/10"
                        : "border-gray-600"
                    }`}
                  >
                    <span
                      className={`text-xs ${showDropZones ? "text-blue-300" : "text-gray-500"}`}
                    >
                      Bank
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Hand preview for other players only */}
            {!isYou && handBackCards.length > 0 && (
              <div className="flex items-center">
                <FannedCards
                  cards={handBackCards}
                  cardWidth={64} // Hand preview - same size as bank
                  showBacks={handCards.length === 0}
                  maxVisible={10}
                  useSocialistTheme={useSocialistTheme}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
