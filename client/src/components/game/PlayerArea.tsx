import { useState } from "react";
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

interface PlayerAreaProps {
  player: ClientPlayer;
  isCurrentTurn: boolean;
  isYou: boolean;
  compact?: boolean;
  isWaitingForAction?: boolean;
  onDropToBank?: (cardId: string) => void;
}

function PropertySetDisplay({ set }: { set: PropertySet }) {
  const complete = isSetComplete(set);
  const color = PROPERTY_COLOR_HEX[set.color];
  
  // Combine all cards including house/hotel
  const allCards = [
    ...set.cards,
    ...(set.house ? [set.house] : []),
    ...(set.hotel ? [set.hotel] : []),
  ];

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Header badge */}
      <div
        className={`px-2 py-0.5 rounded text-center ${complete ? "ring-2 ring-yellow-400" : ""}`}
        style={{ backgroundColor: color }}
      >
        <p className="text-white font-bold text-[8px]">
          {PROPERTY_COLOR_LABEL[set.color]} {set.cards.length}/{SET_SIZE[set.color]}
        </p>
      </div>

      {/* Fanned actual cards */}
      <FannedCards 
        cards={allCards}
        small={true}
        maxVisible={6}
      />
    </div>
  );
}

export function PlayerArea({ player, isCurrentTurn, isYou, compact, isWaitingForAction, onDropToBank }: PlayerAreaProps) {
  const bankTotal = player.bank.reduce((sum, c) => sum + c.value, 0);
  const completeSets = player.properties.filter(isSetComplete).length;
  const [isDragOver, setIsDragOver] = useState(false);

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

  return (
    <motion.div
      animate={isCurrentTurn ? { scale: 1.02 } : { scale: 1 }}
      className={`
        rounded-xl p-3 sm:p-4 relative
        ${isCurrentTurn ? "bg-white/15 ring-2 ring-yellow-400/60" : "bg-white/5"}
        ${isYou ? "border border-blue-400/40" : "border border-white/10"}
        ${compact ? "w-64 sm:w-72" : "w-80 sm:w-96"}
        ${isDragOver && isYou ? "ring-4 ring-blue-500/80 bg-blue-500/20" : ""}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
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
      
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm
          ${isCurrentTurn ? "bg-yellow-500" : "bg-emerald-600"}
          ${!player.connected ? "opacity-40" : ""}
        `}
        >
          {player.name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-white font-semibold text-base truncate ${!player.connected ? "opacity-40" : ""}`}>
            {player.name}
            {isYou && <span className="text-emerald-400 text-sm ml-1">(you)</span>}
          </p>
          <div className="flex gap-3 text-xs">
            <span className="text-emerald-300">${bankTotal}M</span>
            <span className="text-yellow-300">{completeSets}/3 sets</span>
            <span className="text-gray-400">{player.handCount} cards</span>
          </div>
        </div>
      </div>

      {/* Property sets in grid - responsive columns */}
      {player.properties.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mt-3">
          {player.properties.map((set, i) => (
            <PropertySetDisplay key={`${set.color}-${i}`} set={set} />
          ))}
        </div>
      )}

      {/* Bank section - fanned actual cards */}
      {(player.bank.length > 0 || (isYou && onDropToBank)) && (
        <div className={`mt-3 rounded-lg p-3 ${isDragOver ? "bg-blue-500/30 border-2 border-blue-400" : "bg-black/20 border border-white/10"} transition-all`}>
          <p className={`text-[8px] text-center mb-2 font-semibold ${isDragOver ? "text-blue-300" : "text-gray-400"}`}>
            💰 Bank
          </p>
          {player.bank.length > 0 ? (
            <div className="flex justify-center">
              <FannedCards 
                cards={[...player.bank].sort((a, b) => a.value - b.value)}
                small={true}
                maxVisible={8}
              />
            </div>
          ) : (
            isYou && (
              <div className="w-16 h-6 border-2 border-dashed border-gray-600 rounded-sm flex items-center justify-center mx-auto">
                <span className="text-gray-500 text-[8px]">Empty</span>
              </div>
            )
          )}
        </div>
      )}

      {/* Hand - show card backs with fan effect */}
      {!isYou && player.handCount > 0 && (
        <div className="mt-2 flex justify-center">
          <FannedCards 
            cards={Array.from({ length: player.handCount }, (_, i) => ({
              id: `back-${i}`,
              type: CardType.Money,
              value: 0,
            }))}
            small={true}
            showBacks={true}
            maxVisible={10}
          />
        </div>
      )}
    </motion.div>
  );
}
