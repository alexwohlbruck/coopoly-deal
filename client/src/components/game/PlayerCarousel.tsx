import { useEffect, useRef } from "react";
import type { ClientGameState, Card, PropertyColor } from "../../types/game";
import { PlayerArea } from "./PlayerArea";

import { isPlayerWaitingForAction } from "../../types/game";

interface PlayerCarouselProps {
  gameState: ClientGameState;
  playerId: string;
  playerAreaHeight?: number;
  draggingCard: Card | null;
  onPlayToBank: (cardId: string) => void;
  onPlayToProperty: (cardId: string, color: PropertyColor) => void;
  onRainbowDrop: (card: Card) => void;
  onWildcardClick: (card: Card, currentColor: PropertyColor) => void;
  playerRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

export function PlayerCarousel({
  gameState,
  playerId,
  playerAreaHeight,
  draggingCard,
  onPlayToBank,
  onPlayToProperty,
  onRainbowDrop,
  onWildcardClick,
  playerRefs,
}: PlayerCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const allPlayers = gameState.players;
  const me = gameState.players.find((p) => p.id === playerId);

  // Sync scroll position with current turn player
  useEffect(() => {
    const currentTurnPlayerId = gameState.turn?.playerId;
    if (!currentTurnPlayerId || !scrollContainerRef.current) return;

    const playerIndex = allPlayers.findIndex(
      (p) => p.id === currentTurnPlayerId,
    );
    if (playerIndex === -1) return;

    const targetEl = playerRefs.current[playerIndex];
    if (targetEl) {
      targetEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [gameState.turn?.playerId, allPlayers.length, allPlayers, playerRefs]);

  // Update transforms based on scroll position for circular arc effect
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateTransforms = () => {
      const containerWidth = container.clientWidth;
      const scrollLeft = container.scrollLeft;
      const scrollCenter = scrollLeft + containerWidth / 2;
      let closestDistance = Infinity;

      playerRefs.current.forEach((playerEl) => {
        if (!playerEl) return;

        // Use offsetLeft instead of getBoundingClientRect to avoid transform feedback loops
        const elementCenter = playerEl.offsetLeft + playerEl.offsetWidth / 2;

        // Distance from viewport center in pixels
        const pixelDistance = elementCenter - scrollCenter;

        // Track which player is closest to center for indicator
        const distanceToCenter = Math.abs(pixelDistance);
        if (distanceToCenter < closestDistance) {
          closestDistance = distanceToCenter;
        }

        // Normalize to a reasonable range for calculations
        const normalizedDistance = pixelDistance / (containerWidth / 2);

        // Clamp the distance to prevent extreme values at edges
        const clampedDistance = Math.max(
          -1.5,
          Math.min(1.5, normalizedDistance),
        );

        // Scale effect - center item is largest
        const minScale = 0.85;
        const scale = 1 - Math.abs(clampedDistance) * (1 - minScale);

        // Opacity effect - fade items at the edges
        const minOpacity = 0.5;
        const opacity = 1 - Math.abs(clampedDistance) * (1 - minOpacity);

        playerEl.style.transform = `scale(${scale})`;
        playerEl.style.transformOrigin = "center center";
        playerEl.style.opacity = `${Math.max(opacity, minOpacity)}`;
      });
    };

    container.addEventListener("scroll", updateTransforms, { passive: true });
    updateTransforms(); // Initial call

    // Also update on resize
    window.addEventListener("resize", updateTransforms);

    return () => {
      container.removeEventListener("scroll", updateTransforms);
      window.removeEventListener("resize", updateTransforms);
    };
  }, [allPlayers.length, playerRefs]);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
      {/* Scroll container - fixed height */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="absolute inset-0 flex gap-3 lg:gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide items-center"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            overflowY: "hidden",
            paddingLeft: "calc(50vw - 140px)",
            paddingRight: "calc(50vw - 140px)",
          }}
        >
          {allPlayers.map((player, idx) => {
            const isMe = player.id === playerId;
            const isWaiting = isPlayerWaitingForAction(gameState, player.id);

            return (
              <div
                key={player.id}
                ref={(el) => {
                  playerRefs.current[idx] = el;
                }}
                className="snap-center shrink-0 flex items-center justify-center"
                style={{
                  width: "90vw",
                  maxWidth: "900px",
                  transition: "transform 0.1s ease-out, opacity 0.1s ease-out",
                }}
              >
                <PlayerArea
                  player={player}
                  isCurrentTurn={gameState.turn?.playerId === player.id}
                  isYou={isMe}
                  settings={gameState.settings}
                  isWaitingForAction={isWaiting}
                  availableHeight={playerAreaHeight}
                  draggingCard={draggingCard}
                  onDropToBank={
                    isMe
                      ? (cardId) => {
                          const card = me?.hand?.find((c) => c.id === cardId);
                          if (card) {
                            onPlayToBank(cardId);
                          }
                        }
                      : undefined
                  }
                  onDropToProperty={
                    isMe
                      ? (cardId, color) => {
                          const card = me?.hand?.find((c) => c.id === cardId);
                          if (card) {
                            onPlayToProperty(cardId, color);
                          }
                        }
                      : undefined
                  }
                  onDropToRainbow={
                    isMe ? (card) => onRainbowDrop(card) : undefined
                  }
                  onWildcardClick={isMe ? onWildcardClick : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
