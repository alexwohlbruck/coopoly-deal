import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import type { ClientPlayer, PropertySet } from "../../types/game";
import {
  CardType,
  PROPERTY_COLOR_HEX,
  PROPERTY_COLOR_LABEL,
  isSetComplete,
  SET_SIZE,
} from "../../types/game";
import { FannedCards } from "../cards/FannedCards";
import { GameCard } from "../cards/GameCard";

interface PlayerAreaProps {
  player: ClientPlayer;
  isCurrentTurn: boolean;
  isYou: boolean;
  isWaitingForAction?: boolean;
  onDropToBank?: (cardId: string) => void;
  availableHeight?: number;
}

function PropertySetDisplay({ set }: { set: PropertySet }) {
  const complete = isSetComplete(set);
  const color = PROPERTY_COLOR_HEX[set.color];

  const allCards = [
    ...set.cards,
    ...(set.house ? [set.house] : []),
    ...(set.hotel ? [set.hotel] : []),
  ];

  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0">
      <div
        className={`px-2 py-0.5 rounded text-center ${complete ? "ring-1 ring-yellow-400" : ""}`}
        style={{ backgroundColor: color }}
      >
        <p className="text-white font-bold text-[9px] sm:text-[10px]">
          {PROPERTY_COLOR_LABEL[set.color]} {set.cards.length}/
          {SET_SIZE[set.color]}
        </p>
      </div>

      {/* Use FannedCards for hover expansion */}
      <FannedCards cards={allCards} small={true} maxVisible={8} />
    </div>
  );
}

