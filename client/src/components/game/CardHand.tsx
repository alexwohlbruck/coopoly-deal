import { motion, AnimatePresence } from "framer-motion";
import type { Card } from "../../types/game";
import { GameCard } from "../cards/GameCard";
import {
  HoverFanHand,
  DragPeekHand,
  type HandRenderItem,
} from "../cards/FannedCards";
import { useEffect, useRef, useState } from "react";

interface CardHandProps {
  cards: Card[];
  onCardClick: (card: Card) => void;
  selectedCardId: string | null;
  shakingCardId?: string | null;
  disabled?: boolean;
  needsDiscard?: boolean;
  onDragToBank?: (card: Card) => void;
  onDragStart?: (card: Card) => void;
  onDragEnd?: () => void;
  useSocialistTheme?: boolean;
  /** When set, render the hand as an arc fan (desktop) or drag-peek
   * rail (mobile) per the design's hover-to-peek pattern. */
  fanMode?: "hover" | "drag" | null;
  /** Tick this to clear the peek state — useful when a card is played
   *  or a dialog opens. */
  peekResetSignal?: number | string | null;
}

export function CardHand({
  cards,
  onCardClick,
  selectedCardId,
  shakingCardId,
  disabled,
  needsDiscard,
  onDragToBank,
  onDragStart,
  onDragEnd,
  useSocialistTheme = false,
  fanMode = null,
  peekResetSignal = null,
}: CardHandProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const handleDragStart = (e: React.DragEvent, card: Card) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("cardId", card.id);
    e.dataTransfer.setData("cardData", JSON.stringify(card));
    onDragStart?.(card);
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  // ───────── Fan rendering (HoverFanHand desktop / DragPeekHand mobile) ─────
  if (fanMode) {
    const draggable = !disabled && !needsDiscard && onDragToBank !== undefined;
    const cardWidth = fanMode === "hover" ? 116 : 96;
    const cardHeight = Math.round(cardWidth * 1.5);
    const items: HandRenderItem[] = cards.map((card) => ({
      id: card.id,
      legal: !disabled,
      draggable,
      onClick: () => onCardClick(card),
      onDragStart: (e) => handleDragStart(e, card),
      onDragEnd: handleDragEnd,
      node: (
        <div className={card.id === shakingCardId ? "animate-shake" : undefined}>
          <GameCard
            card={card}
            selected={card.id === selectedCardId}
            disabled={disabled}
            useSocialistTheme={useSocialistTheme}
            width={cardWidth}
            disableHover
          />
        </div>
      ),
    }));
    return (
      <div className="w-full">
        {fanMode === "hover" ? (
          <HoverFanHand
            items={items}
            selectedId={selectedCardId}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            resetSignal={peekResetSignal}
          />
        ) : (
          <DragPeekHand
            items={items}
            selectedId={selectedCardId}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            resetSignal={peekResetSignal}
          />
        )}
      </div>
    );
  }

  const CARD_WIDTH = 96; // w-24
  const CARD_HEIGHT = 144; // h-36
  const GAP = 8;

  // Calculate layout: distribute cards across rows based on screen size
  const numCards = cards.length;
  let rowDistribution: number[] = [];

  // Get container width to determine breakpoint
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateWidth = () => {
      setContainerWidth(containerRef.current!.offsetWidth);
    };
    
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  if (numCards === 0) {
    rowDistribution = [];
  } else {
    // Determine max cards per row based on container width
    // Breakpoints: mobile (<640px), tablet (640-1024px), desktop (1024-1536px), large (1536px+)
    let maxCardsPerRow: number;
    
    if (containerWidth < 640) {
      // Mobile: conservative layout
      maxCardsPerRow = 4;
    } else if (containerWidth < 1024) {
      // Tablet: 6-7 cards per row
      maxCardsPerRow = 7;
    } else if (containerWidth < 1536) {
      // Desktop: 8-10 cards per row
      maxCardsPerRow = 10;
    } else {
      // Large screens: 12+ cards per row
      maxCardsPerRow = 12;
    }

    // Distribute cards across rows (max 2 rows)
    const MAX_ROWS = 2;
    
    if (numCards <= maxCardsPerRow) {
      rowDistribution = [numCards]; // Single row
    } else {
      // Calculate optimal row distribution with max 2 rows
      const numRows = Math.min(MAX_ROWS, Math.ceil(numCards / maxCardsPerRow));
      const basePerRow = Math.floor(numCards / numRows);
      const remainder = numCards % numRows;
      
      rowDistribution = [];
      for (let i = 0; i < numRows; i++) {
        // Distribute remainder cards to first rows for better balance
        rowDistribution.push(basePerRow + (i < remainder ? 1 : 0));
      }
    }
  }

  const maxCardsInRow = Math.max(...rowDistribution, 0);

  // Calculate scale to fit all cards
  useEffect(() => {
    if (!containerRef.current || numCards === 0 || maxCardsInRow === 0) return;

    const updateScale = () => {
      const currentWidth = containerRef.current!.offsetWidth;

      // Calculate required width for the widest row at full scale
      const requiredWidth =
        maxCardsInRow * CARD_WIDTH + (maxCardsInRow - 1) * GAP;

      // Calculate scale needed to fit
      const newScale = Math.min(1, currentWidth / requiredWidth);
      setScale(newScale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [numCards, maxCardsInRow, containerWidth]);

  const scaledCardWidth = CARD_WIDTH * scale;
  const scaledCardHeight = CARD_HEIGHT * scale;
  const scaledGap = GAP * scale;

  return (
    <div
      className="relative w-full flex flex-col items-center overflow-y-auto max-h-[40vh]"
      ref={containerRef}
    >
      <div
        className="flex flex-col items-center justify-center"
        style={{
          gap: `${scaledGap}px`,
        }}
      >
        <AnimatePresence mode="popLayout">
          {rowDistribution.map((cardsInRow, rowIndex) => {
            const startIdx = rowDistribution
              .slice(0, rowIndex)
              .reduce((sum, count) => sum + count, 0);
            const endIdx = startIdx + cardsInRow;
            const rowCards = cards.slice(startIdx, endIdx);

            return (
              <div
                key={`row-${rowIndex}`}
                className="flex items-center justify-center"
                style={{ gap: `${scaledGap}px` }}
              >
                {rowCards.map((card) => (
                  <motion.div
                    key={card.id}
                    layout
                    initial={{ opacity: 0, y: 50, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -50, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    draggable={
                      !disabled && !needsDiscard && onDragToBank !== undefined
                    }
                    onDragStart={(e) => {
                      if ("dataTransfer" in e) {
                        handleDragStart(e as unknown as React.DragEvent, card);
                      }
                    }}
                    onDragEnd={handleDragEnd}
                    className={`cursor-grab active:cursor-grabbing touch-none ${card.id === shakingCardId ? "animate-shake" : ""}`}
                    style={{
                      width: `${scaledCardWidth}px`,
                      height: `${scaledCardHeight}px`,
                    }}
                  >
                    <div
                      style={{
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                      }}
                    >
                      <GameCard
                        card={card}
                        onClick={() => onCardClick(card)}
                        selected={card.id === selectedCardId}
                        disabled={disabled}
                        disableHover={true}
                        useSocialistTheme={useSocialistTheme}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
