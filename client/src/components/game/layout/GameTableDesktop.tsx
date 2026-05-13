// GameTableDesktop — around-the-table layout for ≥1024px viewports.
// Opponents live in a chip rail at the top with a swipeable carousel
// of boards center-left, deck+discard live center-right, and "you"
// pin to the bottom in a gold platter.

import { useMemo, useRef } from "react";
import type {
  ClientGameState,
  Card,
  PropertyColor,
  ClientPlayer,
} from "../../../types/game";
import { CardType } from "../../../types/game";
import { useGameStore } from "../../../hooks/useGameStore";
import {
  OpponentRail,
  PlayerCrest,
} from "./Chrome";
import { useI18n } from "../../../i18n";
import { CardStack } from "./TableObjects";
import { PlayerBoard, completeSetsCount } from "./PlayerBoard";
import { GameCard } from "../../cards/GameCard";
import {
  toSeatPlayer,
  useActiveOpponent,
  OpponentCarousel,
} from "./OpponentCarousel";

interface GameTableDesktopProps {
  gameState: ClientGameState;
  playerId: string;
  draggingCard: Card | null;
  onPlayToBank: (cardId: string) => void;
  onPlayToProperty: (cardId: string, color: PropertyColor) => void;
  onPlayAction: (payload: Record<string, unknown>) => void;
  onRainbowDrop: (card: Card) => void;
  onWildcardClick: (card: Card, currentColor: PropertyColor) => void;
  onRearrangeProperty?: (
    cardId: string,
    toColor: PropertyColor,
    createNewSet?: boolean,
  ) => void;
  setDraggingCard: (card: Card | null) => void;
  /** Bottom-bar (turn pill, end turn, hand). Already handles hand interactions. */
  bottomBar: React.ReactNode;
}

export function GameTableDesktop({
  gameState,
  playerId,
  draggingCard,
  onPlayToBank,
  onPlayToProperty,
  onPlayAction,
  onRainbowDrop,
  onWildcardClick,
  onRearrangeProperty,
  setDraggingCard,
  bottomBar,
}: GameTableDesktopProps) {
  const { t } = useI18n();
  const { opponents, activeOppId, setActiveOppId, activeOpp } =
    useActiveOpponent(gameState, playerId);
  const me = gameState.players.find((p) => p.id === playerId);
  const allowDuplicateSets = !!gameState.settings.allowDuplicateSets;

  const turnOwnerId = gameState.turn?.playerId;

  const seatPlayers = useMemo(
    () =>
      opponents.map((p, i) =>
        toSeatPlayer(p, i, allowDuplicateSets, gameState),
      ),
    [opponents, allowDuplicateSets, gameState],
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
        const setsToWin = gameState.settings.setsToWin - complete;
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
  // Gold platter needs room for: crest+caption row (~32) + 8 gap + your-sets
  // row (260 at scale 1.0) AND/OR the hand (218 fan height + 36 turn info).
  // ~440 keeps the hand from clipping while letting sets reach scale=1.0.
  const BOTTOM_RESERVE = 440;

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
          onScrollLeft={() => {
            if (!seatPlayers.length) return;
            const idx = seatPlayers.findIndex((p) => p.id === activeOppId);
            const prev =
              seatPlayers[
                (idx - 1 + seatPlayers.length) % seatPlayers.length
              ];
            setActiveOppId(prev.id);
          }}
          onScrollRight={() => {
            if (!seatPlayers.length) return;
            const idx = seatPlayers.findIndex((p) => p.id === activeOppId);
            const next = seatPlayers[(idx + 1) % seatPlayers.length];
            setActiveOppId(next.id);
          }}
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
          data-table-panel
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
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {activeOpp ? `${activeOpp.name}'s ${t.game.table.toLowerCase()}` : "No opponent"}
              {turnOwnerId === activeOppId && " · in play"}
              {activeOppStats &&
                activeOppStats.setsToWin > 0 &&
                activeOppStats.setsToWin <= 1 &&
                " · 1 set from win"}
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
                    fontSize: 10,
                    color: "rgba(245,234,208,0.4)",
                  }}
                >
                  {activeOppStats.complete} complete ·{" "}
                  {activeOppStats.partial} partial ·{" "}
                  {activeOppStats.handCount} cards in hand
                </div>
              )}
              {opponents.length > 1 && (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    color: "rgba(245,234,208,0.3)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  scroll to switch
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
          />
        </div>

        {/* Deck + Discard rail */}
        <div
          data-table-panel
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "10px 12px",
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
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            {t.game.table}
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              justifyContent: "space-evenly",
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                flexShrink: 1,
                minHeight: 0,
              }}
            >
              <CardStack
                depth={Math.min(5, Math.max(2, Math.round(deckCount / 18)))}
                width={72}
                height={98}
                faceDown
              />
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "rgba(245,234,208,0.7)",
                  letterSpacing: "0.1em",
                  flexShrink: 0,
                }}
              >
                <span style={{ opacity: 0.65 }}>{t.game.deck}</span>{" "}
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
                flexShrink: 1,
                minHeight: 0,
              }}
            >
              <CardStack
                depth={Math.min(3, Math.max(1, Math.round(discardCount / 2)))}
                width={72}
                height={98}
              >
                {topDiscard ? (
                  <GameCard card={topDiscard} width={72} disableHover />
                ) : null}
              </CardStack>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "rgba(245,234,208,0.7)",
                  letterSpacing: "0.1em",
                  flexShrink: 0,
                }}
              >
                <span style={{ opacity: 0.65 }}>{t.game.discardPile}</span>{" "}
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
          data-platter
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
              totalSetsNeeded={gameState.settings.setsToWin}
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
                letterSpacing: "0.08em",
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
            onPlayAction={onPlayAction}
            onRainbowDrop={onRainbowDrop}
            onWildcardClick={onWildcardClick}
            onRearrangeProperty={onRearrangeProperty}
            setDraggingCard={setDraggingCard}
            bottomBar={bottomBar}
          />
        </div>
      )}
    </>
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
  onPlayAction: (payload: Record<string, unknown>) => void;
  onRainbowDrop: (card: Card) => void;
  onWildcardClick: (card: Card, currentColor: PropertyColor) => void;
  onRearrangeProperty?: (
    cardId: string,
    toColor: PropertyColor,
    createNewSet?: boolean,
  ) => void;
  setDraggingCard: (card: Card | null) => void;
  bottomBar: React.ReactNode;
}

