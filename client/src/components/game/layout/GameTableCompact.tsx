// GameTableCompact — mobile/tablet layout (<1024px).
// Mirrors the design's MockupGameMobile: vertical flow.
//
//   TopBar (44)
//   Opponent rail compact (64)
//   Active opponent's table (flex:1, horizontal-scroll if many sets)
//   You-strip (deck/discard counts | Your Turn pill | End Turn)
//   Your sets+bank gold platter (compact)
//   DragPeekHand (~152)

import { useState, useMemo, useEffect, useRef } from "react";
import type {
  ClientGameState,
  Card,
  PropertyColor,
  ClientPlayer,
} from "../../../types/game";
import {
  TurnPhase,
  CardType,
  isSetComplete,
  PropertyColor as PropertyColorEnum,
  getPropertyColorLabel,
} from "../../../types/game";
import { useGameStore } from "../../../hooks/useGameStore";
import {
  OpponentRail,
  TurnPill,
  type OpponentSeatPlayer,
} from "./Chrome";
import { PlayerBoard, completeSetsCount } from "./PlayerBoard";
import { CardHand } from "../CardHand";
import { PrimaryButton } from "../../ui/Button";
import { useTurnTimer } from "../../../hooks/useTurnTimer";
import { useSoundManager } from "../../../hooks/useSoundManager";

const AVATAR_COLORS = [
  "#7adb88",
  "#d96aa1",
  "#6c9bd2",
  "#ffb070",
  "#c8f078",
  "#88d4ff",
];

