/**
 * Shared computed state for both compact and desktop game table layouts.
 * Eliminates duplication of opponent setup, stats, deck counts, and
 * turn-derived values that were previously copy-pasted between
 * GameTableCompact and GameTableDesktop.
 */

import { useMemo } from "react";
import type { ClientGameState, Card, PropertyColor } from "../../../types/game";
import { CardType } from "../../../types/game";
import { useGameStore } from "../../../hooks/useGameStore";
import { completeSetsCount } from "./PlayerBoard";
import {
  toSeatPlayer,
  useActiveOpponent,
} from "./OpponentCarousel";

export interface GameTableState {
  /** Current player */
  me: ClientGameState["players"][number] | undefined;
  /** All opponents */
  opponents: ReturnType<typeof useActiveOpponent>["opponents"];
  /** Currently selected opponent id */
  activeOppId: string | null;
  /** Setter for active opponent */
  setActiveOppId: (id: string) => void;
  /** Currently selected opponent player object */
  activeOpp: ReturnType<typeof useActiveOpponent>["activeOpp"];
  /** Opponent seat data for OpponentRail */
  seatPlayers: ReturnType<typeof toSeatPlayer>[];
  /** Stats for the active opponent */
  activeOppStats: {
    complete: number;
    partial: number;
    handCount: number;
    setsToWin: number;
  } | null;
  /** Whether duplicate sets are allowed */
  allowDuplicateSets: boolean;
  /** Deck count */
  deckCount: number;
  /** Discard pile count */
  discardCount: number;
  /** Top discard card */
  topDiscard: Card | undefined;
  /** Whether it's the local player's turn */
  isMyTurn: boolean;
  /** Use socialist theme */
  useSocialistTheme: boolean;
  /** Toast setter */
  setToast: (msg: string) => void;
}

export function useGameTableState(
  gameState: ClientGameState,
  playerId: string,
): GameTableState {
  const { opponents, activeOppId, setActiveOppId, activeOpp } =
    useActiveOpponent(gameState, playerId);
  const me = gameState.players.find((p) => p.id === playerId);
  const allowDuplicateSets = !!gameState.settings.allowDuplicateSets;
  const setToast = useGameStore((s) => s.setToast);
  const useSocialistTheme = useGameStore((s) => s.useSocialistTheme);

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
  const isMyTurn = gameState.turn?.playerId === playerId;

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

  return {
    me,
    opponents,
    activeOppId,
    setActiveOppId,
    activeOpp,
    seatPlayers,
    activeOppStats,
    allowDuplicateSets,
    deckCount,
    discardCount,
    topDiscard,
    isMyTurn,
    useSocialistTheme,
    setToast,
  };
}

// ─── Shared drop handler factory ────────────────────────────────────
// Both compact and desktop layouts wire identical callbacks on
// PlayerBoard. This factory creates them from the same inputs so
// the logic only exists once.

export interface PlayerBoardHandlerDeps {
  me: ClientGameState["players"][number];
  onPlayToBank: (cardId: string) => void;
  onPlayToProperty: (cardId: string, color: PropertyColor) => void;
  onPlayAction: (payload: Record<string, unknown>) => void;
  setToast: (msg: string) => void;
  setDraggingCard: (card: Card | null) => void;
}

export function makePlayerBoardHandlers(deps: PlayerBoardHandlerDeps) {
  const { me, onPlayToBank, onPlayToProperty, onPlayAction, setToast, setDraggingCard } = deps;

  return {
    onDropToBank: (cardId: string) => {
      const card = me.hand?.find((c) => c.id === cardId);
      if (card) onPlayToBank(cardId);
    },

    onDropToProperty: (cardId: string, color: PropertyColor) => {
      const card = me.hand?.find((c) => c.id === cardId);
      if (!card) return;
      // House/Hotel cards use the action flow, not playToProperty
      if (card.type === CardType.House || card.type === CardType.Hotel) {
        const action = card.type === CardType.House ? "house" : "hotel";
        onPlayAction({ action, cardId, setColor: color });
        return;
      }
      if (
        card.type !== CardType.Property &&
        card.type !== CardType.PropertyWildcard
      ) {
        setToast("Only property cards can be placed on a property set.");
        return;
      }
      onPlayToProperty(cardId, color);
    },

    onDragActiveChange: (isDragging: boolean, card: Card | null) =>
      setDraggingCard(isDragging ? card : null),
  };
}
