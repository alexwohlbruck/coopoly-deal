import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import type { ClientPlayer, PropertySet, Card } from "../../types/game";
import {
  CardType,
  PropertyColor,
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
  isWaitingForAction?: boolean;
  onDropToBank?: (cardId: string) => void;
  onDropToProperty?: (cardId: string, color: PropertyColor) => void;
  onDropWildcard?: (card: Card) => void;
  onDropToRainbow?: (card: Card) => void;
  onWildcardClick?: (card: Card, currentColor: PropertyColor) => void;
  draggingCard?: Card | null;
  availableHeight?: number;
}

function PropertySetDisplay({
  set,
  onWildcardClick,
  isYou,
  isCurrentTurn,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  set: PropertySet;
  onWildcardClick?: (card: Card, currentColor: PropertyColor) => void;
  isYou: boolean;
  isCurrentTurn: boolean;
  isDragOver?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}) {
  const complete = isSetComplete(set);
  const color = PROPERTY_COLOR_HEX[set.color];

  const allCards = [
    ...set.cards,
    ...(set.house ? [set.house] : []),
    ...(set.hotel ? [set.hotel] : []),
  ];

  // Determine orientation for dual-color wildcards
  const getCardOrientation = (card: Card): "top" | "bottom" | undefined => {
    if (
      card.type !== CardType.PropertyWildcard ||
      !card.colors ||
      card.colors.length !== 2
    ) {
      return undefined;
    }
    // If the set color matches the SECOND color in the array, we want that color on bottom
    // So we return "bottom" to flip the card
    // If it matches the FIRST color, we want it on top, so return "top"
    return card.colors[1] === set.color ? "bottom" : "top";
  };

  return (
    <div
      className={`flex flex-col items-center gap-0.5 shrink-0 relative transition-all ${
        isDragOver ? "ring-4 ring-green-400 bg-green-400/10 rounded-lg p-1" : ""
      }`}
      data-property-drop-zone={set.color}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div
        className={`px-2 py-0.5 rounded text-center ${complete ? "ring-1 ring-yellow-400" : ""}`}
        style={{ backgroundColor: color }}
      >
        <p className="text-white font-bold text-[9px] sm:text-[10px]">
          {PROPERTY_COLOR_LABEL[set.color]} {set.cards.length}/
          {SET_SIZE[set.color]}
        </p>
      </div>

      {/* Use FannedCards for hover expansion with wildcard click support */}
      <FannedCards
        cards={allCards}
        small={true}
        maxVisible={8}
        getCardOrientation={getCardOrientation}
        onCardClick={
          isYou && isCurrentTurn && onWildcardClick
            ? (card) => {
                if (card.type === CardType.PropertyWildcard) {
                  onWildcardClick(card, set.color);
                }
              }
            : undefined
        }
      />
    </div>
  );
}