function avatarColorFor(_player: ClientPlayer, index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function toSeatPlayer(
  player: ClientPlayer,
  index: number,
  allowDuplicateSets: boolean,
  currentTurnPlayerId?: string,
): OpponentSeatPlayer {
  const money = player.bank.reduce((sum, c) => sum + c.value, 0);
  return {
    id: player.id,
    name: player.name,
    initial: player.name[0]?.toUpperCase() ?? "?",
    color: avatarColorFor(player, index),
    sets: completeSetsCount(player, allowDuplicateSets),
    totalSetsNeeded: 3,
    money,
    handCount: player.hand?.length ?? 0,
    isCurrentTurn: !!currentTurnPlayerId && player.id === currentTurnPlayerId,
  };
}

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
  onEndTurn: () => void;
  setDraggingCard: (card: Card | null) => void;
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
  onRainbowDrop,
  onWildcardClick,
  onRearrangeProperty,
  onCardClick,
  onEndTurn,
  setDraggingCard,
  peekResetSignal = null,
}: GameTableCompactProps) {
  const opponents = useMemo(
    () => gameState.players.filter((p) => p.id !== playerId),
    [gameState.players, playerId],
  );
  const me = gameState.players.find((p) => p.id === playerId);
  const allowDuplicateSets = !!gameState.settings.allowDuplicateSets;
  const setToast = useGameStore((s) => s.setToast);
  const useSocialistTheme = !!gameState.settings.useSocialistTheme;

  const turnOwnerId = gameState.turn?.playerId;
  const turnOwnerIsOpponent = turnOwnerId && turnOwnerId !== playerId;
  const [activeOppId, setActiveOppId] = useState<string | null>(
    () => (turnOwnerIsOpponent ? turnOwnerId : opponents[0]?.id) ?? null,
  );
  useEffect(() => {
    if (turnOwnerIsOpponent && turnOwnerId) setActiveOppId(turnOwnerId);
  }, [turnOwnerId, turnOwnerIsOpponent]);

  const activeOpp = useMemo(
    () => opponents.find((p) => p.id === activeOppId) ?? opponents[0] ?? null,
    [opponents, activeOppId],
  );

  const seatPlayers: OpponentSeatPlayer[] = useMemo(
    () =>
      opponents.map((p, i) =>
        toSeatPlayer(p, i, allowDuplicateSets, gameState.turn?.playerId),
      ),
    [opponents, allowDuplicateSets, gameState.turn?.playerId],
  );

  const oppTableRef = useRef<HTMLDivElement | null>(null);
  const yourTableRef = useRef<HTMLDivElement | null>(null);

  // ─── Two-way sync between opponent-table swipe and the rail ────
  // Setting `skipNextProgScroll = true` suppresses the next scroll-
  // into-view fired by the activeOppId-changed effect — we use this
  // when activeOppId changed BECAUSE of the user's swipe (the page is
  // already in view; programmatically scrolling again would jitter).
  const skipNextProgScroll = useRef(false);
  const userScrollDebounce = useRef<number | null>(null);

  // (1) On scroll: figure out which page is closest to the rail's
  // horizontal center and update activeOppId. Debounced so we don't
  // thrash during the gesture.
  useEffect(() => {
    const el = oppTableRef.current;
    if (!el || opponents.length <= 1) return;
    const onScroll = () => {
      if (userScrollDebounce.current != null) {
        window.clearTimeout(userScrollDebounce.current);
      }
      userScrollDebounce.current = window.setTimeout(() => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        let closestId: string | null = null;
        let closestDist = Infinity;
        for (const child of Array.from(el.children) as HTMLElement[]) {
          const cid = child.dataset.oppPageId;
          if (!cid) continue;
          const cr = child.getBoundingClientRect();
          const d = Math.abs(cr.left + cr.width / 2 - centerX);
          if (d < closestDist) {
            closestDist = d;
            closestId = cid;
          }
        }
        if (closestId && closestId !== activeOppId) {
          skipNextProgScroll.current = true;
          setActiveOppId(closestId);
        }
      }, 90);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (userScrollDebounce.current != null) {
        window.clearTimeout(userScrollDebounce.current);
      }
    };
  }, [activeOppId, opponents.length]);

  // (2) When activeOppId changes from a chip click / auto-follow, scroll
  // the matching page into view. Skipped if the change came from (1).
  useEffect(() => {
    if (skipNextProgScroll.current) {
      skipNextProgScroll.current = false;
      return;
    }
    const el = oppTableRef.current;
    if (!el || !activeOppId) return;
    const target = el.querySelector(
      `[data-opp-page-id="${activeOppId}"]`,
    ) as HTMLElement | null;
    if (!target) return;
    target.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeOppId]);

  const isMyTurn = gameState.turn?.playerId === playerId;
  const turnPhase = gameState.turn?.phase;
  const cardsPlayed = gameState.turn?.cardsPlayed ?? 0;
  const deckCount = gameState.deckCount ?? 0;
  const discardCount = gameState.discardPile?.length ?? 0;
  const currentTurnPlayer = gameState.players.find(
    (p) => p.id === gameState.turn?.playerId,
  );

  const { play } = useSoundManager();
  const timeLeft = useTurnTimer(
    gameState.turn?.expiresAt ?? null,
    gameState.turn?.pausedTimeLeft ?? null,
    play,
  );

  // Active-opponent header subtitle stats
  const activeOppStats = activeOpp
    ? (() => {
        const complete = completeSetsCount(activeOpp, allowDuplicateSets);
        const partial = activeOpp.properties.length - complete;
        return {
          complete,
          partial,
          handCount: activeOpp.hand?.length ?? 0,
        };
      })()
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
            {activeOpp ? `${activeOpp.name}'s table` : "no opponent"}
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
        {/* Swipeable carousel of opponent boards. Each opponent is a
            full-width "page" that snaps. Scroll position is synced
            two-way with activeOppId — chip clicks scroll here,
            swipes update the active chip. */}
        <div
          ref={oppTableRef}
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            overflowX: opponents.length > 1 ? "auto" : "hidden",
            overflowY: "hidden",
            scrollSnapType: opponents.length > 1 ? "x mandatory" : "none",
          }}
          className="scrollbar-hide"
        >
          {opponents.length === 0 ? (
            <div
              style={{
                margin: "auto",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.08em",
                color: "rgba(245,234,208,0.4)",
              }}
            >
              no opponents
            </div>
          ) : (
            opponents.map((opp) => (
              <div
                key={opp.id}
                data-opp-page-id={opp.id}
                style={{
                  flex: "0 0 100%",
                  width: "100%",
                  scrollSnapAlign: "center",
                  scrollSnapStop: "always",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  overflowX: "auto",
                  overflowY: "hidden",
                  padding: "8px 4px",
                }}
                className="scrollbar-hide"
              >
                <div style={{ margin: "0 auto" }}>
                  <PlayerBoard
                    player={opp}
                    isYou={false}
                    isCurrentTurn={gameState.turn?.playerId === opp.id}
                    settings={gameState.settings}
                    draggingCard={draggingCard}
                    compact
                  />
                </div>
              </div>
            ))
          )}
        </div>
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
            <span style={{ color: "rgba(245,234,208,0.45)" }}>Deck</span>{" "}
            <span style={{ fontWeight: 700, color: "#f5ead0" }}>
              {deckCount}
            </span>
          </span>
          <span>
            <span style={{ color: "rgba(245,234,208,0.45)" }}>Discard</span>{" "}
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
                ? `Your Turn · ${timeLeft}s`
                : "Your Turn"
            }
            sub={`${cardsPlayed}/3 cards played`}
          />
        ) : (
          <TurnPill
            status="waiting"
            label={
              currentTurnPlayer
                ? `${currentTurnPlayer.name}'s turn`
                : "Waiting…"
            }
            sub={
              turnPhase === TurnPhase.ActionPending
                ? "Awaiting response"
                : "Playing…"
            }
          />
        )}
        {isMyTurn && turnPhase !== TurnPhase.ActionPending && (
          <PrimaryButton onClick={onEndTurn} disabled={needsDiscard} size="sm">
            End Turn
          </PrimaryButton>
        )}
      </div>

      {/* 4. Your sets + bank — gold platter (compact) */}
      {me && (
        <div
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
                onDropToBank={(cardId) => {
                  const card = me.hand?.find((c) => c.id === cardId);
                  if (card) onPlayToBank(cardId);
                }}
                onDropToProperty={(cardId, color) => {
                  const card = me.hand?.find((c) => c.id === cardId);
                  if (card) onPlayToProperty(cardId, color);
                }}
                onDropToRainbow={onRainbowDrop}
                onWildcardClick={onWildcardClick}
                onRearrangeProperty={onRearrangeProperty}
                onDragActiveChange={(isDragging, card) =>
                  setDraggingCard(isDragging ? card : null)
                }
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
            onDropToProperty={(card, color) => {
              // Only properties / property wildcards can be played to
              // a property set. Reject other types client-side so we
              // never dispatch a doomed-to-fail server play that has
              // historically left the hand desync'd ("not in hand"
              // error on the next try). Toast a clear hint instead.
              if (
                card.type !== CardType.Property &&
                card.type !== CardType.PropertyWildcard
              ) {
                setToast(
                  "Only property cards can be placed on a property set.",
                );
                return;
              }
              onPlayToProperty(card.id, color);
            }}
            onCreateNewSet={(card) => {
              // Wildcards / rainbow cards have no inherent single
              // color — defer to the existing tap-to-play dialog
              // (CardActionDialog) which lets the player pick. From
              // there they can choose to create a new set or assign
              // to an existing one.
              if (card.type !== CardType.Property) {
                onCardClick(card);
                return;
              }
              const color = card.colors?.[0];
              if (!color || color === PropertyColorEnum.Unassigned) return;
              // Block creating a new set if there's already an
              // INCOMPLETE same-color set on the table — the user almost
              // certainly meant to add to the existing one.
              const existing = me?.properties.find(
                (s) => s.color === color && !isSetComplete(s),
              );
              if (existing) {
                const label = getPropertyColorLabel(color, useSocialistTheme);
                setToast(
                  `You already have an incomplete ${label} set — drop on it to add the card.`,
                );
                return;
              }
              onPlayToProperty(card.id, color);
            }}
            onDragStart={setDraggingCard}
            onDragEnd={() => setDraggingCard(null)}
            useSocialistTheme={gameState.settings.useSocialistTheme}
            fanMode="drag"
            peekResetSignal={peekResetSignal}
          />
        </div>
      )}
    </div>
  );
}
