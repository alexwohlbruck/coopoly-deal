// GameTableCompact — mobile/tablet layout (<1024px).
// Mirrors the design's MockupGameMobile: vertical flow.
//
//   TopBar (44)
//   Opponent rail compact (64)
//   Active opponent's table (flex:1, horizontal-scroll if many sets)
//   You-strip (deck/discard counts | Your Turn pill | End Turn)
//   Your sets+bank gold platter (compact)
//   DragPeekHand (~152)

import { useRef } from "react";
import type {
  ClientGameState,
  Card,
  PropertyColor,
} from "../../../types/game";
import {
  TurnPhase,
} from "../../../types/game";
import { useI18n } from "../../../i18n";
import {
  OpponentRail,
  TurnPill,
} from "./Chrome";

import { PlayerBoard } from "./PlayerBoard";
import { CardHand } from "../CardHand";
import { PrimaryButton } from "../../ui/Button";
import { useTurnTimer } from "../../../hooks/useTurnTimer";
import { useSoundManager } from "../../../hooks/useSoundManager";
import { OpponentCarousel } from "./OpponentCarousel";
import {
  useGameTableState,
  makePlayerBoardHandlers,
} from "./useGameTableState";

interface GameTableCompactProps {
  gameState: ClientGameState;
  playerId: string;
  draggingCard: Card | null;
  selectedCard: Card | null;
  shakingCardId: string | null;
  needsDiscard: boolean;
  onPlayToBank: (cardId: string) => void;
  onPlayToProperty: (cardId: string, color: PropertyColor) => void;
  onRainbowDrop: (card: Card) => void;
  onWildcardClick: (card: Card, currentColor: PropertyColor) => void;
  onRearrangeProperty?: (
    cardId: string,
    toColor: PropertyColor,
    createNewSet?: boolean,
  ) => void;
  onCardClick: (card: Card) => void;
  onPlayAction: (payload: Record<string, unknown>) => void;
  onEndTurn: () => void;
  setDraggingCard: (card: Card | null) => void;
  /** Unified drop callback for pointer-drag onto property sets. */
  onDropToProperty?: (card: Card, color: PropertyColor) => void;
  /** Unified drop callback for pointer-drag onto "new set" zone. */
  onCreateNewSet?: (card: Card) => void;
  peekResetSignal?: number | string | null;
}

