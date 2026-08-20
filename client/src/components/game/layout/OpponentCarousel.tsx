// OpponentCarousel — shared swipeable carousel of opponent boards,
// the useActiveOpponent hook, and shared utilities (avatar colors,
// toSeatPlayer) used by both GameTableCompact and GameTableDesktop.

import { useState, useMemo, useEffect, useRef } from "react";
import type {
  ClientGameState,
  Card,
  ClientPlayer,
} from "../../../types/game";
import { isPlayerWaitingForAction } from "../../../types/game";
import { type OpponentSeatPlayer } from "./Chrome";
import { PlayerBoard, completeSetsCount } from "./PlayerBoard";
import { useI18n } from "../../../i18n";

// ────────────────────────────────────────────────────────────────────
// Shared utilities
// ────────────────────────────────────────────────────────────────────

export const AVATAR_COLORS = [
  "#7adb88",
  "#d96aa1",
  "#6c9bd2",
  "#ffb070",
  "#c8f078",
  "#88d4ff",
];

export function avatarColorFor(_player: ClientPlayer, index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function toSeatPlayer(
  player: ClientPlayer,
  index: number,
  allowDuplicateSets: boolean,
  gameState: ClientGameState,
): OpponentSeatPlayer {
  const money = player.bank.reduce((sum, c) => sum + c.value, 0);
  return {
    id: player.id,
    name: player.name,
    initial: player.name[0]?.toUpperCase() ?? "?",
    color: avatarColorFor(player, index),
    sets: completeSetsCount(player, allowDuplicateSets),
    totalSetsNeeded: gameState.settings.setsToWin,
    money,
    // `hand` only comes down for yourself; everyone else gets a count. Reading
    // the array here meant every opponent showed zero cards in hand.
    handCount: player.handCount,
    isCurrentTurn:
      !!gameState.turn?.playerId && player.id === gameState.turn.playerId,
    isWaitingForAction: isPlayerWaitingForAction(gameState, player.id),
    connected: player.connected,
  };
}

// ────────────────────────────────────────────────────────────────────
// useActiveOpponent — shared hook for tracking which opponent is
// selected / auto-followed when the turn changes.
// ────────────────────────────────────────────────────────────────────

export function useActiveOpponent(
  gameState: ClientGameState,
  playerId: string,
) {
  const opponents = useMemo(
    () => gameState.players.filter((p) => p.id !== playerId),
    [gameState.players, playerId],
  );

  const turnOwnerId = gameState.turn?.playerId;
  const turnOwnerIsOpponent = turnOwnerId && turnOwnerId !== playerId;

  const [activeOppId, setActiveOppId] = useState<string | null>(
    () => (turnOwnerIsOpponent ? turnOwnerId : opponents[0]?.id) ?? null,
  );

  // Auto-follow the turn owner when they're an opponent.
  useEffect(() => {
    if (turnOwnerIsOpponent && turnOwnerId) setActiveOppId(turnOwnerId);
  }, [turnOwnerId, turnOwnerIsOpponent]);

  const activeOpp = useMemo(
    () =>
      opponents.find((p) => p.id === activeOppId) ?? opponents[0] ?? null,
    [opponents, activeOppId],
  );

  return { opponents, activeOppId, setActiveOppId, activeOpp };
}

// ────────────────────────────────────────────────────────────────────
// OpponentCarousel — horizontal scroll-snap carousel of opponent
// boards with two-way sync to an external activeOppId.
// ────────────────────────────────────────────────────────────────────

interface OpponentCarouselProps {
  opponents: ClientPlayer[];
  activeOppId: string | null;
  onActiveChange: (id: string) => void;
  gameState: ClientGameState;
  draggingCard: Card | null;
  compact?: boolean;
}

export function OpponentCarousel({
  opponents,
  activeOppId,
  onActiveChange,
  gameState,
  draggingCard,
  compact = false,
}: OpponentCarouselProps) {
  const { t } = useI18n();
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const skipNextProgScroll = useRef(false);
  const userScrollDebounce = useRef<number | null>(null);

  // (1) On scroll: figure out which page is closest to the container's
  // horizontal center and update activeOppId. Debounced to avoid
  // thrashing during the gesture.
  useEffect(() => {
    const el = carouselRef.current;
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
          onActiveChange(closestId);
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
  }, [activeOppId, opponents.length, onActiveChange]);

  // (2) When activeOppId changes from a chip click / auto-follow, scroll
  // the matching page into view. Skipped if the change came from (1).
  useEffect(() => {
    if (skipNextProgScroll.current) {
      skipNextProgScroll.current = false;
      return;
    }
    const el = carouselRef.current;
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

  if (opponents.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-mono)",
          fontSize: compact ? 10 : 11,
          letterSpacing: "0.08em",
          color: "rgba(245,234,208,0.4)",
        }}
      >
        {t.ui.noOpponents}
      </div>
    );
  }

  return (
    <div
      ref={carouselRef}
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
      {opponents.map((opp) => (
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
            padding: compact ? "8px 4px" : "0 8px",
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
              {...(compact ? { compact: true } : {})}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
