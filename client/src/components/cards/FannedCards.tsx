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
  orientation?: "top" | "bottom"; // For wildcards (applied to all cards)
  getCardOrientation?: (card: Card) => "top" | "bottom" | undefined; // Per-card orientation function
}

export function FannedCards({
  cards,
  small = true,
  showBacks = false,
  maxVisible = 10,
  onCardClick,
  orientation,
  getCardOrientation,
}: FannedCardsProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [collapseTimeout, setCollapseTimeout] = useState<number | null>(null);
  
  // Detect mobile on mount
  useState(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  });
  
  const cardCount = cards.length;
  const visibleCount = Math.min(cardCount, maxVisible);
  
  // Calculate horizontal spread - tighter when collapsed, full card width when expanded
  const cardWidth = small ? 64 : 96;
  const collapsedSpread = small ? 8 : 12;
  const expandedSpread = cardWidth + 4; // Full card width + small gap
  const spread = (isHovered || isExpanded) ? expandedSpread : collapsedSpread;
  
  // Handle tap to expand on mobile
  const handleTap = () => {
    if (!isMobile) return;
    
    if (isExpanded) {
      // Already expanded, allow card click
      return;
    }
    
    // First tap: expand
    setIsExpanded(true);
    
    // Auto-collapse after 3 seconds
    if (collapseTimeout) {
      window.clearTimeout(collapseTimeout);
    }
    const timeout = window.setTimeout(() => {
      setIsExpanded(false);
    }, 3000);
    setCollapseTimeout(timeout);
  };
  
  const handleCardClick = (card: Card) => {
    if (isMobile && !isExpanded) {
      // First tap on mobile: expand instead of clicking
      handleTap();
      return;
    }
    // Second tap or desktop: trigger click
    if (onCardClick) {
      onCardClick(card);
    }
  };
  
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
        zIndex: (isHovered || isExpanded) ? 100 : 'auto', // Elevate entire container on hover/expand
      }}
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
      onClick={isMobile ? handleTap : undefined}
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
              onClick={onCardClick ? () => handleCardClick(card) : undefined}
              orientation={getCardOrientation ? getCardOrientation(card) : orientation}
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
