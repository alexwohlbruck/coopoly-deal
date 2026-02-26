import { useState } from "react";
import { motion } from "framer-motion";
import type { Card } from "../../types/game";
import { GameCard, CardBack } from "./GameCard";

interface FannedCardsProps {
  cards: Card[];
  small?: boolean;
  showBacks?: boolean; // Show card backs instead of actual cards
  maxVisible?: number; // Max cards to show before stacking
  onCardClick?: (card: Card) => void;
  orientation?: "top" | "bottom"; // For wildcards
}

export function FannedCards({
  cards,
  small = true,
  showBacks = false,
  maxVisible = 10,
  onCardClick,
  orientation,
}: FannedCardsProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const cardCount = cards.length;
  const visibleCount = Math.min(cardCount, maxVisible);
  
  // Calculate horizontal spread - tighter when collapsed, full card width when expanded
  const cardWidth = small ? 64 : 96;
  const collapsedSpread = small ? 8 : 12;
  const expandedSpread = cardWidth + 4; // Full card width + small gap
  const spread = isHovered ? expandedSpread : collapsedSpread;
  
  const getTransform = (index: number) => {
    // Calculate offset from center
    const totalWidth = (visibleCount - 1) * spread;
    const centerOffset = -totalWidth / 2;
    const x = centerOffset + index * spread;
    
    return {
      x,
      y: 0,
      rotate: 0,
      scale: 1,
      zIndex: isHovered ? 100 + index : index, // Elevated z-index when expanded
    };
  };

  if (cardCount === 0) return null;

  const cardHeight = small ? 96 : 144;
  
  // Use collapsed spread for container width (only expand on hover)
  const containerWidth = cardWidth + (visibleCount - 1) * collapsedSpread;

  return (
    <div 
      className="relative flex items-center justify-center"
      style={{
        width: `${containerWidth}px`,
        height: `${cardHeight}px`,
        zIndex: isHovered ? 100 : 'auto', // Elevate entire container on hover
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {cards.slice(0, maxVisible).map((card, index) => (
        <motion.div
          key={card.id}
          className="absolute"
          initial={{ opacity: 1 }}
          animate={getTransform(index)}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          style={{
            transformOrigin: "center center",
            left: "50%",
            top: "50%",
            marginLeft: `${-cardWidth / 2}px`,
            marginTop: `${-cardHeight / 2}px`,
          }}
        >
          {showBacks ? (
            <CardBack small={small} />
          ) : (
            <GameCard
              card={card}
              small={small}
              onClick={onCardClick ? () => onCardClick(card) : undefined}
              orientation={orientation}
            />
          )}
        </motion.div>
      ))}
      
      {/* Show count if more cards than maxVisible */}
      {cardCount > maxVisible && (
        <div className="absolute -bottom-2 -right-2 bg-gray-800 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2 border-white z-50">
          +{cardCount - maxVisible}
        </div>
      )}
    </div>
  );
}
