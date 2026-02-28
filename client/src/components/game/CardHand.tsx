import { motion, AnimatePresence } from "framer-motion";
import type { Card } from "../../types/game";
import { GameCard } from "../cards/GameCard";
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
}

const CARD_WIDTH = 96;
const CARD_HEIGHT = 144;
const GAP = 8;

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
}: CardHandProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  const handleDragStart = (e: React.DragEvent, card: Card) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("cardId", card.id);
    e.dataTransfer.setData("cardData", JSON.stringify(card));
    onDragStart?.(card);
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // Tailwind's sm breakpoint
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Calculate layout: distribute cards across rows
  const numCards = cards.length;
  let rowDistribution: number[] = [];

  if (numCards === 0) {
    rowDistribution = [];
  } else if (isMobile) {
    // Mobile-specific layout for better readability
    if (numCards <= 4) {
      rowDistribution = [numCards]; // Single row
    } else if (numCards === 5) {
      rowDistribution = [2, 3]; // 2 on top, 3 on bottom
    } else if (numCards === 6) {
      rowDistribution = [3, 3]; // Two rows of 3
    } else if (numCards <= 12) {
      // 7-12 cards: distribute across 2 rows
      const perRow = Math.ceil(numCards / 2);
      rowDistribution = [perRow, numCards - perRow];
    } else {
      // 13+ cards: use 3 rows for better readability
      const perRow = Math.ceil(numCards / 3);
      const remainder = numCards % 3;
      if (remainder === 0) {
        rowDistribution = [perRow, perRow, perRow];
      } else if (remainder === 1) {
        rowDistribution = [perRow, perRow, perRow - 1];
      } else {
        rowDistribution = [perRow, perRow, perRow - 1];
      }
    }
  } else {
    // Desktop layout: up to 2 rows
    if (numCards <= 6) {
      rowDistribution = [numCards]; // Single row
    } else {
      const perRow = Math.ceil(numCards / 2);
      rowDistribution = [perRow, numCards - perRow];
    }
  }

  const maxCardsInRow = Math.max(...rowDistribution, 0);

  // Calculate scale to fit all cards
  useEffect(() => {
    if (!containerRef.current || numCards === 0) return;

    const updateScale = () => {
      const containerWidth = containerRef.current!.offsetWidth;

      // Calculate required width for the widest row at full scale
      const requiredWidth =
        maxCardsInRow * CARD_WIDTH + (maxCardsInRow - 1) * GAP;

      // Calculate scale needed to fit
      const newScale = Math.min(1, containerWidth / requiredWidth);
      setScale(newScale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [numCards, maxCardsInRow]);

  const scaledCardWidth = CARD_WIDTH * scale;
  const scaledCardHeight = CARD_HEIGHT * scale;
  const scaledGap = GAP * scale;

  return (
    <div
      className="relative w-full flex flex-col items-center"
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
                    draggable={!disabled && !needsDiscard && onDragToBank !== undefined}
                    onDragStart={(e) => {
                      if ("dataTransfer" in e) {
                        handleDragStart(e as unknown as React.DragEvent, card);
                      }
                    }}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => {
                      if (disabled || needsDiscard || !onDragToBank) return;

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
                        document.removeEventListener(
                          "touchmove",
                          handleTouchMove,
                        );
                        document.removeEventListener(
                          "touchend",
                          handleTouchEnd,
                        );

                        if (!isDragging) {
                          onDragEnd?.();
                          return;
                        }

                        const endTouch = endEvent.changedTouches[0];
                        if (!endTouch) {
                          onDragEnd?.();
                          return;
                        }

                        const targetElement = document.elementFromPoint(
                          endTouch.clientX,
                          endTouch.clientY,
                        );

                        // Check for bank drop zone
                        const bankElement = targetElement?.closest(
                          "[data-bank-drop-zone]",
                        );
                        if (bankElement && onDragToBank) {
                          onDragToBank(card);
                          onDragEnd?.();
                          return;
                        }

                        // Check for property drop zone
                        const propertyElement = targetElement?.closest(
                          "[data-property-drop-zone]",
                        );
                        if (propertyElement) {
                          const color = propertyElement.getAttribute(
                            "data-property-drop-zone",
                          );
                          if (color) {
                            // Trigger the drop event on the property element
                            const dropEvent = new DragEvent("drop", {
                              bubbles: true,
                              cancelable: true,
                            });
                            Object.defineProperty(dropEvent, "dataTransfer", {
                              value: {
                                getData: (key: string) =>
                                  key === "cardId" ? card.id : "",
                              },
                            });
                            propertyElement.dispatchEvent(dropEvent);
                          }
                        }

                        onDragEnd?.();
                      };

                      document.addEventListener("touchmove", handleTouchMove, {
                        passive: false,
                      });
                      document.addEventListener("touchend", handleTouchEnd);
                    }}
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
