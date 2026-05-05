import type { ClientGameState, Card } from "../../types/game";
import { TurnPhase, isPlayerWaitingForAction } from "../../types/game";
import { CardBack } from "../cards/GameCard";
import { CardHand } from "./CardHand";
import { useI18n } from "../../i18n";
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
  /** When true, hide the redundant player-switcher pill and mini deck/discard
   * (which are already provided by OpponentRail and the right-rail pile in the
   * desktop layout). */
  hideRedundantChrome?: boolean;
  /** Tick this to clear the hand's peek state. */
  peekResetSignal?: number | string | null;
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
  hideRedundantChrome = false,
  peekResetSignal = null,
}: PlayerTurnBarProps) {
  const { t } = useI18n();

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
    <div className="z-10 border-t border-white/10 bg-black/20 flex flex-col shrink-0 relative">
      {/* Player indicators */}
      {!hideRedundantChrome && (
      <div className="absolute left-1/2 -translate-x-1/2 -top-3 z-20">
        <div className="flex gap-1.5 px-3 py-1 bg-gray-900/90 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
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
                  relative px-2 py-0.5 rounded-full text-[10px] font-bold transition-all duration-300 flex items-center gap-0.5
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
                    <Clock className="w-2.5 h-2.5" />
                  </motion.div>
                )}
                {player.name.split(" ")[0]}
                {isMe && " (you)"}
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* Combined turn info bar with deck/discard */}
      <div className="flex items-center justify-between px-3 py-1.5 shrink-0 mt-1">
        {/* Deck/Discard - left side */}
        {hideRedundantChrome ? (
          <div className="shrink-0" style={{ width: 90 }} />
        ) : (
        <div className="flex items-center gap-1.5 scale-75 origin-left">
          <div className="relative">
            <CardBack
              width={64}
              useSocialistTheme={gameState.settings.useSocialistTheme}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-white text-xs font-bold drop-shadow-lg">
                {gameState.deckCount}
              </span>
            </div>
          </div>
          <div className="relative">
            <CardBack
              width={64}
              useSocialistTheme={gameState.settings.useSocialistTheme}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-gray-200 text-[7px] font-bold drop-shadow">
                Discard
              </span>
              <span className="text-white text-xs font-bold drop-shadow-lg">
                {gameState.discardPile.length}
              </span>
            </div>
          </div>
        </div>
        )}

        {/* Turn info - center */}
        <div className="text-center flex-1">
          {needsDiscard && gameState.settings.maxHandSize !== 999 ? (
            <div className="inline-flex bg-red-500/20 border border-red-500/50 rounded px-2 py-1 shadow-lg backdrop-blur-sm animate-pulse">
              <p className="text-red-200 text-xs font-semibold text-center flex items-center gap-1">
                <span className="text-sm">⚠️</span>
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
              <div className="flex items-center justify-center gap-1.5">
                <p className="text-yellow-400 font-bold text-xs">Your Turn</p>
                {timeLeft !== null && (
                  <span
                    className={`text-[10px] font-mono px-1 py-0.5 rounded ${timeLeft <= 10 ? "bg-red-500/20 text-red-400" : "bg-white/10 text-gray-300"}`}
                  >
                    {timeLeft}s
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-[10px]">
                {cardsPlayed}/3 cards played
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-center gap-1.5">
                <p className="text-gray-300 text-xs">
                  {currentTurnPlayer?.name}'s{" "}
                  {gameState.settings?.useSocialistTheme ? "shift" : "turn"}
                </p>
                {timeLeft !== null && (
                  <span
                    className={`text-[10px] font-mono px-1 py-0.5 rounded ${timeLeft <= 10 ? "bg-red-500/20 text-red-400" : "bg-white/10 text-gray-300"}`}
                  >
                    {timeLeft}s
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-[10px]">
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
            className={`relative overflow-hidden ${needsDiscard ? "cursor-not-allowed text-white" : "text-[#1a1208] hover:brightness-110"} shrink-0`}
            style={
              needsDiscard
                ? {
                    padding: "8px 14px",
                    fontFamily: "var(--font-display)",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.06)",
                  }
                : {
                    padding: "9px 18px",
                    fontFamily: "var(--font-display)",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    borderRadius: 8,
                    background:
                      "linear-gradient(180deg, var(--accent) 0%, color-mix(in oklab, var(--accent) 70%, #000) 100%)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.18), 0 1px 0 rgba(0,0,0,0.5), 0 4px 10px -2px rgba(0,0,0,0.5)",
                  }
            }
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
          <div className="shrink-0" style={{ width: "70px" }}></div>
        )}
      </div>

      {/* My hand */}
      <div
        ref={cardHandRef}
        className={
          hideRedundantChrome
            ? "overflow-visible"
            : "border-t border-white/10 overflow-y-auto max-h-[40vh]"
        }
      >
        <div className={hideRedundantChrome ? "px-3 pt-2 pb-1" : "px-3 py-4"}>
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
            fanMode={hideRedundantChrome ? "hover" : null}
            peekResetSignal={peekResetSignal}
          />
        </div>
        {hideRedundantChrome && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "rgba(245,234,208,0.45)",
              letterSpacing: "0.08em",
              textAlign: "center",
              padding: "0 0 6px",
              textTransform: "uppercase",
            }}
          >
            hover to peek · click to play
          </div>
        )}
      </div>
    </div>
  );
}
