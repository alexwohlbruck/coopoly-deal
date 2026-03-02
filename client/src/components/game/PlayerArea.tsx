import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import type { ClientPlayer, Card } from "../../types/game";
import { CardType, PropertyColor, isSetComplete } from "../../types/game";

import { type GameSettings } from "../../types/game";
import { PropertySetDisplay } from "./PropertySetDisplay";
import { EmptyPropertyDropZone } from "./EmptyPropertyDropZone";
import { BankArea } from "./BankArea";

interface PlayerAreaProps {
  player: ClientPlayer;
  isCurrentTurn: boolean;
  isYou: boolean;
  settings: GameSettings;
  isWaitingForAction?: boolean;
  onDropToBank?: (cardId: string) => void;
  onDropToProperty?: (cardId: string, color: PropertyColor) => void;
  onRearrangeProperty?: (
    cardId: string,
    color: PropertyColor,
    createNewSet?: boolean,
  ) => void;
  onDropWildcard?: (card: Card) => void;
  onDropToRainbow?: (card: Card) => void;
  onWildcardClick?: (card: Card, currentColor: PropertyColor) => void;
  draggingCard?: Card | null;
  availableHeight?: number;
}

export function PlayerArea({
  player,
  isCurrentTurn,
  isYou,
  settings,
  isWaitingForAction,
  onDropToBank,
  onDropToProperty,
  onRearrangeProperty,
  onDropWildcard,
  onDropToRainbow,
  onWildcardClick,
  draggingCard,
  availableHeight,
}: PlayerAreaProps) {
  const bankTotal = player.bank.reduce((sum, c) => sum + c.value, 0);

  const completeSetsList = player.properties.filter(isSetComplete);
  const completeSets = settings?.allowDuplicateSets
    ? completeSetsList.length
    : new Set(completeSetsList.map((s) => s.color)).size;

  const [isDragOverBank, setIsDragOverBank] = useState(false);
  const [dragOverSetColor, setDragOverSetColor] =
    useState<PropertyColor | null>(null);

  // Show drop zones when dragging
  const isDraggingProperty =
    draggingCard &&
    (draggingCard.type === CardType.Property ||
      draggingCard.type === CardType.PropertyWildcard);
  const showDropZones = draggingCard && isYou && isCurrentTurn;
  const showEmptyDropZone = isDraggingProperty && isYou && isCurrentTurn;
  const contentRef = useRef<HTMLDivElement>(null);
  const setsContainerRef = useRef<HTMLDivElement>(null);
  const [contentScale, setContentScale] = useState(1);
  const [setsLayout, setSetsLayout] = useState<number[]>([]);

  const handleBankDragOver = (e: React.DragEvent) => {
    if (!isYou || !onDropToBank) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverBank(true);
  };

  const handleBankDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDragOverBank(false);
  };

  const handleBankDrop = (e: React.DragEvent) => {
    if (!isYou || !onDropToBank) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverBank(false);
    const cardId = e.dataTransfer.getData("cardId");
    if (cardId) {
      onDropToBank(cardId);
    }
  };

  const handleSetDragOver = (e: React.DragEvent, color: PropertyColor) => {
    if (!isYou || !onDropToProperty) {
      e.dataTransfer.dropEffect = "none";
      return;
    }

    // Validate before allowing drop
    const cardData = e.dataTransfer.getData("cardData");
    if (cardData) {
      try {
        const card = JSON.parse(cardData);

        // Only allow property and wildcard cards
        if (
          card.type !== CardType.Property &&
          card.type !== CardType.PropertyWildcard
        ) {
          e.dataTransfer.dropEffect = "none";
          return; // Don't allow drop
        }

        // Validate color for regular properties
        if (card.type === CardType.Property) {
          const cardColor = card.colors?.[0];
          if (cardColor !== color) {
            e.dataTransfer.dropEffect = "none";
            return; // Wrong color
          }
        }

        // Validate wildcard supports this color
        if (card.type === CardType.PropertyWildcard) {
          if (
            color !== PropertyColor.Unassigned &&
            !card.colors?.includes(color)
          ) {
            e.dataTransfer.dropEffect = "none";
            return; // Wildcard doesn't support this color
          }
        }
      } catch {
        e.dataTransfer.dropEffect = "none";
        return;
      }
    }

    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverSetColor(color);
  };

  const handleSetDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDragOverSetColor(null);
  };

  const handleSetDrop = (e: React.DragEvent, color: PropertyColor) => {
    if (!isYou || !onDropToProperty) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverSetColor(null);
    const cardId = e.dataTransfer.getData("cardId");
    const sourceColor = e.dataTransfer.getData("sourceColor");
    const cardData = e.dataTransfer.getData("cardData");

    if (sourceColor && onRearrangeProperty) {
      onRearrangeProperty(cardId, color);
      return;
    }

    if (cardId && cardData) {
      try {
        const card = JSON.parse(cardData);

        // Validate card type - only property and wildcard cards can be dropped here
        if (
          card.type !== CardType.Property &&
          card.type !== CardType.PropertyWildcard
        ) {
          return; // Silently ignore invalid drops
        }

        // If dropping a property card onto a set with wildcards, update wildcard colors
        if (card.type === CardType.Property) {
          const cardColor = card.colors?.[0];

          // Check if we're dropping onto a wildcard set (unassigned or different color)
          const targetSet = player.properties.find((s) => s.color === color);
          if (targetSet && cardColor && cardColor !== color) {
            if (color === PropertyColor.Unassigned && onDropToRainbow) {
              onDropToRainbow(card);
              return;
            }

            // Dropping a property onto a wildcard set - update the set color
            // Find all wildcards in this set and update them
            const wildcards = targetSet.cards.filter(
              (c) => c.type === CardType.PropertyWildcard,
            );

            // First, play the property card to the correct color
            onDropToProperty(cardId, cardColor);

            // Then, rearrange each wildcard to the new color
            if (onWildcardClick) {
              for (const wildcard of wildcards) {
                if (wildcard.colors?.includes(cardColor)) {
                  // Use a timeout to ensure the property is played first
                  setTimeout(() => {
                    onWildcardClick(wildcard, cardColor);
                  }, 100);
                }
              }
            }
            return;
          }

          // Normal case - validate color match
          if (cardColor !== color) {
            return; // Wrong color
          }
        }

        // Validate wildcard can be this color
        if (card.type === CardType.PropertyWildcard) {
          if (color === PropertyColor.Unassigned) {
            // Cannot move a rainbow wildcard to an existing unassigned rainbow slot
            return;
          } else if (!card.colors?.includes(color)) {
            return; // Wildcard doesn't support this color
          }
        }

        onDropToProperty(cardId, color);
      } catch {
        // Invalid card data
        return;
      }
    }
  };

  const bankCards = player.bank;
  const handCards = player.hand && player.hand.length > 0 ? player.hand : [];
  const handBackCards =
    !isYou && player.handCount > 0 && handCards.length === 0
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSetsLayout([]);
      return;
    }

    const calculateLayout = () => {
      if (!setsContainerRef.current) return;

      const containerWidth = setsContainerRef.current.offsetWidth * 0.98;
      const numSets = player.properties.length;

      // Calculate set width based on FannedCards collapsed size
      const isMobile = window.innerWidth < 640;
      const cardWidth = isMobile ? 64 : 96;
      const collapsedSpread = 8;
      const avgCardsPerSet = 3;
      const SET_WIDTH = cardWidth + (avgCardsPerSet - 1) * collapsedSpread;
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
    window.addEventListener("resize", calculateLayout);
    return () => window.removeEventListener("resize", calculateLayout);
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
  }, [
    availableHeight,
    player.properties.length,
    bankCards.length,
    handBackCards.length,
  ]);

  return (
    <motion.div
      animate={isCurrentTurn ? { scale: 1.02 } : { scale: 1 }}
      style={{
        maxHeight: availableHeight ? `${availableHeight * 0.95}px` : undefined,
        transformOrigin: "center center",
      }}
      className={`
        rounded-xl p-3 sm:p-4 relative w-full max-w-4xl mx-auto overflow-hidden flex items-center justify-center
        ${isCurrentTurn ? "bg-white/15 ring-2 ring-yellow-400/60" : "bg-white/5"}
        ${isYou ? "border border-blue-400/40" : "border border-white/10"}
      `}
    >
      <div
        ref={contentRef}
        style={{
          transform: `scale(${contentScale})`,
          transformOrigin: "center center",
        }}
        className="w-full"
      >
        {/* Waiting indicator */}
        {isWaitingForAction && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg z-10"
            title={
              settings?.useSocialistTheme
                ? "Waiting for comrade response"
                : "Waiting for player response"
            }
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
              <span className="text-emerald-300 text-sm ml-2 font-normal">
                ${bankTotal}M
              </span>
            </p>
            <div className="flex gap-3 text-xs">
              <span className="text-yellow-300">{completeSets}/3 sets</span>
              <span className="text-gray-400">{player.handCount} cards</span>
            </div>
          </div>
        </div>

        {/* Property sets with dynamic grid layout */}
        <div ref={setsContainerRef} className="w-full mt-2">
          {player.properties.length > 0 && setsLayout.length > 0 && (
            <div className="flex flex-col items-center gap-1">
              {setsLayout.map((setsInRow, rowIndex) => {
                const startIdx = setsLayout
                  .slice(0, rowIndex)
                  .reduce((sum, count) => sum + count, 0);
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
                        onWildcardClick={onWildcardClick}
                        isYou={isYou}
                        isCurrentTurn={isCurrentTurn}
                        isDragOver={dragOverSetColor === set.color}
                        onDragOver={
                          onDropToProperty
                            ? (e) => handleSetDragOver(e, set.color)
                            : undefined
                        }
                        onDragLeave={
                          onDropToProperty ? handleSetDragLeave : undefined
                        }
                        onDrop={
                          onDropToProperty
                            ? (e) => handleSetDrop(e, set.color)
                            : undefined
                        }
                        onDragStart={(e, card) => {
                          if (isYou && isCurrentTurn) {
                            e.dataTransfer.setData("cardId", card.id);
                            e.dataTransfer.setData(
                              "cardData",
                              JSON.stringify(card),
                            );
                            e.dataTransfer.setData("sourceColor", set.color);
                            e.dataTransfer.effectAllowed = "move";
                          }
                        }}
                        useSocialistTheme={settings?.useSocialistTheme}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty drop zone for new property sets (only when dragging property) */}
          {showEmptyDropZone && onDropToProperty && (
            <EmptyPropertyDropZone
              onDrop={onDropToProperty}
              onDropWildcard={onDropWildcard}
              existingColors={player.properties.map((s) => s.color)}
              settings={settings}
            />
          )}
        </div>

        {/* Empty placeholder to maintain alignment when no properties */}
        {player.properties.length === 0 && (
          <div className="w-full mt-2 h-[120px]" />
        )}

        {/* Combined bank + hand cards with fanned display - side by side */}
        <BankArea
          bankCards={bankCards}
          handBackCards={handCards.length > 0 ? handCards : handBackCards}
          showHandBacks={handCards.length === 0}
          isYou={isYou}
          showDropZones={!!showDropZones}
          isDragOverBank={isDragOverBank}
          onDropToBank={onDropToBank}
          onBankDragOver={handleBankDragOver}
          onBankDragLeave={handleBankDragLeave}
          onBankDrop={handleBankDrop}
          useSocialistTheme={settings?.useSocialistTheme}
        />
      </div>
    </motion.div>
  );
}