function EmptyPropertyDropZone({
  onDrop,
  onDropWildcard,
  existingColors,
}: {
  onDrop: (cardId: string, color: PropertyColor) => void;
  onDropWildcard?: (card: Card) => void;
  existingColors: PropertyColor[];
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    const cardData = e.dataTransfer.getData("cardData");
    if (!cardData) return;

    try {
      const card = JSON.parse(cardData);

      // Only allow property and wildcard cards
      if (
        card.type !== CardType.Property &&
        card.type !== CardType.PropertyWildcard
      ) {
        return;
      }

      // For properties, check if color already exists
      if (card.type === CardType.Property) {
        const cardColor = card.colors?.[0];
        if (cardColor && existingColors.includes(cardColor)) {
          return; // Color already exists
        }
      }

      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setIsDragOver(true);
    } catch (err) {
      return;
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const cardId = e.dataTransfer.getData("cardId");
    const cardData = e.dataTransfer.getData("cardData");

    if (!cardId || !cardData) return;

    try {
      const card = JSON.parse(cardData);

      // Only allow property and wildcard cards
      if (
        card.type !== CardType.Property &&
        card.type !== CardType.PropertyWildcard
      ) {
        return;
      }

      // Infer color from card
      let color: PropertyColor;

      if (card.type === CardType.Property) {
        // Regular property - use its fixed color
        color = card.colors?.[0];
        if (!color || existingColors.includes(color)) {
          return;
        }
      } else {
        // Wildcard - trigger the dialog instead of auto-assigning
        if (onDropWildcard) {
          onDropWildcard(card);
          return;
        }
        
        // Fallback
        const availableColors = card.colors?.filter(
          (c: PropertyColor) => !existingColors.includes(c),
        );
        if (availableColors && availableColors.length > 0) {
          color = availableColors[0];
        } else if (card.colors && card.colors.length > 1) {
          // Only multi-color wildcards can be unassigned
          color = PropertyColor.Unassigned;
        } else {
          // Single-color wildcard with no available color - reject
          return;
        }
      }

      onDrop(cardId, color);
    } catch (err) {
      return;
    }
  };

  return (
    <div
      className="mt-2 flex items-center justify-center"
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      data-property-drop-zone="new"
    >
      <div
        className={`w-32 h-20 rounded-lg border-2 border-dashed flex items-center justify-center transition-all ${
          isDragOver
            ? "border-green-400 bg-green-400/20 scale-105"
            : "border-gray-600 hover:border-gray-500"
        }`}
      >
        <span className="text-gray-400 text-xs text-center">New set</span>
      </div>
    </div>
  );
}

export function PlayerArea({
  player,
  isCurrentTurn,
  isYou,
  isWaitingForAction,
  onDropToBank,
  onDropToProperty,
  onDropWildcard,
  onDropToRainbow,
  onWildcardClick,
  draggingCard,
  availableHeight,
}: PlayerAreaProps) {
  const bankTotal = player.bank.reduce((sum, c) => sum + c.value, 0);
  const completeSets = player.properties.filter(isSetComplete).length;
  const [isDragOverBank, setIsDragOverBank] = useState(false);
  const [dragOverSetColor, setDragOverSetColor] =
    useState<PropertyColor | null>(null);

  // Show drop zones when dragging
  const isDraggingProperty = draggingCard && (draggingCard.type === CardType.Property || draggingCard.type === CardType.PropertyWildcard);
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
          if (color !== PropertyColor.Unassigned && !card.colors?.includes(color)) {
            e.dataTransfer.dropEffect = "none";
            return; // Wildcard doesn't support this color
          }
        }
      } catch (err) {
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
    const cardData = e.dataTransfer.getData("cardData");

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
            if (card.colors && card.colors.length > 2) {
              onDropToProperty(cardId, PropertyColor.Unassigned);
              return;
            } else if (onDropToRainbow) {
              onDropToRainbow(card);
              return;
            }
          } else if (!card.colors?.includes(color)) {
            return; // Wildcard doesn't support this color
          }
        }

        onDropToProperty(cardId, color);
      } catch (e) {
        // Invalid card data
        return;
      }
    }
  };

  const bankCards = player.bank;
  const handBackCards =
    !isYou && player.handCount > 0
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
      setSetsLayout([]);
      return;
    }

    const calculateLayout = () => {
      if (!setsContainerRef.current) return;

      const containerWidth = setsContainerRef.current.offsetWidth * 0.98;
      const numSets = player.properties.length;

      // Calculate set width based on FannedCards collapsed size
      // FannedCards: cardWidth + (avgCards - 1) * collapsedSpread
      // Assuming average of 3 cards per set: 64 + (3-1) * 8 = 80px
      const cardWidth = 64;
      const collapsedSpread = 8;
      const avgCardsPerSet = 3;
      const SET_WIDTH = cardWidth + (avgCardsPerSet - 1) * collapsedSpread; // ~80px
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
        maxHeight: availableHeight ? `${availableHeight}px` : undefined,
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
            title="Waiting for player response"
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
            />
          )}
        </div>

        {/* Empty placeholder to maintain alignment when no properties */}
        {player.properties.length === 0 && (
          <div className="w-full mt-2 h-[120px]" />
        )}

        {/* Combined bank + hand cards with fanned display - side by side */}
        {(bankCards.length > 0 ||
          handBackCards.length > 0 ||
          (isYou && onDropToBank)) && (
          <div className="mt-3 w-full flex items-center justify-center gap-3 flex-wrap">
            {/* Bank cards with drop zone */}
            <div
              className={`flex items-center relative transition-all ${
                isDragOverBank
                  ? "ring-4 ring-blue-400 bg-blue-400/10 rounded-lg p-2"
                  : showDropZones
                    ? "ring-2 ring-blue-400/50 ring-dashed rounded-lg p-1"
                    : ""
              }`}
              onDragOver={onDropToBank ? handleBankDragOver : undefined}
              onDragLeave={onDropToBank ? handleBankDragLeave : undefined}
              onDrop={onDropToBank ? handleBankDrop : undefined}
              data-bank-drop-zone={isYou ? "true" : undefined}
            >
              {bankCards.length > 0 ? (
                <FannedCards
                  cards={[...bankCards].sort((a, b) => a.value - b.value)}
                  small={true}
                  maxVisible={12}
                />
              ) : (
                isYou &&
                onDropToBank && (
                  <div
                    className={`w-20 h-8 border-2 border-dashed rounded-sm flex items-center justify-center transition-colors ${
                      showDropZones
                        ? "border-blue-400 bg-blue-400/10"
                        : "border-gray-600"
                    }`}
                  >
                    <span
                      className={`text-xs ${showDropZones ? "text-blue-300" : "text-gray-500"}`}
                    >
                      {showDropZones ? "Bank" : "Empty"}
                    </span>
                  </div>
                )
              )}
            </div>

            {/* Hand preview cards */}
            {handBackCards.length > 0 && (
              <div className="flex items-center">
                <FannedCards
                  cards={handBackCards}
                  small={true}
                  showBacks={true}
                  maxVisible={12}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
