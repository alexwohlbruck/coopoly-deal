import { useState, useCallback, useEffect, useRef } from "react";
import type { Card, ClientGameState, PropertyColor } from "../../types/game";
import { GamePhase, TurnPhase, CardType } from "../../types/game";
import { useSoundSettings, useSoundManager } from "../../hooks/useSoundManager";
import { useGameStore } from "../../hooks/useGameStore";
import { getTheme } from "../../theme/colors";
import { useI18n } from "../../i18n";
import { validateActionCard } from "../../utils/card-validation";
import { PlayerArea } from "./PlayerArea";
import { CardHand } from "./CardHand";
import { CardActionDialog } from "./CardActionDialog";
import { ActionPrompt } from "./ActionPrompt";
import { EndGameSummary } from "./EndGameSummary";
import { WildcardFlipDialog } from "./WildcardFlipDialog";
import { RainbowGroupDialog } from "./RainbowGroupDialog";
import { WildcardAssignmentPrompt } from "./WildcardAssignmentPrompt";
import { DevTools } from "../dev/DevTools";
import { SettingsPanel } from "./SettingsPanel";
import { CardBack } from "../cards/GameCard";
import { Settings } from "lucide-react";

interface GameTableProps {
  gameState: ClientGameState;
  playerId: string;
  sessionStats?: {
    wins: number;
    losses: number;
    streak: number;
    gamesPlayed: number;
  };
  onPlayToBank: (cardId: string) => void;
  onPlayToProperty: (cardId: string, color: PropertyColor, groupWithUnassigned?: boolean, createNewSet?: boolean) => void;
  onPlayAction: (payload: Record<string, unknown>) => void;
  onRearrangeProperty?: (cardId: string, toColor: PropertyColor, createNewSet?: boolean) => void;
  onAssignReceivedWildcard?: (cardId: string, color: PropertyColor) => void;
  onEndTurn: () => void;
  onDiscardCards: (cardIds: string[]) => void;
  onPayWithCards: (cardIds: string[]) => void;
  onJustSayNo: () => void;
  onAcceptAction: () => void;
  onRematch?: () => void;
  onGoHome?: () => void;
  onResign?: () => void;
  musicControls?: {
    isPlaying: boolean;
    onToggle: () => void;
    onNext: () => void;
  };
  onDevInjectCard?: (
    cardType: CardType,
    targetPlayerId: string,
    colors?: PropertyColor[],
  ) => void;
  onDevGiveCompleteSet?: (color: PropertyColor, targetPlayerId: string) => void;
  onDevSetMoney?: (amount: number, targetPlayerId: string) => void;
}

