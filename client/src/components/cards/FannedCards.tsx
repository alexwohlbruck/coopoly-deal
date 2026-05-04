import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { Card } from "../../types/game";
import { GameCard, CardBack } from "./GameCard";

interface FannedCardsProps {
  cards: Card[];
  cardWidth?: number; // Target card width (will scale down if needed)
  showBacks?: boolean;
  maxVisible?: number;
  onCardClick?: (card: Card) => void;
  onDragStart?: (e: React.DragEvent, card: Card) => void;
  onDragEnd?: () => void;
  draggable?: (card: Card) => boolean;
  orientation?: "top" | "bottom";
  getCardOrientation?: (card: Card) => "top" | "bottom" | undefined;
  useSocialistTheme?: boolean;
}

export function FannedCards({
  cards,
  cardWidth: targetCardWidth = 96, // Default target width
  showBacks = false,
  maxVisible = 10,
  onCardClick,
  onDragStart,
  onDragEnd,
  draggable,
  orientation,
  getCardOrientation,
  useSocialistTheme = false,
}: FannedCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [collapseTimeout, setCollapseTimeout] = useState<number | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const cardCount = cards.length;
  const visibleCount = Math.min(cardCount, maxVisible);

  // Detect touch device
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Card dimensions (aspect ratio 2:3)
  const CARD_WIDTH = targetCardWidth;
  const CARD_HEIGHT = targetCardWidth * 1.5;
  const COLLAPSED_SPREAD = targetCardWidth * 0.125; // 12.5% of card width
  const EXPANDED_SPREAD = CARD_WIDTH + 4;
  const spread = isHovered || isExpanded ? EXPANDED_SPREAD : COLLAPSED_SPREAD;

  // Calculate scale to fit container
  useEffect(() => {
    if (!containerRef.current || visibleCount === 0) return;

    const updateScale = () => {
      const containerWidth = containerRef.current!.offsetWidth;
      const requiredWidth = CARD_WIDTH + (visibleCount - 1) * COLLAPSED_SPREAD;
      const newScale = Math.min(1, containerWidth / requiredWidth);
      setScale(newScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [visibleCount, CARD_WIDTH, COLLAPSED_SPREAD]);

  const scaledCardWidth = CARD_WIDTH * scale;
  const scaledCardHeight = CARD_HEIGHT * scale;
  const scaledSpread = spread * scale;

  // Handle tap to expand on mobile
  const handleTap = () => {
    if (!isTouchDevice) return;
    
    if (isExpanded) {
      return;
    }

    setIsExpanded(true);
    if (collapseTimeout) {
      window.clearTimeout(collapseTimeout);
    }
    const timeout = window.setTimeout(() => {
      setIsExpanded(false);
    }, 3000);
    setCollapseTimeout(timeout);
  };

  const handleCardClick = (card: Card) => {
    if (isTouchDevice && !isExpanded) {
      handleTap();
      return;
    }
    if (onCardClick) {
      onCardClick(card);
    }
  };

  const getTransform = (index: number) => {
    const totalWidth = (visibleCount - 1) * scaledSpread;
    const centerOffset = -totalWidth / 2;
    const x = centerOffset + index * scaledSpread;

    return {
      x,
      y: 0,
      rotate: 0,
      scale: 1,
      zIndex: isHovered || isExpanded ? 100 + index : index,
    };
  };

  if (cardCount === 0) return null;

  const containerWidth = scaledCardWidth + (visibleCount - 1) * (COLLAPSED_SPREAD * scale);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center w-full"
      style={{
        minWidth: `${containerWidth}px`,
        height: `${scaledCardHeight}px`,
        zIndex: isHovered || isExpanded ? 100 : "auto",
      }}
      onMouseEnter={() => !isTouchDevice && setIsHovered(true)}
      onMouseLeave={() => !isTouchDevice && setIsHovered(false)}
      onClick={handleTap}
    >
      {cards.slice(0, maxVisible).map((card, index) => {
        const isDraggable = draggable ? draggable(card) : false;
        return (
          <motion.div
            key={card.id}
            className={`absolute ${isDraggable ? "cursor-grab active:cursor-grabbing touch-none" : ""}`}
            initial={{ opacity: 1 }}
            animate={getTransform(index)}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            draggable={isDraggable}
            onDragStart={(e) => {
              if (isDraggable && onDragStart) {
                onDragStart(e as unknown as React.DragEvent, card);
              }
            }}
            onDragEnd={() => {
              if (isDraggable && onDragEnd) {
                onDragEnd();
              }
            }}
            style={{
              transformOrigin: "center center",
              left: "50%",
              top: "50%",
              marginLeft: `${-scaledCardWidth / 2}px`,
              marginTop: `${-scaledCardHeight / 2}px`,
            }}
          >
            {showBacks ? (
              <CardBack scale={scale} useSocialistTheme={useSocialistTheme} width={CARD_WIDTH} />
            ) : (
              <GameCard
                card={card}
                onClick={onCardClick ? () => handleCardClick(card) : undefined}
                orientation={
                  getCardOrientation ? getCardOrientation(card) : orientation
                }
                scale={scale}
                useSocialistTheme={useSocialistTheme}
                width={CARD_WIDTH}
              />
            )}
          </motion.div>
        );
      })}

      {cardCount > maxVisible && (
        <div className="absolute -bottom-2 -right-2 bg-gray-800 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2 border-white z-50">
          +{cardCount - maxVisible}
        </div>
      )}
    </div>
  );
}