export function PlayerArea({
  player,
  isCurrentTurn,
  isYou,
  isWaitingForAction,
  onDropToBank,
  availableHeight,
}: PlayerAreaProps) {
  const bankTotal = player.bank.reduce((sum, c) => sum + c.value, 0);
  const completeSets = player.properties.filter(isSetComplete).length;
  const [isDragOver, setIsDragOver] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const setsContainerRef = useRef<HTMLDivElement>(null);
  const [contentScale, setContentScale] = useState(1);
  const [setsLayout, setSetsLayout] = useState<number[]>([]);

  const handleDragOver = (e: React.DragEvent) => {
    if (!isYou || !onDropToBank) return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isYou || !onDropToBank) return;
    e.preventDefault();
    setIsDragOver(false);
    const cardId = e.dataTransfer.getData("cardId");
    if (cardId) {
      onDropToBank(cardId);
    }
  };

  const bankCards = player.bank;
  const handBackCards =
    !isYou && player.handCount > 0
      ? Array.from({ length: player.handCount }, (_, i) => ({
          id: `back-${i}`,
          type: CardType.Money,
          value: 0,
        }))
      : [];

  // Calculate dynamic grid layout for property sets (similar to CardHand)
  // Version: 2026-02-26-v4 - Match FannedCards collapsed width
  useEffect(() => {
    if (!setsContainerRef.current || player.properties.length === 0) {
      setSetsLayout([]);
      return;
    }

    const calculateLayout = () => {
      if (!setsContainerRef.current) return;
      
      const containerWidth = setsContainerRef.current.offsetWidth * 0.98;
      const numSets = player.properties.length;
      
      // Calculate set width based on FannedCards collapsed size
      // FannedCards: cardWidth + (avgCards - 1) * collapsedSpread
      // Assuming average of 3 cards per set: 64 + (3-1) * 8 = 80px
      const cardWidth = 64;
      const collapsedSpread = 8;
      const avgCardsPerSet = 3;
      const SET_WIDTH = cardWidth + (avgCardsPerSet - 1) * collapsedSpread; // ~80px
      const GAP = 8;

      // Calculate how many columns can fit
      const maxCols = Math.floor((containerWidth + GAP) / (SET_WIDTH + GAP));
      
      // Determine max rows based on number of sets
      const maxRows = numSets <= 8 ? 2 : 3;
      
      // Use maxCols directly, don't limit by even distribution
      const actualCols = Math.max(4, Math.min(maxCols, numSets));

      // Calculate row distribution - fill rows from left to right
      const rows: number[] = [];
      let remaining = numSets;
      while (remaining > 0 && rows.length < maxRows) {
        const inThisRow = Math.min(actualCols, remaining);
        rows.push(inThisRow);
        remaining -= inThisRow;
      }
      
      // If we still have remaining items, add them to the last row
      if (remaining > 0 && rows.length > 0) {
        rows[rows.length - 1] += remaining;
      }

      setSetsLayout(rows);
    };

    calculateLayout();
    window.addEventListener('resize', calculateLayout);
    return () => window.removeEventListener('resize', calculateLayout);
  }, [player.properties.length]);

  // Scale content to fit within available height
  useEffect(() => {
    if (!contentRef.current || !availableHeight) return;

    const updateScale = () => {
      const contentHeight = contentRef.current!.scrollHeight;
      const maxHeight = availableHeight * 0.95;
      
      if (contentHeight > maxHeight) {
        const newScale = maxHeight / contentHeight;
        setContentScale(Math.max(0.4, newScale));
      } else {
        setContentScale(1);
      }
    };

    updateScale();
    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(contentRef.current);
    
    return () => resizeObserver.disconnect();
  }, [availableHeight, player.properties.length, bankCards.length, handBackCards.length]);

  return (
    <motion.div
      animate={isCurrentTurn ? { scale: 1.02 } : { scale: 1 }}
      style={{ 
        maxHeight: availableHeight ? `${availableHeight}px` : undefined,
      }}
      className={`
        rounded-xl p-3 sm:p-4 relative w-full max-w-4xl mx-auto overflow-hidden flex items-center justify-center
        ${isCurrentTurn ? "bg-white/15 ring-2 ring-yellow-400/60" : "bg-white/5"}
        ${isYou ? "border border-blue-400/40" : "border border-white/10"}
        ${isDragOver && isYou ? "ring-4 ring-blue-500/80 bg-blue-500/20" : ""}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div 
        ref={contentRef}
        style={{ 
          transform: `scale(${contentScale})`,
          transformOrigin: 'center center',
        }}
        className="w-full"
      >
        {/* Waiting indicator */}
        {isWaitingForAction && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg z-10"
            title="Waiting for player response"
          >
            <Clock className="w-4 h-4 text-white" />
          </motion.div>
        )}

        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base
            ${isCurrentTurn ? "bg-yellow-500" : "bg-emerald-600"}
            ${!player.connected ? "opacity-40" : ""}
          `}
          >
            {player.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-white font-semibold text-base truncate ${!player.connected ? "opacity-40" : ""}`}
            >
              {player.name}
              {isYou && (
                <span className="text-emerald-400 text-sm ml-1">(you)</span>
              )}
            </p>
            <div className="flex gap-3 text-xs">
              <span className="text-emerald-300">${bankTotal}M</span>
              <span className="text-yellow-300">{completeSets}/3 sets</span>
              <span className="text-gray-400">{player.handCount} cards</span>
            </div>
          </div>
        </div>

        {/* Property sets with dynamic grid layout */}
        {player.properties.length > 0 && (
          <div 
            ref={setsContainerRef}
            className="w-full mt-2"
          >
            {setsLayout.length > 0 && (
              <div className="flex flex-col items-center gap-1">
                {setsLayout.map((setsInRow, rowIndex) => {
                  const startIdx = setsLayout.slice(0, rowIndex).reduce((sum, count) => sum + count, 0);
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
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Empty placeholder to maintain alignment when no properties */}
        {player.properties.length === 0 && (
          <div className="w-full mt-2 h-[120px]" /> 
        )}

        {/* Combined bank + hand cards with fanned display - side by side */}
        {(bankCards.length > 0 ||
          handBackCards.length > 0 ||
          (isYou && onDropToBank)) && (
          <div className="mt-3 w-full flex items-center justify-center gap-3 flex-wrap">
            {/* Bank cards */}
            <div className="flex items-center">
              {bankCards.length > 0 ? (
                <FannedCards
                  cards={[...bankCards].sort((a, b) => a.value - b.value)}
                  small={true}
                  maxVisible={12}
                />
              ) : (isYou && onDropToBank) && (
                <div className="w-20 h-8 border-2 border-dashed border-gray-600 rounded-sm flex items-center justify-center">
                  <span className="text-gray-500 text-xs">Empty</span>
                </div>
              )}
            </div>

            {/* Hand preview cards */}
            {handBackCards.length > 0 && (
              <div className="flex items-center">
                <FannedCards
                  cards={handBackCards}
                  small={true}
                  showBacks={true}
                  maxVisible={12}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