export function GameTable({
  gameState,
  playerId,
  sessionStats,
  onPlayToBank,
  onPlayToProperty,
  onPlayAction,
  onRearrangeProperty,
  onAssignReceivedWildcard,
  onEndTurn,
  onDiscardCards,
  onPayWithCards,
  onJustSayNo,
  onAcceptAction,
  onRematch,
  onGoHome,
  onResign,
  musicControls,
  onDevInjectCard,
  onDevGiveCompleteSet,
  onDevSetMoney,
}: GameTableProps) {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [shakingCardId, setShakingCardId] = useState<string | null>(null);
  const [wildcardFlipData, setWildcardFlipData] = useState<{ card: Card; currentColor: PropertyColor } | null>(null);
  const [rainbowDropData, setRainbowDropData] = useState<{ card: Card } | null>(null);
  const [draggingCard, setDraggingCard] = useState<Card | null>(null);
  const { sfxEnabled, toggleSfx} = useSoundSettings();
  const { play } = useSoundManager();
  const { theme, setToast } = useGameStore();
  const colors = getTheme(theme);
  const { t } = useI18n();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const playerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [playerAreaHeight, setPlayerAreaHeight] = useState<number | undefined>(undefined);
  const headerRef = useRef<HTMLDivElement>(null);
  const playerIndicatorRef = useRef<HTMLDivElement>(null);
  const turnControlsRef = useRef<HTMLDivElement>(null);
  const cardHandRef = useRef<HTMLDivElement>(null);

  const me = gameState.players.find((p) => p.id === playerId);
  const allPlayers = gameState.players;

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
  }, [gameState.turn?.playerId, allPlayers]);

  // Calculate available height for player areas
  useEffect(() => {
    const calculateHeight = () => {
      const windowHeight = window.innerHeight;
      const headerHeight = headerRef.current?.offsetHeight || 0;
      const indicatorHeight = playerIndicatorRef.current?.offsetHeight || 0;
      const controlsHeight = turnControlsRef.current?.offsetHeight || 0;
      const handHeight = cardHandRef.current?.offsetHeight || 0;
      
      const availableHeight = windowHeight - headerHeight - indicatorHeight - controlsHeight - handHeight - 32;
      setPlayerAreaHeight(Math.max(200, availableHeight));
    };

    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    
    const resizeObserver = new ResizeObserver(calculateHeight);
    if (headerRef.current) resizeObserver.observe(headerRef.current);
    if (playerIndicatorRef.current) resizeObserver.observe(playerIndicatorRef.current);
    if (turnControlsRef.current) resizeObserver.observe(turnControlsRef.current);
    if (cardHandRef.current) resizeObserver.observe(cardHandRef.current);
    
    return () => {
      window.removeEventListener('resize', calculateHeight);
      resizeObserver.disconnect();
    };
  }, []);

  // Update transforms based on scroll position for circular arc effect
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateTransforms = () => {
      const containerRect = container.getBoundingClientRect();
      const centerX = containerRect.left + containerRect.width / 2;
      let closestIndex = 0;
      let closestDistance = Infinity;

      playerRefs.current.forEach((playerEl, idx) => {
        if (!playerEl) return;

        const rect = playerEl.getBoundingClientRect();
        const elementCenterX = rect.left + rect.width / 2;

        // Track which player is closest to center for indicator
        const distanceToCenter = Math.abs(elementCenterX - centerX);
        if (distanceToCenter < closestDistance) {
          closestDistance = distanceToCenter;
          closestIndex = idx;
        }

        // Distance from viewport center in pixels
        const pixelDistance = elementCenterX - centerX;

        // Normalize to a reasonable range for calculations
        const normalizedDistance = pixelDistance / (containerRect.width / 2);

        // Clamp the distance to prevent extreme values at edges
        const clampedDistance = Math.max(
          -1.5,
          Math.min(1.5, normalizedDistance),
        );

        // Create circular arc effect
        const arcDepth = 60;
        const verticalOffset = Math.pow(clampedDistance, 2) * arcDepth;

        // Rotation effect - items rotate as they move around the arc
        const maxRotation = 10;
        const rotation = clampedDistance * maxRotation;

        // Scale effect - center item is largest
        const minScale = 0.88;
        const scale = 1 - Math.abs(clampedDistance) * (1 - minScale);

        // Opacity effect - fade items at the edges
        const minOpacity = 0.7;
        const opacity = 1 - Math.abs(clampedDistance) * (1 - minOpacity);

        playerEl.style.transform = `translateY(${verticalOffset}px) rotateZ(${rotation}deg) scale(${scale})`;
        playerEl.style.opacity = `${Math.max(opacity, minOpacity)}`;
      });

      setCurrentPlayerIndex(closestIndex);
    };

    container.addEventListener("scroll", updateTransforms, { passive: true });
    updateTransforms(); // Initial call

    // Also update on resize
    window.addEventListener("resize", updateTransforms);

    return () => {
      container.removeEventListener("scroll", updateTransforms);
      window.removeEventListener("resize", updateTransforms);
    };
  }, [allPlayers.length]);

  // Check if selected card is still in hand
  const isCardStillInHand =
    selectedCard && me?.hand?.some((c) => c.id === selectedCard.id);

  // Auto-close dialog if card is no longer in hand
  useEffect(() => {
    if (selectedCard && !isCardStillInHand) {
      console.log("[GameTable] Card no longer in hand, closing dialog");
      setSelectedCard(null);
    }
  }, [selectedCard, isCardStillInHand]);
  const opponents = gameState.players.filter((p) => p.id !== playerId);
  const isMyTurn = gameState.turn?.playerId === playerId;
  const turnPhase = gameState.turn?.phase;
  const cardsPlayed = gameState.turn?.cardsPlayed ?? 0;
  const pendingAction = gameState.turn?.pendingAction;
  const pendingWildcardAssignment = gameState.turn?.pendingWildcardAssignment;
  const currentTurnPlayer = gameState.players.find(
    (p) => p.id === gameState.turn?.playerId,
  );
  const hasResigned = me?.connected === false;

  const needsDiscard = isMyTurn && me && me.hand && me.hand.length > 7;

  const handleCardClick = useCallback(
    (card: Card) => {
      console.log("[GameTable] handleCardClick", {
        cardType: card.type,
        cardId: card.id,
        isMyTurn,
        turnPhase,
        needsDiscard,
      });

      if (!isMyTurn) return;
      if (turnPhase === TurnPhase.ActionPending) return;

      if (needsDiscard) {
        onDiscardCards([card.id]);
        return;
      }

      // Only pure money cards can be clicked to bank
      // Action cards need to show the dialog even if they CAN be banked
      const isPureMoneyCard = card.type === CardType.Money;

      if (isPureMoneyCard) {
        onPlayToBank(card.id);
        return;
      }

      // For property cards with single color, auto-play to property
      if (
        card.type === CardType.Property &&
        card.colors &&
        card.colors.length === 1
      ) {
        onPlayToProperty(card.id, card.colors[0]);
        return;
      }

      // Validate action cards before opening dialog
      const validatableCardTypes = [
        CardType.DealBreaker,
        CardType.SlyDeal,
        CardType.ForceDeal,
        CardType.RentDual,
        CardType.RentWild,
        CardType.House,
        CardType.Hotel,
        CardType.DoubleTheRent,
      ];
      const isActionCard = validatableCardTypes.some(type => type === card.type);

      if (isActionCard) {
        const validation = validateActionCard(card, gameState, playerId);
        if (!validation.valid) {
          // Show error feedback
          setToast(validation.reason || "Cannot play this card");
          setShakingCardId(card.id);
          play("error");
          setTimeout(() => setShakingCardId(null), 300);
          return;
        }
      }

      // For all other cards (action cards, wildcards), show dialog for selection
      console.log("[GameTable] Opening dialog for card", card.id);
      setSelectedCard(card);
    },
    [
      isMyTurn,
      turnPhase,
      needsDiscard,
      onDiscardCards,
      onPlayToBank,
      onPlayToProperty,
      gameState,
      playerId,
      setToast,
    ],
  );

  const handlePlayToProperty = useCallback(
    (cardId: string, color: PropertyColor, groupWithUnassigned?: boolean, createNewSet?: boolean) => {
      onPlayToProperty(cardId, color, groupWithUnassigned, createNewSet);
      setSelectedCard(null);
    },
    [onPlayToProperty],
  );

  const handlePlayAction = useCallback(
    (payload: Record<string, unknown>) => {
      console.log("[GameTable] handlePlayAction called", payload);
      onPlayAction(payload);
      console.log("[GameTable] Setting selectedCard to null");
      setSelectedCard(null);
    },
    [onPlayAction],
  );

  const handleWildcardClick = useCallback(
    (card: Card, currentColor: PropertyColor) => {
      if (!isMyTurn) return;
      setWildcardFlipData({ card, currentColor });
    },
    [isMyTurn],
  );

  const handleWildcardFlip = useCallback(
    (newColor: PropertyColor) => {
      if (!wildcardFlipData || !onRearrangeProperty) return;
      // Send REARRANGE_PROPERTY message
      onRearrangeProperty(wildcardFlipData.card.id, newColor);
      setWildcardFlipData(null);
    },
    [wildcardFlipData, onRearrangeProperty],
  );

  const handleRainbowDropConfirm = useCallback((color: PropertyColor, createNewSet: boolean, wildcardIds: string[]) => {
    if (!rainbowDropData) return;
    const cardId = rainbowDropData.card.id;
    
    // Play the card
    onPlayToProperty(cardId, color, false, createNewSet);
    
    // Move the wildcards
    if (onRearrangeProperty) {
      wildcardIds.forEach((id) => {
        onRearrangeProperty(id, color, false);
      });
    }
    
    setRainbowDropData(null);
  }, [rainbowDropData, onPlayToProperty, onRearrangeProperty]);

  if (gameState.phase === GamePhase.Finished) {
    return (
      <EndGameSummary
        players={gameState.players}
        winnerId={gameState.winner}
        currentPlayerId={playerId}
        sessionStats={sessionStats}
        onRematch={onRematch}
        onGoHome={onGoHome}
      />
    );
  }

  return (
    <div
      className={`h-screen ${colors.tableBackground} felt-texture flex flex-col overflow-hidden touch-pan-x`}
      style={{ overscrollBehavior: "none" }}
    >
      {/* Top bar */}
      <div 
        ref={headerRef}
        className="flex items-center justify-between px-4 py-2 bg-black/20 border-b border-white/10"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-white font-black text-lg">Co-Opoly Deal</h1>
          <span className="text-emerald-400 text-xs font-mono bg-white/10 px-2 py-0.5 rounded">
            {gameState.id}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {import.meta.env.MODE === 'development' && onDevInjectCard && (
            <button
              onClick={() => setShowDevTools(true)}
              className="px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded text-xs transition-colors"
            >
              Dev Tools
            </button>
          )}
          {gameState.phase === GamePhase.Playing &&
            !hasResigned &&
            onResign && (
              <button
                onClick={onResign}
                className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white font-semibold rounded text-xs transition-colors"
              >
                {t.game.resign}
              </button>
            )}
          {hasResigned && onGoHome && (
            <button
              onClick={onGoHome}
              className="px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded text-xs transition-colors"
            >
              Leave
            </button>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="text-gray-400 hover:text-white bg-white/10 p-1.5 rounded transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Game area */}
      <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        {/* All players area - horizontal carousel with scroll snap */}
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          {/* Scroll container - fixed height */}
          <div className="flex-1 relative overflow-hidden">
            <div
              ref={scrollContainerRef}
              className="absolute inset-0 flex gap-3 lg:gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide items-start pt-4"
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
                const isWaiting = !!(
                  pendingAction &&
                  pendingAction.targetPlayerIds.includes(player.id) &&
                  !pendingAction.respondedPlayerIds.includes(player.id) &&
                  pendingAction.sourcePlayerId === playerId
                );

                return (
                  <div
                    key={player.id}
                    ref={(el) => {
                      playerRefs.current[idx] = el;
                    }}
                    className="snap-center shrink-0 flex items-start justify-center"
                    style={{
                      width: "90vw",
                      maxWidth: "900px",
                      transition:
                        "transform 0.1s ease-out, opacity 0.1s ease-out",
                    }}
                  >
                    <PlayerArea
                      player={player}
                      isCurrentTurn={gameState.turn?.playerId === player.id}
                      isYou={isMe}
                      isWaitingForAction={isWaiting}
                      availableHeight={playerAreaHeight}
                      draggingCard={draggingCard}
                      onDropToBank={
                        isMe
                          ? (cardId) => {
                              const card = me?.hand?.find(
                                (c) => c.id === cardId,
                              );
                              if (card) {
                                onPlayToBank(cardId);
                              }
                            }
                          : undefined
                      }
                      onDropToProperty={
                        isMe
                          ? (cardId, color) => {
                              const card = me?.hand?.find(
                                (c) => c.id === cardId,
                              );
                              if (card) {
                                onPlayToProperty(cardId, color);
                              }
                            }
                          : undefined
                      }
                      onDropToRainbow={isMe ? (card) => setRainbowDropData({ card }) : undefined}
                      onWildcardClick={isMe ? handleWildcardClick : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Player indicator pills - fixed position */}
          <div 
            ref={playerIndicatorRef}
            className="flex flex-wrap gap-1.5 justify-center px-2 py-2 bg-black/20 border-t border-white/10"
          >
            {allPlayers.map((player, idx) => {
              const isActive = idx === currentPlayerIndex;
              const isMe = player.id === playerId;

              return (
                <button
                  key={player.id}
                  onClick={() => {
                    const container = scrollContainerRef.current;
                    if (!container || !playerRefs.current[idx]) return;

                    const targetEl = playerRefs.current[idx];
                    if (targetEl) {
                      targetEl.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                        inline: "center",
                      });
                    }
                  }}
                  className={`
                    px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold transition-all whitespace-nowrap
                    ${
                      isActive
                        ? "bg-yellow-400 text-gray-900 scale-110"
                        : "bg-white/20 text-white/70 hover:bg-white/30"
                    }
                    ${isMe ? "ring-1 ring-blue-400" : ""}
                  `}
                >
                  {player.name.split(" ")[0]}
                  {isMe && " (you)"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rent multiplier indicator */}
        {gameState.turn && gameState.turn.rentMultiplier > 1 && (
          <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-yellow-500 text-black px-4 py-2 rounded-lg shadow-lg font-bold text-sm animate-pulse">
              🎯 Rent Doubled! ({gameState.turn.rentMultiplier}x)
            </div>
          </div>
        )}
      </div>

      {/* Turn bar and hand */}
      {me && (
        <div 
          className="z-10 border-t border-white/10 bg-black/20 max-h-[50vh] flex flex-col shrink-0"
        >
          {/* Combined turn info bar with deck/discard */}
          <div className="flex items-center justify-between px-4 py-2 shrink-0">
            {/* Deck/Discard - left side */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <CardBack small={true} />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-white text-sm font-bold drop-shadow-lg">
                    {gameState.deckCount}
                  </span>
                </div>
              </div>
              <div className="relative">
                <CardBack small={true} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-gray-200 text-[8px] font-bold drop-shadow">
                    Discard
                  </span>
                  <span className="text-white text-sm font-bold drop-shadow-lg">
                    {gameState.discardPile.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Turn info - center */}
            <div className="text-center flex-1">
              {isMyTurn ? (
                <div>
                  <p className="text-yellow-400 font-bold text-sm">Your Turn</p>
                  <p className="text-gray-400 text-xs">
                    {needsDiscard
                      ? `Discard ${(me?.hand?.length ?? 0) - 7} card(s)`
                      : `${cardsPlayed}/3 cards played`}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-300 text-sm">
                    {currentTurnPlayer?.name}'s turn
                  </p>
                  <p className="text-gray-500 text-xs">
                    {turnPhase === TurnPhase.ActionPending
                      ? "Waiting for responses..."
                      : "Playing..."}
                  </p>
                </div>
              )}
            </div>

            {/* End Turn Button - aligned to right */}
            {isMyTurn &&
              !needsDiscard &&
              turnPhase !== TurnPhase.ActionPending && (
                <button
                  onClick={onEndTurn}
                  className={`px-4 py-1.5 ${colors.primary} ${colors.primaryHover} text-white font-semibold rounded transition-colors text-sm shrink-0`}
                >
                  {t.game.endTurn}
                </button>
              )}

            {/* Spacer when no button to maintain layout */}
            {(!isMyTurn ||
              needsDiscard ||
              turnPhase === TurnPhase.ActionPending) && (
              <div className="shrink-0" style={{ width: "90px" }}></div>
            )}
          </div>

          {/* My hand */}
          <div 
            ref={cardHandRef}
            className="border-t border-white/10 overflow-y-auto flex-1"
          >
            <div className="px-2 py-3">
              <CardHand
                cards={me.hand ?? []}
                onCardClick={handleCardClick}
                selectedCardId={selectedCard?.id ?? null}
                shakingCardId={shakingCardId}
                disabled={!isMyTurn || turnPhase === TurnPhase.ActionPending}
                onDragToBank={(card) => onPlayToBank(card.id)}
                onDragStart={(card) => setDraggingCard(card)}
                onDragEnd={() => setDraggingCard(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Card action dialog - only show if card is still in hand */}
      {selectedCard && me && isCardStillInHand && (
        <CardActionDialog
          card={selectedCard}
          player={me}
          opponents={opponents}
          rentMultiplier={gameState.turn?.rentMultiplier ?? 1}
          onClose={() => {
            console.log("[GameTable] Dialog onClose called (user canceled)");
            setSelectedCard(null);
          }}
          onPlayToProperty={handlePlayToProperty}
          onPlayAction={handlePlayAction}
        />
      )}

      {/* Pending action prompt */}
      {pendingAction && me && (
        <ActionPrompt
          action={pendingAction}
          playerId={playerId}
          players={gameState.players}
          onPayWithCards={onPayWithCards}
          onJustSayNo={onJustSayNo}
          onAccept={onAcceptAction}
        />
      )}

      {/* Wildcard Flip Dialog */}
      {wildcardFlipData && me && (
        <WildcardFlipDialog
          card={wildcardFlipData.card}
          player={me}
          currentColor={wildcardFlipData.currentColor}
          onFlip={handleWildcardFlip}
          onClose={() => setWildcardFlipData(null)}
        />
      )}

      {/* Wildcard Assignment Prompt (when receiving wildcard via steal/swap) */}
      {pendingWildcardAssignment && pendingWildcardAssignment.playerId === playerId && me && onAssignReceivedWildcard && (
        <WildcardAssignmentPrompt
          assignment={pendingWildcardAssignment}
          card={me.properties
            .flatMap(s => s.cards)
            .find(c => c.id === pendingWildcardAssignment.cardId)!}
          onAssign={onAssignReceivedWildcard}
        />
      )}

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentHandLimit={gameState.settings?.maxHandSize ?? 7}
        canEdit={false}
        sfxEnabled={sfxEnabled}
        onToggleSfx={toggleSfx}
        musicControls={musicControls}
      />

      {/* Rainbow Drop Dialog */}
      {rainbowDropData && me && (
        <RainbowGroupDialog
          card={rainbowDropData.card}
          player={me}
          onClose={() => setRainbowDropData(null)}
          onConfirm={handleRainbowDropConfirm}
        />
      )}

      {/* Developer Tools Modal (only in development mode) */}
      {import.meta.env.MODE === 'development' && onDevInjectCard && onDevGiveCompleteSet && onDevSetMoney && (
        <DevTools
          isOpen={showDevTools}
          onClose={() => setShowDevTools(false)}
          players={gameState.players}
          currentPlayerId={playerId}
          onInjectCard={onDevInjectCard}
          onGiveCompleteSet={onDevGiveCompleteSet}
          onSetMoney={onDevSetMoney}
        />
      )}
    </div>
  );
}
