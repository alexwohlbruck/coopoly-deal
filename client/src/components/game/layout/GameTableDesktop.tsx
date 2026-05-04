// GameTableDesktop — around-the-table layout for ≥1024px viewports.
// Replaces the carousel pattern: opponents live in a chip rail at the top,
// the active opponent's full board sits center-left, deck+discard live
// center-right, and "you" pin to the bottom in a gold platter.

import { useState, useMemo, useEffect } from "react";
import type {
  ClientGameState,
  Card,
  PropertyColor,
  ClientPlayer,
} from "../../../types/game";
import { isPlayerWaitingForAction } from "../../../types/game";
import { PlayerArea } from "../PlayerArea";
import { OpponentRail, type OpponentSeatPlayer } from "./Chrome";
import { CardStack } from "./TableObjects";

interface GameTableDesktopProps {
  gameState: ClientGameState;
  playerId: string;
  draggingCard: Card | null;
  onPlayToBank: (cardId: string) => void;
  onPlayToProperty: (cardId: string, color: PropertyColor) => void;
  onRainbowDrop: (card: Card) => void;
  onWildcardClick: (card: Card, currentColor: PropertyColor) => void;
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

function avatarColorFor(player: ClientPlayer, index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function toSeatPlayer(
  player: ClientPlayer,
  index: number,
): OpponentSeatPlayer {
  const money = player.bank.reduce((sum, c) => sum + c.value, 0);
  const completeSets = player.properties.filter((s) =>
    s.color !== undefined ? s.cards.length >= setSizeFor(s.color) : false,
  ).length;
  return {
    id: player.id,
    name: player.name,
    initial: player.name[0]?.toUpperCase() ?? "?",
    color: avatarColorFor(player, index),
    sets: completeSets,
    totalSetsNeeded: 3,
    money,
    handCount: player.hand?.length ?? 0,
  };
}

// Property set size lookup (mirror SET_SIZE without importing it back here).
function setSizeFor(color: PropertyColor): number {
  switch (color) {
    case "brown":
    case "darkBlue":
    case "utility":
      return 2;
    case "railroad":
      return 4;
    default:
      return 3;
  }
}

export function GameTableDesktop({
  gameState,
  playerId,
  draggingCard,
  onPlayToBank,
  onPlayToProperty,
  onRainbowDrop,
  onWildcardClick,
  bottomBar,
}: GameTableDesktopProps) {
  const opponents = useMemo(
    () => gameState.players.filter((p) => p.id !== playerId),
    [gameState.players, playerId],
  );
  const me = gameState.players.find((p) => p.id === playerId);

  // Active opponent (the one whose board is shown center). Defaults to whoever
  // is currently taking a turn (if it's an opponent), else the first opponent.
  const turnOwnerId = gameState.turn?.playerId;
  const turnOwnerIsOpponent = turnOwnerId && turnOwnerId !== playerId;
  const [activeOppId, setActiveOppId] = useState<string | null>(
    () =>
      (turnOwnerIsOpponent ? turnOwnerId : opponents[0]?.id) ?? null,
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
    () => opponents.map((p, i) => toSeatPlayer(p, i)),
    [opponents],
  );

  const deckCount = gameState.deckCount ?? 0;
  const discardCount = gameState.discardPile?.length ?? 0;

  return (
    <>
      {/* Opponent rail */}
      <div
        style={{
          position: "absolute",
          top: 64,
          left: 0,
          right: 0,
          zIndex: 6,
        }}
      >
        <OpponentRail
          players={seatPlayers}
          activeId={activeOppId}
          onSelect={setActiveOppId}
        />
      </div>

      {/* Active opponent's table + deck/discard rail */}
      <div
        style={{
          position: "absolute",
          top: 158,
          left: 36,
          right: 36,
          // Leave space for the bottom platter (~ 320px reserved).
          bottom: 340,
          display: "grid",
          gridTemplateColumns: "1fr 168px",
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
              }}
            >
              {activeOpp ? `${activeOpp.name}'s table` : "No opponent"}
              {turnOwnerId === activeOppId && " · in play"}
            </div>
            {activeOpp && (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "rgba(245,234,208,0.4)",
                }}
              >
                {activeOpp.properties.length} sets ·{" "}
                {activeOpp.hand?.length ?? 0} cards
              </div>
            )}
          </div>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
            }}
            className="scrollbar-hide"
          >
            {activeOpp ? (
              <PlayerArea
                player={activeOpp}
                isCurrentTurn={gameState.turn?.playerId === activeOpp.id}
                isYou={false}
                settings={gameState.settings}
                isWaitingForAction={isPlayerWaitingForAction(
                  gameState,
                  activeOpp.id,
                )}
                draggingCard={draggingCard}
                onDropToBank={undefined}
                onDropToProperty={undefined}
                onDropToRainbow={undefined}
                onWildcardClick={undefined}
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
        </div>

        {/* Deck + Discard rail */}
        <div
          style={{
            display: "grid",
            gridTemplateRows: "auto 1fr 1fr",
            rowGap: 8,
            padding: "12px 12px 8px",
            borderRadius: 14,
            background: "rgba(0,0,0,0.28)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            justifyItems: "center",
            alignItems: "center",
            minHeight: 0,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "rgba(245,234,208,0.55)",
              letterSpacing: "0.18em",
              justifySelf: "start",
            }}
          >
            Table
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              minHeight: 0,
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
              gap: 2,
              minHeight: 0,
            }}
          >
            <CardStack
              depth={Math.min(3, Math.max(1, Math.round(discardCount / 2)))}
              width={84}
              height={114}
            />
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

      {/* Your area — pinned bottom, gold platter */}
      {me && (
        <div
          style={{
            position: "absolute",
            bottom: 18,
            left: 18,
            right: 18,
            padding: "12px 18px 10px",
            borderRadius: 18,
            background:
              "linear-gradient(180deg, rgba(196,154,82,0.22) 0%, rgba(132,94,42,0.30) 45%, rgba(68,44,18,0.38) 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,228,176,0.20), inset 0 -1px 0 rgba(0,0,0,0.32), inset 0 0 0 1px rgba(212,168,96,0.16), 0 2px 0 rgba(0,0,0,0.45), 0 12px 28px -10px rgba(0,0,0,0.65)",
            zIndex: 8,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxHeight: 320,
            overflow: "hidden",
          }}
        >
          {/* Your sets/bank header */}
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "rgba(245,234,208,0.6)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Your table
          </div>
          {/* Inline your PlayerArea (with drop targets active) — scoped to fit */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              display: "flex",
              justifyContent: "center",
            }}
            className="scrollbar-hide"
          >
            <PlayerArea
              player={me}
              isCurrentTurn={gameState.turn?.playerId === me.id}
              isYou={true}
              settings={gameState.settings}
              isWaitingForAction={isPlayerWaitingForAction(gameState, me.id)}
              draggingCard={draggingCard}
              onDropToBank={(cardId) => {
                const card = me.hand?.find((c) => c.id === cardId);
                if (card) onPlayToBank(cardId);
              }}
              onDropToProperty={(cardId, color) => {
                const card = me.hand?.find((c) => c.id === cardId);
                if (card) onPlayToProperty(cardId, color);
              }}
              onDropToRainbow={(card) => onRainbowDrop(card)}
              onWildcardClick={onWildcardClick}
            />
          </div>
          {/* Bottom bar (turn pill, end turn, hand) sits below the gold platter */}
          <div>{bottomBar}</div>
        </div>
      )}
    </>
  );
}
