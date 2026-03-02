import { useState, useCallback, useEffect, useRef } from "react";
import type { Card, ClientGameState, PropertyColor } from "../../types/game";
import { GamePhase, TurnPhase, CardType } from "../../types/game";
import { useSoundSettings, useSoundManager } from "../../hooks/useSoundManager";
import { useTurnTimer } from "../../hooks/useTurnTimer";
import { useGameStore } from "../../hooks/useGameStore";
import { getTheme } from "../../theme/colors";
import { useI18n } from "../../i18n";
import { validateActionCard } from "../../utils/card-validation";
import { PlayerCarousel } from "./PlayerCarousel";
import { PlayerTurnBar } from "./PlayerTurnBar";
import { CardActionDialog } from "./CardActionDialog";
import { ActionPrompt } from "./ActionPrompt";
import { EndGameSummary } from "./EndGameSummary";
import { WildcardFlipDialog } from "./WildcardFlipDialog";
import { RainbowGroupDialog } from "./RainbowGroupDialog";
import { WildcardAssignmentPrompt } from "./WildcardAssignmentPrompt";
import { DevTools } from "../dev/DevTools";
import { SettingsPanel } from "./SettingsPanel";
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
  onPlayToProperty: (
    cardId: string,
    color: PropertyColor,
    groupWithUnassigned?: boolean,
    createNewSet?: boolean,
  ) => void;
  onPlayAction: (payload: Record<string, unknown>) => void;
  onRearrangeProperty?: (
    cardId: string,
    toColor: PropertyColor,
    createNewSet?: boolean,
  ) => void;
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
  const [shakingCardId, setShakingCardId] = useState<string | null>(null);
  const [wildcardFlipData, setWildcardFlipData] = useState<{
    card: Card;
    currentColor: PropertyColor;
  } | null>(null);
  const [rainbowDropData, setRainbowDropData] = useState<{ card: Card } | null>(
    null,
  );
  const [draggingCard, setDraggingCard] = useState<Card | null>(null);
  const { sfxEnabled, toggleSfx } = useSoundSettings();
  const { play } = useSoundManager();
  const { theme, setToast } = useGameStore();
  const colors = getTheme(theme);
  const { t } = useI18n();
  const playerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [playerAreaHeight, setPlayerAreaHeight] = useState<number | undefined>(
    undefined,
  );
  const headerRef = useRef<HTMLDivElement>(null);
  const turnControlsRef = useRef<HTMLDivElement>(null);
  const cardHandRef = useRef<HTMLDivElement>(null);

  const me = gameState.players.find((p) => p.id === playerId);

  // Calculate available height for player areas
  useEffect(() => {
    const calculateHeight = () => {
      const windowHeight = window.innerHeight;
      const headerHeight = headerRef.current?.offsetHeight || 0;
      const controlsHeight = turnControlsRef.current?.offsetHeight || 0;
      const handHeight = cardHandRef.current?.offsetHeight || 0;

      const availableHeight =
        windowHeight - headerHeight - controlsHeight - handHeight - 32;
      setPlayerAreaHeight(Math.max(200, availableHeight));
    };

    calculateHeight();
    window.addEventListener("resize", calculateHeight);

    const resizeObserver = new ResizeObserver(calculateHeight);
    if (headerRef.current) resizeObserver.observe(headerRef.current);
    if (turnControlsRef.current)
      resizeObserver.observe(turnControlsRef.current);
    if (cardHandRef.current) resizeObserver.observe(cardHandRef.current);

    return () => {
      window.removeEventListener("resize", calculateHeight);
      resizeObserver.disconnect();
    };
  }, []);

  // Check if selected card is still in hand
  const isCardStillInHand =
    selectedCard && me?.hand?.some((c) => c.id === selectedCard.id);

  // Auto-close dialog if card is no longer in hand
  useEffect(() => {
    if (selectedCard && !isCardStillInHand) {
      console.log("[GameTable] Card no longer in hand, closing dialog");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCard(null);
    }
  }, [selectedCard, isCardStillInHand]);
  const opponents = gameState.players.filter((p) => p.id !== playerId);
  const isMyTurn = gameState.turn?.playerId === playerId;
  const turnPhase = gameState.turn?.phase;
  const cardsPlayed = gameState.turn?.cardsPlayed ?? 0;
  const timeLeft = useTurnTimer(
    gameState.phase === GamePhase.Finished
      ? null
      : (gameState.turn?.expiresAt ?? null),
    gameState.phase === GamePhase.Finished
      ? null
      : (gameState.turn?.pausedTimeLeft ?? null),
    play,
  );
  const pendingAction = gameState.turn?.pendingAction;
  const pendingWildcardAssignment =
    gameState.turn?.pendingWildcardAssignments?.[0] ||
    gameState.turn?.pendingWildcardAssignment;
  const hasResigned = me?.connected === false;

  const [isDiscarding, setIsDiscarding] = useState(false);

  useEffect(() => {
    if (!isMyTurn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsDiscarding(false);
    }
  }, [isMyTurn]);

  const hasTooManyCards =
    isMyTurn &&
    me &&
    me.hand &&
    gameState.settings.maxHandSize !== 999 &&
    me.hand.length > gameState.settings.maxHandSize;

  const needsDiscard = hasTooManyCards && (cardsPlayed >= 3 || isDiscarding);

  const handleEndTurn = useCallback(() => {
    if (hasTooManyCards) {
      setIsDiscarding(true);
    } else {
      onEndTurn();
    }
  }, [hasTooManyCards, onEndTurn]);

  const handleCardClick = (card: Card) => {
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
      if (
        me &&
        me.hand &&
        me.hand.length - 1 <= gameState.settings.maxHandSize
      ) {
        if (cardsPlayed >= 3 || isDiscarding) {
          onEndTurn();
        }
      }
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

    // Just Say No cannot be played as an action on your turn, only banked
    // We don't want to show the action dialog for it, just shake it to indicate
    // it should be dragged to the bank if they want to bank it.
    if (card.type === CardType.JustSayNo) {
      setToast(
        gameState.settings?.useSocialistTheme
          ? "Just Say No can only be played when a directive is played against you, or banked."
          : "Just Say No can only be played when an action is played against you, or banked.",
      );
      setShakingCardId(card.id);
      play("error");
      setTimeout(() => setShakingCardId(null), 300);
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
    const isActionCard = validatableCardTypes.some(
      (type) => type === card.type,
    );

    if (isActionCard) {
      const validation = validateActionCard(
        card,
        gameState,
        playerId,
        gameState.settings?.useSocialistTheme,
      );
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
  };

  const handlePlayToProperty = useCallback(
    (
      cardId: string,
      color: PropertyColor,
      groupWithUnassigned?: boolean,
      createNewSet?: boolean,
    ) => {
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

  const handleRainbowDropConfirm = useCallback(
    (color: PropertyColor, createNewSet: boolean, wildcardIds: string[]) => {
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
    },
    [rainbowDropData, onPlayToProperty, onRearrangeProperty],
  );

  if (gameState.phase === GamePhase.Finished) {
    return (
      <EndGameSummary
        players={gameState.players}
        winnerId={gameState.winner}
        currentPlayerId={playerId}
        settings={gameState.settings}
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
          {import.meta.env.MODE === "development" && onDevInjectCard && (
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
        <PlayerCarousel
          gameState={gameState}
          playerId={playerId}
          playerAreaHeight={playerAreaHeight}
          draggingCard={draggingCard}
          onPlayToBank={onPlayToBank}
          onPlayToProperty={onPlayToProperty}
          onRainbowDrop={(card) => setRainbowDropData({ card })}
          onWildcardClick={handleWildcardClick}
          playerRefs={playerRefs}
        />

        {/* Rent multiplier indicator */}
        {gameState.turn && gameState.turn.rentMultiplier > 1 && (
          <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-yellow-500 text-black px-4 py-2 rounded-lg shadow-lg font-bold text-sm animate-pulse">
              🎯 {gameState.settings?.useSocialistTheme ? "Levy" : "Rent"}{" "}
              Doubled! ({gameState.turn.rentMultiplier}x)
            </div>
          </div>
        )}
      </div>

      {/* Turn bar and hand */}
      {me && (
        <PlayerTurnBar
          gameState={gameState}
          playerId={playerId}
          playerRefs={playerRefs}
          cardHandRef={cardHandRef}
          needsDiscard={needsDiscard ?? false}
          timeLeft={timeLeft}
          selectedCard={selectedCard}
          shakingCardId={shakingCardId}
          onEndTurn={handleEndTurn}
          onCardClick={handleCardClick}
          onPlayToBank={onPlayToBank}
          setDraggingCard={setDraggingCard}
        />
      )}

      {/* Card action dialog - only show if card is still in hand */}
      {selectedCard && me && isCardStillInHand && (
        <CardActionDialog
          card={selectedCard}
          player={me}
          opponents={opponents}
          settings={gameState.settings}
          rentMultiplier={gameState.turn?.rentMultiplier ?? 1}
          cardsPlayed={gameState.turn?.cardsPlayed ?? 0}
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
          settings={gameState.settings}
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
          settings={gameState.settings}
          currentColor={wildcardFlipData.currentColor}
          onFlip={handleWildcardFlip}
          onClose={() => setWildcardFlipData(null)}
        />
      )}

      {/* Wildcard Assignment Prompt (when receiving wildcard via steal/swap) */}
      {pendingWildcardAssignment &&
        pendingWildcardAssignment.playerId === playerId &&
        me &&
        onAssignReceivedWildcard && (
          <WildcardAssignmentPrompt
            assignment={pendingWildcardAssignment}
            card={
              me.properties
                .flatMap((s) => s.cards)
                .find((c) => c.id === pendingWildcardAssignment.cardId)!
            }
            settings={gameState.settings}
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
          settings={gameState.settings}
          onClose={() => setRainbowDropData(null)}
          onConfirm={handleRainbowDropConfirm}
        />
      )}

      {/* Developer Tools Modal (only in development mode) */}
      {import.meta.env.MODE === "development" &&
        onDevInjectCard &&
        onDevGiveCompleteSet &&
        onDevSetMoney && (
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
