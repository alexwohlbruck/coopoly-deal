import { useState, useCallback, useEffect } from "react";
import type { Card, ClientGameState, PropertyColor } from "../../types/game";
import { GamePhase, TurnPhase, CardType } from "../../types/game";
import { useSoundSettings } from "../../hooks/useSoundManager";
import { useGameStore } from "../../hooks/useGameStore";
import { getTheme } from "../../theme/colors";
import { useI18n } from "../../i18n";
import { PlayerArea } from "./PlayerArea";
import { CardHand } from "./CardHand";
import { CardActionDialog } from "./CardActionDialog";
import { ActionPrompt } from "./ActionPrompt";
import { CardBack } from "../cards/GameCard";
import { EndGameSummary } from "./EndGameSummary";
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
  onPlayToProperty: (cardId: string, color: PropertyColor) => void;
  onPlayAction: (payload: Record<string, unknown>) => void;
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
  onDevInjectCard?: (cardType: CardType, targetPlayerId: string, colors?: PropertyColor[]) => void;
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
  const { sfxEnabled, toggleSfx } = useSoundSettings();
  const { theme } = useGameStore();
  const colors = getTheme(theme);
  const { t } = useI18n();
  
  const me = gameState.players.find((p) => p.id === playerId);
  
  // Check if selected card is still in hand
  const isCardStillInHand = selectedCard && me?.hand?.some(c => c.id === selectedCard.id);
  
  // Auto-close dialog if card is no longer in hand
  useEffect(() => {
    if (selectedCard && !isCardStillInHand) {
      console.log('[GameTable] Card no longer in hand, closing dialog');
      setSelectedCard(null);
    }
  }, [selectedCard, isCardStillInHand]);
  const allPlayers = gameState.players;
  const opponents = gameState.players.filter((p) => p.id !== playerId);
  const isMyTurn = gameState.turn?.playerId === playerId;
  const turnPhase = gameState.turn?.phase;
  const cardsPlayed = gameState.turn?.cardsPlayed ?? 0;
  const pendingAction = gameState.turn?.pendingAction;
  const currentTurnPlayer = gameState.players.find(
    (p) => p.id === gameState.turn?.playerId
  );
  const hasResigned = me?.connected === false;

  const needsDiscard = isMyTurn && me && me.hand && me.hand.length > 7;

  const handleCardClick = useCallback(
    (card: Card) => {
      console.log('[GameTable] handleCardClick', {
        cardType: card.type,
        cardId: card.id,
        isMyTurn,
        turnPhase,
        needsDiscard
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
      if (card.type === CardType.Property && card.colors && card.colors.length === 1) {
        onPlayToProperty(card.id, card.colors[0]);
        return;
      }

      // For all other cards (action cards, wildcards), show dialog for selection
      console.log('[GameTable] Opening dialog for card', card.id);
      setSelectedCard(card);
    },
    [isMyTurn, turnPhase, needsDiscard, onDiscardCards, onPlayToBank, onPlayToProperty]
  );

  const handlePlayToProperty = useCallback(
    (cardId: string, color: PropertyColor) => {
      onPlayToProperty(cardId, color);
      setSelectedCard(null);
    },
    [onPlayToProperty]
  );

  const handlePlayAction = useCallback(
    (payload: Record<string, unknown>) => {
      console.log('[GameTable] handlePlayAction called', payload);
      onPlayAction(payload);
      console.log('[GameTable] Setting selectedCard to null');
      setSelectedCard(null);
    },
    [onPlayAction]
  );

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
    <div className={`h-screen ${colors.tableBackground} flex flex-col overflow-hidden`}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/20 border-b border-white/10">
        <div className="flex items-center gap-3">
          <h1 className="text-white font-black text-lg">Co-Opoly Deal</h1>
          <span className="text-emerald-400 text-xs font-mono bg-white/10 px-2 py-0.5 rounded">
            {gameState.id}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setShowSettings(true)}
            className="text-gray-400 hover:text-white bg-white/10 p-1.5 rounded transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          {gameState.phase === GamePhase.Playing && !hasResigned && onResign && (
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
        </div>
      </div>

      {/* Game area */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Deck and Discard in top-right corner - hidden on mobile */}
        <div className="hidden md:flex absolute top-4 right-4 z-20 flex-col gap-3">
          {/* Deck */}
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-lg p-2 border border-white/10">
            <div className="relative">
              <CardBack small />
              <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {gameState.deckCount}
              </span>
            </div>
            <span className="text-gray-300 text-xs font-semibold">Deck</span>
          </div>
          
          {/* Discard Pile */}
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-lg p-2 border border-white/10">
            <div className="relative">
              <CardBack small />
              <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">Discard</span>
              </div>
              <span className="absolute -bottom-1 -right-1 bg-gray-600 text-white text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {gameState.discardPile.length}
              </span>
            </div>
            <span className="text-gray-300 text-xs font-semibold">Discard</span>
          </div>
        </div>

        {/* All players area */}
        <div className="flex-1 flex flex-wrap items-start justify-center gap-3 md:gap-4 p-2 md:p-4 overflow-y-auto">
          {allPlayers.map((player) => {
            const isMe = player.id === playerId;
            const isWaiting = !!(pendingAction &&
              pendingAction.targetPlayerIds.includes(player.id) &&
              !pendingAction.respondedPlayerIds.includes(player.id) &&
              pendingAction.sourcePlayerId === playerId);
            
            return (
              <PlayerArea
                key={player.id}
                player={player}
                isCurrentTurn={gameState.turn?.playerId === player.id}
                isYou={isMe}
                compact={allPlayers.length > 3}
                isWaitingForAction={isWaiting}
                onDropToBank={isMe ? (cardId) => {
                  const card = me?.hand?.find(c => c.id === cardId);
                  if (card) {
                    onPlayToBank(cardId);
                  }
                } : undefined}
              />
            );
          })}
        </div>

        {/* Center area — current turn info and End Turn */}
        <div className="flex items-center justify-center gap-4 py-3">
          {gameState.turn && gameState.turn.rentMultiplier > 1 && (
            <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-10">
              <div className="bg-yellow-500 text-black px-4 py-2 rounded-lg shadow-lg font-bold text-sm animate-pulse">
                🎯 Rent Doubled! ({gameState.turn.rentMultiplier}x)
              </div>
            </div>
          )}

          <div className="text-center">
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
                  {turnPhase === TurnPhase.ActionPending ? "Waiting for responses..." : "Playing..."}
                </p>
              </div>
            )}
          </div>

          {isMyTurn && !needsDiscard && turnPhase !== TurnPhase.ActionPending && (
            <button
              onClick={onEndTurn}
              className={`px-6 py-2 ${colors.primary} ${colors.primaryHover} text-white font-semibold rounded-lg transition-colors text-sm shrink-0`}
            >
              {t.game.endTurn}
            </button>
          )}
        </div>

        {/* My hand and controls */}
        {me && (
          <div className="border-t border-white/10 bg-black/20">
            {/* My hand */}
            <div className="px-2 py-3">
              <CardHand
                cards={me.hand ?? []}
                onCardClick={handleCardClick}
                selectedCardId={selectedCard?.id ?? null}
                disabled={!isMyTurn || turnPhase === TurnPhase.ActionPending}
                onDragToBank={(card) => onPlayToBank(card.id)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Card action dialog - only show if card is still in hand */}
      {selectedCard && me && isCardStillInHand && (
        <CardActionDialog
          card={selectedCard}
          player={me}
          opponents={opponents}
          rentMultiplier={gameState.turn?.rentMultiplier ?? 1}
          onClose={() => {
            console.log('[GameTable] Dialog onClose called (user canceled)');
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

      {/* Developer Tools */}
      {onDevInjectCard && onDevGiveCompleteSet && onDevSetMoney && (
        <DevTools
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
