// GameTableDesktop — around-the-table layout for ≥1024px viewports.
// Replaces the carousel pattern: opponents live in a chip rail at the top,
// the active opponent's full board sits center-left, deck+discard live
// center-right, and "you" pin to the bottom in a gold platter.

import { useState, useMemo, useEffect, useRef } from "react";
import type {
  ClientGameState,
  Card,
  PropertyColor,
  ClientPlayer,
} from "../../../types/game";
import {
  OpponentRail,
  PlayerCrest,
  type OpponentSeatPlayer,
} from "./Chrome";
import { CardStack } from "./TableObjects";
import { PlayerBoard, completeSetsCount } from "./PlayerBoard";
import { GameCard } from "../../cards/GameCard";

interface GameTableDesktopProps {
  gameState: ClientGameState;
  playerId: string;
  draggingCard: Card | null;
  onPlayToBank: (cardId: string) => void;
  onPlayToProperty: (cardId: string, color: PropertyColor) => void;
  onRainbowDrop: (card: Card) => void;
  onWildcardClick: (card: Card, currentColor: PropertyColor) => void;
  onWildcardDragStart?: (e: React.DragEvent, card: Card) => void;
  onWildcardDragEnd?: () => void;
  /** Bottom-bar (turn pill, end turn, hand). Already handles hand interactions. */
  bottomBar: React.ReactNode;
}

// Default opponent avatar colors (cycled through if none set per-player).
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
  };
}

