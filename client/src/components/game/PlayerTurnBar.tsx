import type { ClientGameState, Card } from "../../types/game";
import { TurnPhase, isPlayerWaitingForAction } from "../../types/game";
import { CardBack } from "../cards/GameCard";
import { CardHand } from "./CardHand";
import { useI18n } from "../../i18n";
import { getTheme } from "../../theme/colors";
import { useGameStore } from "../../hooks/useGameStore";
import { Clock } from "lucide-react";
import { motion } from "framer-motion";

interface PlayerTurnBarProps {
  gameState: ClientGameState;
  playerId: string;
  playerRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  cardHandRef: React.RefObject<HTMLDivElement | null>;
  needsDiscard: boolean;
  timeLeft: number | null;
  selectedCard: Card | null;
  shakingCardId: string | null;
  onEndTurn: () => void;
  onCardClick: (card: Card) => void;
  onPlayToBank: (cardId: string) => void;
  setDraggingCard: (card: Card | null) => void;
}

export function PlayerTurnBar({
  gameState,
  playerId,
  playerRefs,
  cardHandRef,
  needsDiscard,
  timeLeft,
  selectedCard,
  shakingCardId,
  onEndTurn,
  onCardClick,
  onPlayToBank,
  setDraggingCard,
}: PlayerTurnBarProps) {
  const { t } = useI18n();
  const { theme } = useGameStore();
  const colors = getTheme(theme);

  const me = gameState.players.find((p) => p.id === playerId);
  const allPlayers = gameState.players;
  const isMyTurn = gameState.turn?.playerId === playerId;
  const turnPhase = gameState.turn?.phase;
  const cardsPlayed = gameState.turn?.cardsPlayed ?? 0;
  const totalTime = gameState.settings.turnTimer;
  const currentTurnPlayer = gameState.players.find(
    (p) => p.id === gameState.turn?.playerId,
  );

  if (!me) return null;

  return (
    <div className="z-10 border-t border-white/10 bg-black/20 max-h-[50vh] flex flex-col shrink-0 relative">
      {/* Player indicators */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-4 z-20">
        <div className="flex gap-2 px-4 py-1.5 bg-gray-900/90 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
          {allPlayers.map((player, idx) => {
            const isCurrentTurn = gameState.turn?.playerId === player.id;
            const isMe = player.id === playerId;
            const isWaiting = isPlayerWaitingForAction(gameState, player.id);

            return (
              <button
                key={player.id}
                onClick={() => {
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
                  relative px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 flex items-center gap-1
                  ${
                    isCurrentTurn
                      ? "bg-yellow-400 text-black scale-110 shadow-md"
                      : "bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white"
                  }
                  ${isMe ? "ring-1 ring-blue-400" : ""}
                `}
              >
                {isWaiting && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Clock className="w-3 h-3" />
                  </motion.div>
                )}
                {player.name.split(" ")[0]}
                {isMe && " (you)"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Combined turn info bar with deck/discard */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 mt-2">
        {/* Deck/Discard - left side */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <CardBack
              small={true}
              useSocialistTheme={gameState.settings.useSocialistTheme}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-white text-sm font-bold drop-shadow-lg">
                {gameState.deckCount}
              </span>
            </div>
          </div>
          <div className="relative">
            <CardBack
              small={true}
              useSocialistTheme={gameState.settings.useSocialistTheme}
            />
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
          {needsDiscard && gameState.settings.maxHandSize !== 999 ? (
            <div className="inline-flex bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-1.5 shadow-lg backdrop-blur-sm animate-pulse">
              <p className="text-red-200 text-sm font-semibold text-center flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                Must discard{" "}
                {(me?.hand?.length ?? 0) - gameState.settings.maxHandSize} card
                {(me?.hand?.length ?? 0) - gameState.settings.maxHandSize > 1
                  ? "s"
                  : ""}{" "}
                to end turn
              </p>
            </div>
          ) : isMyTurn ? (
            <div>
              <div className="flex items-center justify-center gap-2">
                <p className="text-yellow-400 font-bold text-sm">Your Turn</p>
                {timeLeft !== null && (
                  <span
                    className={`text-xs font-mono px-1.5 py-0.5 rounded ${timeLeft <= 10 ? "bg-red-500/20 text-red-400" : "bg-white/10 text-gray-300"}`}
                  >
                    {timeLeft}s
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-xs">
                {cardsPlayed}/3 cards played
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-center gap-2">
                <p className="text-gray-300 text-sm">
                  {currentTurnPlayer?.name}'s turn
                </p>
                {timeLeft !== null && (
                  <span
                    className={`text-xs font-mono px-1.5 py-0.5 rounded ${timeLeft <= 10 ? "bg-red-500/20 text-red-400" : "bg-white/10 text-gray-300"}`}
                  >
                    {timeLeft}s
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-xs">
                {turnPhase === TurnPhase.ActionPending
                  ? "Waiting for responses..."
                  : "Playing..."}
              </p>
            </div>
          )}
        </div>

        {/* End Turn Button - aligned to right */}
        {isMyTurn && turnPhase !== TurnPhase.ActionPending && (
          <button
            onClick={needsDiscard ? undefined : onEndTurn}
            disabled={needsDiscard}
            className={`relative overflow-hidden px-4 py-1.5 ${needsDiscard ? "bg-gray-600 cursor-not-allowed" : `${colors.primary} ${colors.primaryHover}`} text-white font-semibold rounded transition-colors text-sm shrink-0`}
          >
            {timeLeft !== null && totalTime > 0 && !needsDiscard && (
              <div
                className="absolute inset-0 bg-black/20"
                style={{
                  width: `${(timeLeft / totalTime) * 100}%`,
                  transition: "width 1s linear",
                }}
              />
            )}
            <span className="relative z-10">{t.game.endTurn}</span>
          </button>
        )}

        {/* Spacer when no button to maintain layout */}
        {(!isMyTurn || turnPhase === TurnPhase.ActionPending) && (
          <div className="shrink-0" style={{ width: "90px" }}></div>
        )}
      </div>

      {/* My hand */}
      <div
        ref={cardHandRef}
        className="border-t border-white/10 overflow-y-auto flex-1"
      >
        <div className="px-4 py-8">
          <CardHand
            cards={me.hand ?? []}
            onCardClick={onCardClick}
            selectedCardId={selectedCard?.id ?? null}
            shakingCardId={shakingCardId}
            disabled={!isMyTurn || turnPhase === TurnPhase.ActionPending}
            needsDiscard={needsDiscard}
            onDragToBank={(card) => onPlayToBank(card.id)}
            onDragStart={setDraggingCard}
            onDragEnd={() => setDraggingCard(null)}
            useSocialistTheme={gameState.settings.useSocialistTheme}
          />
        </div>
      </div>
    </div>
  );
}
