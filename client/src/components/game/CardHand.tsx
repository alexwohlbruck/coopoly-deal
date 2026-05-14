import { motion, AnimatePresence } from "framer-motion";
import type { Card, PropertyColor } from "../../types/game";
import { GameCard } from "../cards/GameCard";
import {
  HoverFanHand,
  DragPeekHand,
  type HandRenderItem,
  type TouchDropSpec,
} from "../cards/FannedCards";
import { useEffect, useRef, useState, useCallback } from "react";
import { usePointerCardDrag } from "../../hooks/usePointerCardDrag";

interface CardHandProps {
  cards: Card[];
  onCardClick: (card: Card) => void;
  selectedCardId: string | null;
  shakingCardId?: string | null;
  disabled?: boolean;
  needsDiscard?: boolean;
  onDragToBank?: (card: Card) => void;
  /** Fired when the user drags a card onto a property-set drop zone. */
  onDropToProperty?: (card: Card, color: PropertyColor) => void;
  /** Fired when the user drops a card on the "new set" drop zone. */
  onCreateNewSet?: (card: Card) => void;
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
  onDropToProperty,
  onCreateNewSet,
  onDragStart,
  onDragEnd,
  useSocialistTheme = false,
  fanMode = null,
  peekResetSignal = null,
}: CardHandProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // ── Unified drop dispatch ─────────────────────────────────────────
  // Route a drop spec → the appropriate play action. Used by both the
  // pointer-drag hook (desktop HoverFanHand / grid) and the touch-drag
  // system (mobile DragPeekHand).
  const cardByIdRef = useRef(new Map<string, Card>());
  cardByIdRef.current = new Map(cards.map((c) => [c.id, c]));

  const handleCardDrop = useCallback(
    (card: Card, spec: TouchDropSpec) => {
      if (spec.kind === "bank") {
        onDragToBank?.(card);
      } else if (spec.kind === "set") {
        onDropToProperty?.(card, spec.color as PropertyColor);
      } else if (spec.kind === "new-set") {
        onCreateNewSet?.(card);
      }
    },
    [onDragToBank, onDropToProperty, onCreateNewSet],
  );

  // ── Pointer-based card drag (mouse + touch) ───────────────────────
  const draggable = !disabled && !needsDiscard && onDragToBank !== undefined;

  const fanCardWidth = fanMode === "hover" ? 116 : 96;
  const fanCardHeight = Math.round(fanCardWidth * 1.5);

  const { startDrag } = usePointerCardDrag({
    onDrop: handleCardDrop,
    onDragStart,
    onDragEnd,
    cardWidth: fanMode ? fanCardWidth : 96,
    cardHeight: fanMode ? fanCardHeight : 144,
  });

  // ───────── Fan rendering (HoverFanHand desktop / DragPeekHand mobile) ─────
  if (fanMode) {
    const items: HandRenderItem[] = cards.map((card) => ({
      id: card.id,
      legal: !disabled,
      draggable,
      onClick: () => onCardClick(card),
      onPointerDown: draggable
        ? (e: React.PointerEvent) => startDrag(e, card)
        : undefined,
      node: (
        <div className={card.id === shakingCardId ? "animate-shake" : undefined}>
          <GameCard
            card={card}
            selected={card.id === selectedCardId}
            disabled={disabled}
            useSocialistTheme={useSocialistTheme}
            width={fanCardWidth}
            disableHover
          />
        </div>
      ),
    }));

    // Route a DragPeekHand touch-drop spec → the same dispatch.
    const handleTouchDrop = (item: HandRenderItem, spec: TouchDropSpec) => {
      const card = cardByIdRef.current.get(item.id);
      if (!card) return;
      handleCardDrop(card, spec);
    };

    return (
      <div className="w-full">
        {fanMode === "hover" ? (
          <HoverFanHand
            items={items}
            selectedId={selectedCardId}
            cardWidth={fanCardWidth}
            cardHeight={fanCardHeight}
            resetSignal={peekResetSignal}
          />
        ) : (
          <DragPeekHand
            items={items}
            selectedId={selectedCardId}
            cardWidth={fanCardWidth}
            cardHeight={fanCardHeight}
            resetSignal={peekResetSignal}
            onTouchDragStart={(item) => {
              const card = cardByIdRef.current.get(item.id);
              if (card) onDragStart?.(card);
            }}
            onTouchDragEnd={() => onDragEnd?.()}
            onTouchDrop={handleTouchDrop}
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
    let maxCardsPerRow: number;

    if (containerWidth < 640) {
      maxCardsPerRow = 4;
    } else if (containerWidth < 1024) {
      maxCardsPerRow = 7;
    } else if (containerWidth < 1536) {
      maxCardsPerRow = 10;
    } else {
      maxCardsPerRow = 12;
    }

    const MAX_ROWS = 2;

    if (numCards <= maxCardsPerRow) {
      rowDistribution = [numCards];
    } else {
      const numRows = Math.min(MAX_ROWS, Math.ceil(numCards / maxCardsPerRow));
      const basePerRow = Math.floor(numCards / numRows);
      const remainder = numCards % numRows;

      rowDistribution = [];
      for (let i = 0; i < numRows; i++) {
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
      const requiredWidth =
        maxCardsInRow * CARD_WIDTH + (maxCardsInRow - 1) * GAP;
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
                    className={`${draggable ? "cursor-grab active:cursor-grabbing" : ""} ${card.id === shakingCardId ? "animate-shake" : ""}`}
                    style={{
                      width: `${scaledCardWidth}px`,
                      height: `${scaledCardHeight}px`,
                      touchAction: draggable ? "none" : undefined,
                    }}
                    onPointerDown={
                      draggable
                        ? (e) =>
                            startDrag(
                              e as unknown as React.PointerEvent,
                              card,
                            )
                        : undefined
                    }
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