export function GameTableDesktop({
  gameState,
  playerId,
  draggingCard,
  onPlayToBank,
  onPlayToProperty,
  onRainbowDrop,
  onWildcardClick,
  onWildcardDragStart,
  onWildcardDragEnd,
  bottomBar,
}: GameTableDesktopProps) {
  const opponents = useMemo(
    () => gameState.players.filter((p) => p.id !== playerId),
    [gameState.players, playerId],
  );
  const me = gameState.players.find((p) => p.id === playerId);
  const allowDuplicateSets = !!gameState.settings.allowDuplicateSets;

  // Active opponent (the one whose board is shown center). Defaults to whoever
  // is currently taking a turn (if it's an opponent), else the first opponent.
  const turnOwnerId = gameState.turn?.playerId;
  const turnOwnerIsOpponent = turnOwnerId && turnOwnerId !== playerId;
  const [activeOppId, setActiveOppId] = useState<string | null>(
    () => (turnOwnerIsOpponent ? turnOwnerId : opponents[0]?.id) ?? null,
  );

  // Auto-follow the turn owner if they're an opponent.
  useEffect(() => {
    if (turnOwnerIsOpponent && turnOwnerId) {
      setActiveOppId(turnOwnerId);
    }
  }, [turnOwnerId, turnOwnerIsOpponent]);

  const activeOpp = useMemo(
    () => opponents.find((p) => p.id === activeOppId) ?? opponents[0] ?? null,
    [opponents, activeOppId],
  );

  const seatPlayers: OpponentSeatPlayer[] = useMemo(
    () => opponents.map((p, i) => toSeatPlayer(p, i, allowDuplicateSets)),
    [opponents, allowDuplicateSets],
  );

  const deckCount = gameState.deckCount ?? 0;
  const discardPile = gameState.discardPile ?? [];
  const discardCount = discardPile.length;
  const topDiscard = discardPile[discardPile.length - 1];

  // Active-opponent header subtitle: "X complete · Y partial · Z cards in hand"
  const activeOppStats = activeOpp
    ? (() => {
        const complete = completeSetsCount(activeOpp, allowDuplicateSets);
        const partial = activeOpp.properties.length - complete;
        const setsToWin = 3 - complete;
        return {
          complete,
          partial,
          handCount: activeOpp.hand?.length ?? 0,
          setsToWin,
        };
      })()
    : null;

  const myCompleteSets = me ? completeSetsCount(me, allowDuplicateSets) : 0;
  const myMoney = me ? me.bank.reduce((s, c) => s + c.value, 0) : 0;
  const myHandCount = me?.hand?.length ?? 0;

  const isMyTurn = gameState.turn?.playerId === playerId;

  // ───────── Layout heights ─────────
  // top bar (56) → opp rail (78) at top:64 → center grid → bottom platter
  const TOP_BAR_HEIGHT = 56;
  const OPP_RAIL_HEIGHT = 78;
  const OPP_RAIL_TOP = TOP_BAR_HEIGHT + 8; // 64
  const CENTER_TOP = OPP_RAIL_TOP + OPP_RAIL_HEIGHT + 16; // 158
  const BOTTOM_RESERVE = 360; // gold platter footprint

  // Scroll opponents rail (used by < / > nav arrows)
  const railScroll = useRef<HTMLDivElement | null>(null);

  return (
    <>
      {/* Opponent rail */}
      <div
        style={{
          position: "absolute",
          top: OPP_RAIL_TOP,
          left: 0,
          right: 0,
          zIndex: 6,
          height: OPP_RAIL_HEIGHT,
        }}
      >
        <OpponentRail
          players={seatPlayers}
          activeId={activeOppId}
          onSelect={setActiveOppId}
          onScrollLeft={() =>
            railScroll.current?.scrollBy({ left: -300, behavior: "smooth" })
          }
          onScrollRight={() =>
            railScroll.current?.scrollBy({ left: 300, behavior: "smooth" })
          }
          railRef={railScroll}
        />
      </div>

      {/* Active opponent's table + deck/discard rail */}
      <div
        style={{
          position: "absolute",
          top: CENTER_TOP,
          left: 36,
          right: 36,
          bottom: BOTTOM_RESERVE,
          display: "grid",
          gridTemplateColumns: "1fr 200px",
          gap: 16,
          zIndex: 4,
          minHeight: 0,
        }}
      >
        <div
          style={{
            padding: "14px 20px 10px",
            borderRadius: 14,
            background: "rgba(0,0,0,0.2)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            minWidth: 0,
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
              marginBottom: 6,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "rgba(245,234,208,0.55)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              {activeOpp ? `${activeOpp.name}'s table` : "No opponent"}
              {turnOwnerId === activeOppId && " · in play"}
              {activeOppStats &&
                activeOppStats.setsToWin > 0 &&
                activeOppStats.setsToWin <= 1 &&
                " · 1 set from win"}
            </div>
            {activeOppStats && (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "rgba(245,234,208,0.4)",
                }}
              >
                {activeOppStats.complete} complete ·{" "}
                {activeOppStats.partial} partial ·{" "}
                {activeOppStats.handCount} cards in hand
              </div>
            )}
          </div>
          <ActiveOpponentBoardWrapper
            activeOpp={activeOpp}
            gameState={gameState}
            draggingCard={draggingCard}
          />
        </div>

        {/* Deck + Discard rail */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: "12px 12px 8px",
            borderRadius: 14,
            background: "rgba(0,0,0,0.28)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "rgba(245,234,208,0.55)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Table
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              justifyContent: "space-around",
              minHeight: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <CardStack
                depth={Math.min(5, Math.max(2, Math.round(deckCount / 18)))}
                width={84}
                height={114}
                faceDown
              />
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "rgba(245,234,208,0.7)",
                  letterSpacing: "0.1em",
                }}
              >
                <span style={{ opacity: 0.65 }}>Deck</span>{" "}
                <span
                  style={{ fontWeight: 700, color: "var(--accent, #f0c14a)" }}
                >
                  {deckCount}
                </span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <CardStack
                depth={Math.min(3, Math.max(1, Math.round(discardCount / 2)))}
                width={84}
                height={114}
              >
                {topDiscard ? (
                  <GameCard card={topDiscard} width={84} disableHover />
                ) : null}
              </CardStack>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "rgba(245,234,208,0.7)",
                  letterSpacing: "0.1em",
                }}
              >
                <span style={{ opacity: 0.65 }}>Discard</span>{" "}
                <span
                  style={{ fontWeight: 700, color: "var(--accent, #f0c14a)" }}
                >
                  {discardCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Your area — pinned bottom, gold platter */}
      {me && (
        <div
          style={{
            position: "absolute",
            bottom: 18,
            left: 18,
            right: 18,
            padding: "12px 18px 8px",
            borderRadius: 18,
            background:
              "linear-gradient(180deg, rgba(196,154,82,0.22) 0%, rgba(132,94,42,0.30) 45%, rgba(68,44,18,0.38) 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,228,176,0.20), inset 0 -1px 0 rgba(0,0,0,0.32), inset 0 0 0 1px rgba(212,168,96,0.16), 0 2px 0 rgba(0,0,0,0.45), 0 12px 28px -10px rgba(0,0,0,0.65)",
            zIndex: 8,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxHeight: BOTTOM_RESERVE - 36,
            overflow: "visible",
          }}
        >
          {/* Crest + turn pill row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <PlayerCrest
              name={me.name}
              initial={me.name[0]?.toUpperCase() ?? "?"}
              color="var(--accent, #f0c14a)"
              sets={myCompleteSets}
              totalSetsNeeded={3}
              money={myMoney}
              handCount={myHandCount}
              isYou
              active={isMyTurn}
            />
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: "rgba(245,234,208,0.55)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Your sets · {myCompleteSets} complete · bank
            </div>
          </div>

          {/* Sets+bank row + hand placeholder.
              Hand is fixed-ish (the HoverFanHand naturally fits 7-12 cards
              in ~620px); sets+bank get every other px on the left. */}
          <YourTableGrid
            me={me}
            settings={gameState.settings}
            isMyTurn={isMyTurn}
            draggingCard={draggingCard}
            onPlayToBank={onPlayToBank}
            onPlayToProperty={onPlayToProperty}
            onRainbowDrop={onRainbowDrop}
            onWildcardClick={onWildcardClick}
            onWildcardDragStart={onWildcardDragStart}
            onWildcardDragEnd={onWildcardDragEnd}
            bottomBar={bottomBar}
          />
        </div>
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────
// ActiveOpponentBoardWrapper — measures its container with a
// ResizeObserver and passes the actual width through as PropertySetsRow's
// maxWidth, so 6+ stacks scale appropriately on wide screens.
// ────────────────────────────────────────────────────────────────────

interface ActiveOpponentBoardWrapperProps {
  activeOpp: ClientPlayer | null;
  gameState: ClientGameState;
  draggingCard: Card | null;
}

function ActiveOpponentBoardWrapper({
  activeOpp,
  gameState,
  draggingCard,
}: ActiveOpponentBoardWrapperProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(900);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setWidth(el.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      className="scrollbar-hide"
    >
      {activeOpp ? (
        <PlayerBoard
          player={activeOpp}
          isYou={false}
          isCurrentTurn={gameState.turn?.playerId === activeOpp.id}
          settings={gameState.settings}
          draggingCard={draggingCard}
          maxWidth={Math.max(280, width - 16)}
          maxHeight={300}
        />
      ) : (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "rgba(245,234,208,0.4)",
            letterSpacing: "0.18em",
            padding: 36,
          }}
        >
          no opponents
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// YourTableGrid — the sets+bank | hand split inside the gold platter.
// Pulled out so a ResizeObserver can measure the actual sets-column
// width and pass it through to PropertySetsRow as maxWidth — without
// that the grid was capping everything at a fixed 420px even on a
// 1440px viewport, making my-table cards look comically small.
// ────────────────────────────────────────────────────────────────────

interface YourTableGridProps {
  me: ClientPlayer;
  settings: ClientGameState["settings"];
  isMyTurn: boolean;
  draggingCard: Card | null;
  onPlayToBank: (cardId: string) => void;
  onPlayToProperty: (cardId: string, color: PropertyColor) => void;
  onRainbowDrop: (card: Card) => void;
  onWildcardClick: (card: Card, currentColor: PropertyColor) => void;
  onWildcardDragStart?: (e: React.DragEvent, card: Card) => void;
  onWildcardDragEnd?: () => void;
  bottomBar: React.ReactNode;
}

function YourTableGrid({
  me,
  settings,
  isMyTurn,
  draggingCard,
  onPlayToBank,
  onPlayToProperty,
  onRainbowDrop,
  onWildcardClick,
  onWildcardDragStart,
  onWildcardDragEnd,
  bottomBar,
}: YourTableGridProps) {
  const setsColRef = useRef<HTMLDivElement | null>(null);
  const [setsColWidth, setSetsColWidth] = useState(600);

  useEffect(() => {
    const el = setsColRef.current;
    if (!el) return;
    const measure = () => setSetsColWidth(el.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <div
      style={{
        display: "grid",
        // Hand needs ~620px to fit 7-12 cards in HoverFanHand without
        // crushing them. Sets+bank gets the rest; on wide screens that's
        // 700-800px, plenty for 6+ stacks at scale 1.0.
        gridTemplateColumns: "1fr 620px",
        gap: 16,
        alignItems: "flex-start",
        minHeight: 0,
        flex: 1,
      }}
    >
      <div
        ref={setsColRef}
        style={{
          minWidth: 0,
          maxHeight: 240,
          overflowY: "auto",
          overflowX: "hidden",
        }}
        className="scrollbar-hide"
      >
        <PlayerBoard
          player={me}
          isYou
          isCurrentTurn={isMyTurn}
          settings={settings}
          draggingCard={draggingCard}
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
          onCardDragStart={onWildcardDragStart}
          onCardDragEnd={onWildcardDragEnd}
          maxWidth={Math.max(280, setsColWidth - 4)}
          maxHeight={230}
        />
      </div>
      <div
        style={{
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {bottomBar}
      </div>
    </div>
  );
}
