import { useState } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import type { ClientPlayer, PropertySet } from "../../types/game";
import {
  PROPERTY_COLOR_HEX,
  PROPERTY_COLOR_LABEL,
  isSetComplete,
  SET_SIZE,
} from "../../types/game";

interface PlayerAreaProps {
  player: ClientPlayer;
  isCurrentTurn: boolean;
  isYou: boolean;
  compact?: boolean;
  isWaitingForAction?: boolean;
  onDropToBank?: (cardId: string) => void;
}

function PropertySetDisplay({ set, small }: { set: PropertySet; small?: boolean }) {
  const complete = isSetComplete(set);
  const color = PROPERTY_COLOR_HEX[set.color];

  return (
    <div className={`flex flex-col items-center ${small ? "gap-0.5" : "gap-0.5"}`}>
      {/* Header badge */}
      <div
        className={`
          ${small ? "px-1 py-0.5" : "px-1.5 py-0.5"} rounded-t-md w-full text-center
          ${complete ? "ring-1 ring-yellow-400" : ""}
        `}
        style={{ backgroundColor: color }}
      >
        <p className={`text-white font-bold ${small ? "text-[6px]" : "text-[8px]"}`}>
          {PROPERTY_COLOR_LABEL[set.color]} {set.cards.length}/{SET_SIZE[set.color]}
        </p>
      </div>

      {/* Stacked cards */}
      <div className="flex flex-col -space-y-3">
        {set.cards.map((card, i) => (
          <div key={card.id} className="relative" style={{ zIndex: i }}>
            <div
              className={`${small ? "w-10 h-6" : "w-14 h-8"} rounded-sm border border-gray-300 flex items-center justify-center px-0.5`}
              style={{ backgroundColor: "#FFFEF5", borderLeft: `3px solid ${color}` }}
            >
              <p className={`${small ? "text-[5px]" : "text-[6px]"} font-semibold text-gray-700 truncate`}>
                {card.name ?? PROPERTY_COLOR_LABEL[set.color]}
              </p>
              <span className={`${small ? "text-[5px]" : "text-[6px]"} text-gray-500 ml-auto shrink-0 font-bold`}>
                ${card.value}M
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* House/Hotel indicators */}
      {(set.house || set.hotel) && (
        <div className="flex gap-0.5">
          {set.house && (
            <div className={`${small ? "w-3 h-3" : "w-4 h-4"} bg-green-600 rounded-sm flex items-center justify-center`}>
              <span className="text-white text-[5px] font-bold">H</span>
            </div>
          )}
          {set.hotel && (
            <div className={`${small ? "w-3 h-3" : "w-4 h-4"} bg-red-600 rounded-sm flex items-center justify-center`}>
              <span className="text-white text-[5px] font-bold">HT</span>
            </div>
          )}
        </div>
      )}
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
        rounded-xl p-3 relative
        ${isCurrentTurn ? "bg-white/15 ring-2 ring-yellow-400/60" : "bg-white/5"}
        ${isYou ? "border border-blue-400/40" : "border border-white/10"}
        ${compact ? "w-40" : "w-52"}
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
      
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs
          ${isCurrentTurn ? "bg-yellow-500" : "bg-emerald-600"}
          ${!player.connected ? "opacity-40" : ""}
        `}
        >
          {player.name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-white font-semibold text-sm truncate ${!player.connected ? "opacity-40" : ""}`}>
            {player.name}
            {isYou && <span className="text-emerald-400 text-xs ml-1">(you)</span>}
          </p>
          <div className="flex gap-2 text-[10px]">
            <span className="text-emerald-300">${bankTotal}M</span>
            <span className="text-yellow-300">{completeSets}/3 sets</span>
            <span className="text-gray-400">{player.handCount} cards</span>
          </div>
        </div>
      </div>

      {/* Property sets */}
      {player.properties.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {player.properties.map((set, i) => (
            <PropertySetDisplay key={`${set.color}-${i}`} set={set} small={compact} />
          ))}
        </div>
      )}

      {/* Bank section */}
      {(player.bank.length > 0 || (isYou && onDropToBank)) && (
        <div className={`mt-2 rounded-lg p-1.5 ${isDragOver ? "bg-blue-500/30 border-2 border-blue-400" : "bg-black/20 border border-white/10"} transition-all`}>
          {isYou && onDropToBank && (
            <p className={`text-[7px] text-center mb-1 font-semibold ${isDragOver ? "text-blue-300" : "text-gray-400"}`}>
              {isDragOver ? "💰 Drop to Bank" : "💰 Bank"}
            </p>
          )}
          <div className="flex flex-wrap gap-0.5">
            {player.bank.map((card) => (
              <div
                key={card.id}
                className={`${compact ? "w-8 h-5" : "w-10 h-6"} bg-emerald-700 rounded-sm flex items-center justify-center border border-emerald-600`}
              >
                <span className={`text-white ${compact ? "text-[6px]" : "text-[7px]"} font-bold`}>${card.value}M</span>
              </div>
            ))}
            {player.bank.length === 0 && isYou && (
              <div className={`${compact ? "w-8 h-5" : "w-10 h-6"} border-2 border-dashed ${isDragOver ? "border-blue-400" : "border-gray-600"} rounded-sm flex items-center justify-center`}>
                <span className="text-gray-500 text-[6px]">Empty</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hand - show card backs */}
      {!isYou && player.handCount > 0 && (
        <div className="flex flex-wrap gap-0.5 mt-2">
          {Array.from({ length: Math.min(player.handCount, 10) }).map((_, i) => (
            <div
              key={i}
              className={`${compact ? "w-6 h-8" : "w-8 h-10"} bg-red-800 rounded-sm border border-red-700 flex items-center justify-center`}
            >
              <span className={`text-white ${compact ? "text-[5px]" : "text-[6px]"} font-bold opacity-50`}>?</span>
            </div>
          ))}
          {player.handCount > 10 && (
            <span className="text-gray-400 text-[9px] self-end">+{player.handCount - 10}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}