export function GameTableCompact({
  gameState,
  playerId,
  draggingCard,
  selectedCard,
  shakingCardId,
  needsDiscard,
  onPlayToBank,
  onPlayToProperty,
  onRainbowDrop: _onRainbowDrop,
  onWildcardClick,
  onRearrangeProperty,
  onCardClick,
  onPlayAction,
  onEndTurn,
  setDraggingCard,
  onDropToProperty: onDropToPropertyCb,
  onCreateNewSet: onCreateNewSetCb,
  peekResetSignal = null,
}: GameTableCompactProps) {
  const { t } = useI18n();
  const {
    me,
    opponents,
    activeOppId,
    setActiveOppId,
    activeOpp,
    seatPlayers,
    activeOppStats,
    deckCount,
    discardCount,
    isMyTurn,
    useSocialistTheme,
    setToast,
  } = useGameTableState(gameState, playerId);

  const yourTableRef = useRef<HTMLDivElement | null>(null);

  // Compact-only: turn state for inline turn pill
  const turnPhase = gameState.turn?.phase;
  const cardsPlayed = gameState.turn?.cardsPlayed ?? 0;
  const currentTurnPlayer = gameState.players.find(
    (p) => p.id === gameState.turn?.playerId,
  );

  const { play } = useSoundManager();
  const timeLeft = useTurnTimer(
    gameState.turn?.expiresAt ?? null,
    gameState.turn?.pausedTimeLeft ?? null,
    play,
  );

  const boardHandlers = me
    ? makePlayerBoardHandlers({
        me,
        onPlayToBank,
        onPlayToProperty,
        onPlayAction,
        setToast,
        setDraggingCard,
      })
    : null;

  return (
    <div
      style={{
        position: "absolute",
        top: 44, // below TopBar
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        zIndex: 4,
      }}
    >
      {/* 1. Opponent rail */}
      <OpponentRail
        players={seatPlayers}
        activeId={activeOppId}
        onSelect={setActiveOppId}
        compact
      />

      {/* 2. Active opponent's table */}
      <div
        data-table-panel
        style={{
          flex: 1,
          minHeight: 0,
          margin: "6px 12px 0",
          padding: "8px 10px",
          borderRadius: 12,
          background: "rgba(0,0,0,0.25)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 4,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "rgba(245,234,208,0.6)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {activeOpp ? `${activeOpp.name}'s ${t.game.table.toLowerCase()}` : "no opponent"}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {activeOppStats && (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "rgba(245,234,208,0.4)",
                }}
              >
                {activeOppStats.complete} sets · {activeOppStats.handCount}c
              </div>
            )}
            {opponents.length > 1 && (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 8,
                  color: "rgba(245,234,208,0.3)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                ← swipe →
              </div>
            )}
          </div>
        </div>
        <OpponentCarousel
          opponents={opponents}
          activeOppId={activeOppId}
          onActiveChange={setActiveOppId}
          gameState={gameState}
          draggingCard={draggingCard}
          compact
        />
      </div>

      {/* 3. You-strip — deck/discard counts | turn pill | end turn */}
      <div
        style={{
          flexShrink: 0,
          margin: "10px 12px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "rgba(245,234,208,0.65)",
            letterSpacing: "0.05em",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            lineHeight: 1.25,
          }}
        >
          <span>
            <span style={{ color: "rgba(245,234,208,0.45)" }}>{t.game.deck}</span>{" "}
            <span style={{ fontWeight: 700, color: "#f5ead0" }}>
              {deckCount}
            </span>
          </span>
          <span>
            <span style={{ color: "rgba(245,234,208,0.45)" }}>{t.game.discardPile}</span>{" "}
            <span style={{ fontWeight: 700, color: "#f5ead0" }}>
              {discardCount}
            </span>
          </span>
        </div>
        {isMyTurn ? (
          <TurnPill
            status="your"
            label={
              timeLeft != null
                ? `${t.game.yourTurn} · ${timeLeft}s`
                : t.game.yourTurn
            }
            sub={`${cardsPlayed}/${gameState.settings.movesPerTurn} ${t.game.cardsPlayed}`}
          />
        ) : (
          <TurnPill
            status="waiting"
            label={
              currentTurnPlayer
                ? `${currentTurnPlayer.name}'s ${useSocialistTheme ? t.socialist.shift : t.common.turn}`
                : `${t.game.waitingForResponses.replace("...", "")}`
            }
            sub={
              turnPhase === TurnPhase.ActionPending
                ? t.game.waitingForResponses
                : t.game.playing
            }
          />
        )}
        {isMyTurn && turnPhase !== TurnPhase.ActionPending && (
          <PrimaryButton onClick={onEndTurn} disabled={needsDiscard} size="sm">
            {t.game.endTurn}
          </PrimaryButton>
        )}
      </div>

      {/* 4. Your sets + bank — gold platter (compact) */}
      {me && (
        <div
          data-platter
          ref={yourTableRef}
          style={{
            flexShrink: 0,
            margin: "0 12px 12px",
            padding: "8px 10px",
            borderRadius: 14,
            background:
              "linear-gradient(180deg, rgba(184,142,72,0.22) 0%, rgba(120,86,38,0.32) 50%, rgba(70,46,18,0.4) 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,225,170,0.18), inset 0 -1px 0 rgba(0,0,0,0.3), inset 0 0 0 1px rgba(212,168,96,0.18), 0 1px 0 rgba(0,0,0,0.4)",
            // Tall enough to hold the BANK badge + a 5-card stack + the
            // property row at compact card width without clipping the
            // top/bottom of cards or their drop shadows. The redesign
            // bumped the bank stack height; the prior 200px max sliced
            // the topmost card.
            maxHeight: 280,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 8,
              color: "rgba(245,234,208,0.6)",
              letterSpacing: "0.08em",
              marginBottom: 3,
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            Your sets · bank
          </div>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowX: "auto",
              overflowY: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              // Padding inside the scroll container so the cards' drop
              // shadows + selection rings don't get clipped at the
              // overflow boundary (overflow-x:auto also clips y).
              padding: "8px 4px",
            }}
            className="scrollbar-hide"
          >
            <div style={{ margin: "0 auto" }}>
              <PlayerBoard
                player={me}
                isYou
                isCurrentTurn={isMyTurn}
                settings={gameState.settings}
                draggingCard={draggingCard}
                compact
                onWildcardClick={onWildcardClick}
                onRearrangeProperty={onRearrangeProperty}
                onDragActiveChange={boardHandlers!.onDragActiveChange}
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. Hand — DragPeekHand */}
      {me && (
        <div
          style={{
            flexShrink: 0,
            position: "relative",
            paddingBottom: 6,
            background:
              "linear-gradient(180deg, transparent 0%, rgba(20,12,8,0.55) 60%, rgba(20,12,8,0.78) 100%)",
          }}
        >
          <CardHand
            cards={me.hand ?? []}
            onCardClick={onCardClick}
            selectedCardId={selectedCard?.id ?? null}
            shakingCardId={shakingCardId}
            disabled={!isMyTurn || turnPhase === TurnPhase.ActionPending}
            needsDiscard={needsDiscard}
            onDragToBank={(card) => onPlayToBank(card.id)}
            onDropToProperty={onDropToPropertyCb}
            onCreateNewSet={onCreateNewSetCb}
            onDragStart={setDraggingCard}
            onDragEnd={() => setDraggingCard(null)}
            useSocialistTheme={useSocialistTheme}
            fanMode="drag"
            peekResetSignal={peekResetSignal}
          />
        </div>
      )}
    </div>
  );
}
