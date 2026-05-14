import { useState, useCallback, useEffect, useRef } from "react";
import type { Card, ClientGameState, PropertyColor } from "../../types/game";
import {
  GamePhase,
  TurnPhase,
  CardType,
  PropertyColor as PropertyColorEnum,
  isSetComplete,
  getPropertyColorLabel,
} from "../../types/game";
import { useSoundSettings, useSoundManager } from "../../hooks/useSoundManager";
import { useTurnTimer } from "../../hooks/useTurnTimer";
import { useGameStore } from "../../hooks/useGameStore";
import { useI18n } from "../../i18n";
import { getTheme } from "../../theme/colors";
import { validateActionCard } from "../../utils/card-validation";
import { PlayerTurnBar } from "./PlayerTurnBar";
import { CardActionDialog } from "./CardActionDialog";
import { ActionPrompt } from "./ActionPrompt";
import { EndGameSummary } from "./EndGameSummary";
import { WildcardFlipDialog } from "./WildcardFlipDialog";
import { RainbowGroupDialog } from "./RainbowGroupDialog";
import { WildcardAssignmentPrompt } from "./WildcardAssignmentPrompt";
import { DevTools } from "../dev/DevTools";
import { SettingsPanel } from "./SettingsPanel";
import { CreditsModal } from "../common/CreditsModal";
import { ShareModal } from "./ShareModal";
import { useModalParam } from "../../hooks/useModalParam";
import { TopBar } from "./layout/Chrome";
import { GameTableDesktop } from "./layout/GameTableDesktop";
import { GameTableCompact } from "./layout/GameTableCompact";
import { useLayout } from "../../hooks/useLayout";

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
  onReturnToLobby?: () => void;
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
  onReturnToLobby,
  onGoHome,
  onResign,
  musicControls,
  onDevInjectCard,
  onDevGiveCompleteSet,
  onDevSetMoney,
}: GameTableProps) {
  const { t } = useI18n();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const { modal, open: openModal, close: closeModal } = useModalParam();
  const showSettings = modal === "settings";
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
  const { theme, useSocialistTheme, setToast } = useGameStore();
  const themeData = getTheme(theme);
  const layoutMode = useLayout();
  const playerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const headerRef = useRef<HTMLDivElement>(null);
  const turnControlsRef = useRef<HTMLDivElement>(null);
  const cardHandRef = useRef<HTMLDivElement>(null);

  const me = gameState.players.find((p) => p.id === playerId);

  // Recalculate layout on window resize
  useEffect(() => {
    const calculateHeight = () => {
      // Trigger re-render on resize
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
  // If the turn ends while a dialog/prompt is open (e.g. the player
  // started picking targets for a Force Deal but ran out the clock),
  // close the dialog and toast a clear message instead of leaving an
  // orphaned prompt over a turn that's no longer ours.
  useEffect(() => {
    if (selectedCard && !isMyTurn) {
      console.log("[GameTable] Turn ended while dialog open, closing");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCard(null);
      setToast(t.game.timesUp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn]);
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
        useSocialistTheme
          ? `${t.socialist.counterIntelligence.replace("!", "")} can only be played when a directive is played against you, or banked.`
          : `${t.actions.justSayNo} can only be played when an action is played against you, or banked.`,
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
        useSocialistTheme,
      );
      if (!validation.valid) {
        // Show error feedback
        setToast(validation.reason || t.game.cannotPlay);
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

  // ── Unified drop callbacks for pointer-drag (used by CardHand) ──
  // These must be defined before the early return for GamePhase.Finished
  // so the hook count is stable across renders (Rules of Hooks).
  const handleDropToProperty = useCallback(
    (card: Card, color: PropertyColor) => {
      if (
        card.type !== CardType.Property &&
        card.type !== CardType.PropertyWildcard &&
        card.type !== CardType.House &&
        card.type !== CardType.Hotel
      ) {
        setToast("Only property cards can be placed on a property set.");
        return;
      }
      onPlayToProperty(card.id, color);
    },
    [onPlayToProperty, setToast],
  );

  const handleCreateNewSet = useCallback(
    (card: Card) => {
      // Wildcards / rainbow cards have no inherent single color — defer
      // to the tap-to-play dialog (CardActionDialog) which lets the
      // player pick a color.
      if (card.type !== CardType.Property) {
        handleCardClick(card);
        return;
      }
      const color = card.colors?.[0];
      if (!color || color === PropertyColorEnum.Unassigned) return;
      // Block creating a new set if there's already an incomplete
      // same-color set on the table.
      const existing = me?.properties.find(
        (s) => s.color === color && !isSetComplete(s),
      );
      if (existing) {
        const label = getPropertyColorLabel(color, !!useSocialistTheme);
        setToast(
          `You already have an incomplete ${label} set — drop on it to add the card.`,
        );
        return;
      }
      onPlayToProperty(card.id, color);
    },
    [me, onPlayToProperty, setToast, useSocialistTheme],
  );

  if (gameState.phase === GamePhase.Finished) {
    return (
      <>
        <EndGameSummary
          players={gameState.players}
          winnerId={gameState.winner}
          currentPlayerId={playerId}
          settings={gameState.settings}
          gameSeed={gameState.startedAt ?? gameState.id}
          gameStartedAt={gameState.startedAt}
          sessionStats={sessionStats}
          onRematch={onRematch}
          onReturnToLobby={onReturnToLobby}
          onGoHome={onGoHome}
          onShare={() => openModal("share")}
        />
        <ShareModal
          isOpen={modal === "share"}
          onClose={closeModal}
          gameState={gameState}
          playerId={playerId}
          sessionStats={sessionStats}
        />
      </>
    );
  }

  // Hand peek reset signal — encodes "an event happened that should clear
  // any current peek state on the hand". Bumps when:
  //   - a dialog opens (CardActionDialog, ActionPrompt, WildcardFlip,
  //     RainbowGroup, Settings, DevTools)
  //   - the hand size changes (a card just got played or drawn)
  // Encoding all signals as one string keeps the prop stable when nothing
  // is happening so the hand doesn't re-mount.
  const peekResetSignal = [
    selectedCard?.id ?? "",
    pendingAction?.type ?? "",
    wildcardFlipData ? "wf" : "",
    rainbowDropData ? "rd" : "",
    showSettings ? "s" : "",
    showDevTools ? "d" : "",
    me?.hand?.length ?? 0,
  ].join("|");

  // Bottom bar (turn pill + end turn + hand) — shared across both layouts.
  const bottomBar = me ? (
    <div ref={turnControlsRef}>
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
        onDropToProperty={handleDropToProperty}
        onCreateNewSet={handleCreateNewSet}
        setDraggingCard={setDraggingCard}
        hideRedundantChrome={layoutMode === "table"}
        peekResetSignal={peekResetSignal}
      />
    </div>
  ) : null;

  return (
    <div
      ref={headerRef}
      className={`h-dynamic-screen no-text-select ${themeData.feltClass} felt-surface flex flex-col overflow-hidden relative`}
      style={{ overscrollBehavior: "none" }}
    >
      <TopBar
        roomCode={gameState.id}
        compact={layoutMode === "compact"}
        useSocialistTheme={!!useSocialistTheme}
        onSettings={() => openModal("settings")}
        onResign={onResign}
        onLeave={onGoHome}
        onDevTools={() => setShowDevTools(true)}
        showResign={
          gameState.phase === GamePhase.Playing && !hasResigned && !!onResign
        }
        showLeave={hasResigned && !!onGoHome}
        showDevTools={
          import.meta.env.MODE === "development" && !!onDevInjectCard
        }
      />

      {/* Soviet watermark — very subtle ☭ behind the felt */}
      {useSocialistTheme && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: layoutMode === "compact" ? 280 : 420,
            lineHeight: 1,
            color: "rgba(255,255,255,0.03)",
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 1,
          }}
        >
          ☭
        </div>
      )}

      {/* Game area — branches on layout mode */}
      {layoutMode === "table" ? (
        <GameTableDesktop
          gameState={gameState}
          playerId={playerId}
          draggingCard={draggingCard}
          onPlayToBank={onPlayToBank}
          onPlayToProperty={onPlayToProperty}
          onPlayAction={handlePlayAction}
          onRainbowDrop={(card) => setRainbowDropData({ card })}
          onWildcardClick={handleWildcardClick}
          onRearrangeProperty={onRearrangeProperty}
          setDraggingCard={setDraggingCard}
          bottomBar={bottomBar}
        />
      ) : (
        <>
          <GameTableCompact
            gameState={gameState}
            playerId={playerId}
            draggingCard={draggingCard}
            selectedCard={selectedCard}
            shakingCardId={shakingCardId}
            needsDiscard={needsDiscard ?? false}
            onPlayToBank={onPlayToBank}
            onPlayToProperty={onPlayToProperty}
            onRainbowDrop={(card) => setRainbowDropData({ card })}
            onWildcardClick={handleWildcardClick}
            onRearrangeProperty={onRearrangeProperty}
            onCardClick={handleCardClick}
            onPlayAction={handlePlayAction}
            onEndTurn={handleEndTurn}
            setDraggingCard={setDraggingCard}
            onDropToProperty={handleDropToProperty}
            onCreateNewSet={handleCreateNewSet}
            peekResetSignal={peekResetSignal}
          />
          {gameState.turn && gameState.turn.rentMultiplier > 1 && (
            <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-10">
              <div
                style={{
                  background: "linear-gradient(180deg, rgba(28,22,20,0.92) 0%, rgba(16,10,8,0.96) 100%)",
                  border: "1px solid color-mix(in oklab, var(--accent, #f0c14a) 30%, transparent)",
                  boxShadow: "0 0 24px -4px color-mix(in oklab, var(--accent, #f0c14a) 35%, transparent), 0 8px 16px -4px rgba(0,0,0,0.5)",
                  borderRadius: 10,
                  padding: "8px 16px",
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  color: "var(--accent, #f0c14a)",
                  whiteSpace: "nowrap",
                }}
              >
                {useSocialistTheme ? t.socialist.rent : t.actions.rent}{" "}
                {gameState.turn.rentMultiplier}×
              </div>
            </div>
          )}
        </>
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
            player={me}
            settings={gameState.settings}
            onAssign={onAssignReceivedWildcard}
          />
        )}

      {/* Settings Panel */}
      <CreditsModal isOpen={modal === "credits"} onClose={closeModal} />

      <SettingsPanel
        isOpen={showSettings}
        onClose={closeModal}
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