function YourTableGrid({
  me,
  settings,
  isMyTurn,
  draggingCard,
  onPlayToBank,
  onPlayToProperty,
  onPlayAction,
  onRainbowDrop,
  onWildcardClick,
  onRearrangeProperty,
  setDraggingCard,
  bottomBar,
}: YourTableGridProps) {
  const setsColRef = useRef<HTMLDivElement | null>(null);

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
          maxHeight: 320,
          // Scroll horizontally if the row overflows; let it wrap to two
          // rows on very tall platters (we keep wrap=false for now since
          // the platter is ~280px tall).
          overflowX: "auto",
          overflowY: "hidden",
          alignSelf: "stretch",
          display: "flex",
          alignItems: "center",
          // Padding so the bank border / card shadows don't get clipped
          // at the overflow boundary.
          padding: "8px 4px",
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
            if (!card) return;
            if (card.type === CardType.House || card.type === CardType.Hotel) {
              const action = card.type === CardType.House ? "house" : "hotel";
              onPlayAction({ action, cardId, setColor: color });
              return;
            }
            if (
              card.type !== CardType.Property &&
              card.type !== CardType.PropertyWildcard
            ) {
              useGameStore.getState().setToast(
                "Only property cards can be placed on a property set.",
              );
              return;
            }
            onPlayToProperty(cardId, color);
          }}
          onDropToRainbow={onRainbowDrop}
          onWildcardClick={onWildcardClick}
          onRearrangeProperty={onRearrangeProperty}
          onDragActiveChange={(isDragging, card) =>
            setDraggingCard(isDragging ? card : null)
          }
        />
      </div>
      <div
        style={{
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          borderRadius: 14,
          background: "rgba(0,0,0,0.12)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
          overflow: "hidden",
        }}
      >
        {bottomBar}
      </div>
    </div>
  );
}
