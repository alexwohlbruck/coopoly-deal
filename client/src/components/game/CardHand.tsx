import { motion, AnimatePresence } from "framer-motion";
import type { Card } from "../../types/game";
import { GameCard } from "../cards/GameCard";

interface CardHandProps {
  cards: Card[];
  onCardClick: (card: Card) => void;
  selectedCardId: string | null;
  disabled?: boolean;
  maxCards?: number;
  onDragToBank?: (card: Card) => void;
}

export function CardHand({ cards, onCardClick, selectedCardId, disabled, maxCards = 7, onDragToBank }: CardHandProps) {
  const overLimit = cards.length > maxCards;

  const handleDragStart = (e: React.DragEvent, card: Card) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("cardId", card.id);
    e.dataTransfer.setData("cardData", JSON.stringify(card));
  };

  return (
    <div className="relative">
      {overLimit && (
        <p className="text-red-400 text-xs text-center mb-1">
          Too many cards ({cards.length}/{maxCards}) — discard to end your turn
        </p>
      )}
      <div className="flex justify-center gap-1 flex-wrap px-2">
        <AnimatePresence mode="popLayout">
          {cards.map((card) => (
            <motion.div
              key={card.id}
              layout
              initial={{ opacity: 0, y: 50, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              draggable={!disabled && onDragToBank !== undefined}
              onDragStart={(e) => {
                if ('dataTransfer' in e) {
                  handleDragStart(e as unknown as React.DragEvent, card);
                }
              }}
              onTouchStart={(e) => {
                if (disabled || !onDragToBank) return;
                
                const touch = e.touches[0];
                if (!touch) return;
                
                const startX = touch.clientX;
                const startY = touch.clientY;
                let isDragging = false;
                
                const handleTouchMove = (moveEvent: TouchEvent) => {
                  const moveTouch = moveEvent.touches[0];
                  if (!moveTouch) return;
                  
                  const deltaX = Math.abs(moveTouch.clientX - startX);
                  const deltaY = Math.abs(moveTouch.clientY - startY);
                  
                  if (!isDragging && (deltaX > 10 || deltaY > 10)) {
                    isDragging = true;
                  }
                  
                  if (isDragging) {
                    moveEvent.preventDefault();
                  }
                };
                
                const handleTouchEnd = (endEvent: TouchEvent) => {
                  document.removeEventListener('touchmove', handleTouchMove);
                  document.removeEventListener('touchend', handleTouchEnd);
                  
                  if (!isDragging) return;
                  
                  const endTouch = endEvent.changedTouches[0];
                  if (!endTouch) return;
                  
                  const targetElement = document.elementFromPoint(endTouch.clientX, endTouch.clientY);
                  const bankElement = targetElement?.closest('[data-bank-drop-zone]');
                  
                  if (bankElement && onDragToBank) {
                    onDragToBank(card);
                  }
                };
                
                document.addEventListener('touchmove', handleTouchMove, { passive: false });
                document.addEventListener('touchend', handleTouchEnd);
              }}
              className="cursor-grab active:cursor-grabbing touch-none"
            >
              <GameCard
                card={card}
                onClick={() => onCardClick(card)}
                selected={card.id === selectedCardId}
                disabled={disabled}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
