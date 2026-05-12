// Chrome — TopBar, PlayerCrest, TurnPill, OpponentSeat, OpponentRail.
// Decorative chrome that sits over the felt surface.

import { useState, useEffect, useRef, type ReactNode } from "react";
import { Settings, Hourglass } from "lucide-react";
import { useI18n } from "../../../i18n";

// ────────────────────────────────────────────────────────────────────
// IconButton — small dark glass button (Music / Settings / nav arrows).
// ────────────────────────────────────────────────────────────────────

interface IconButtonProps {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
}

export function IconButton({ children, onClick, title }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.06)",
        color: "rgba(255,255,255,0.85)",
        cursor: "pointer",
        fontSize: 15,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {children}
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────
// TopBar — title + room code + (optional) actions.
// Resign now requires a confirm step (popover below the button).
// ────────────────────────────────────────────────────────────────────

interface TopBarProps {
  roomCode: string;
  compact?: boolean;
  useSocialistTheme?: boolean;
  onSettings?: () => void;
  onResign?: () => void;
  onLeave?: () => void;
  onDevTools?: () => void;
  showResign?: boolean;
  showLeave?: boolean;
  showDevTools?: boolean;
}

export function TopBar({
  roomCode,
  compact = false,
  useSocialistTheme = false,
  onSettings,
  onResign,
  onLeave,
  onDevTools,
  showResign = false,
  showLeave = false,
  showDevTools = false,
}: TopBarProps) {
  const { t } = useI18n();
  const [confirmResign, setConfirmResign] = useState(false);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: compact ? 48 : 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: compact ? "0 14px" : "0 22px",
        zIndex: 30,
        background:
          "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.0) 100%)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: compact ? 16 : 19,
            letterSpacing: "-0.02em",
            color: "#f5ead0",
            textShadow: "0 1px 0 rgba(0,0,0,0.5)",
          }}
        >
          {useSocialistTheme ? `☭ ${t.socialist.title}` : t.lobby.title}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            padding: "3px 8px",
            borderRadius: 6,
            background: "rgba(0,0,0,0.4)",
            color: "rgba(255,255,255,0.75)",
            border: "1px solid rgba(255,255,255,0.06)",
            letterSpacing: "0.12em",
          }}
        >
          {roomCode}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          position: "relative",
        }}
      >
        {showDevTools && onDevTools && (
          <button
            onClick={onDevTools}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "6px 10px",
              background: "linear-gradient(180deg, #4a2a6a 0%, #2a1a3a 100%)",
              color: "#f0d8ff",
              border: "none",
              borderRadius: 8,
              boxShadow:
                "inset 0 1px 0 rgba(255,200,255,0.18), 0 1px 0 rgba(0,0,0,0.5)",
              cursor: "pointer",
            }}
          >
            {t.game.dev}
          </button>
        )}
        <IconButton title={t.game.settings} onClick={onSettings}>
          <Settings size={14} />
        </IconButton>
        {showResign && onResign && (
          <button
            onClick={() => setConfirmResign(true)}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "7px 14px",
              background: "linear-gradient(180deg, #4a1a1a 0%, #2a0e0e 100%)",
              color: "#f0c8c8",
              border: "none",
              borderRadius: 8,
              boxShadow:
                "inset 0 1px 0 rgba(255,200,200,0.18), 0 1px 0 rgba(0,0,0,0.5), 0 4px 8px -2px rgba(0,0,0,0.5)",
              cursor: "pointer",
            }}
          >
            {t.game.resign}
          </button>
        )}
        {showLeave && onLeave && (
          <button
            onClick={onLeave}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "7px 14px",
              background: "linear-gradient(180deg, #2a1a4a 0%, #160a2a 100%)",
              color: "#e0d0ff",
              border: "none",
              borderRadius: 8,
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 0 rgba(0,0,0,0.5)",
              cursor: "pointer",
            }}
          >
            {t.game.leave}
          </button>
        )}
        {confirmResign && onResign && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: 6,
              background:
                "linear-gradient(180deg, #2a1414 0%, #160808 100%)",
              padding: 14,
              borderRadius: 10,
              boxShadow: "var(--sh-panel)",
              border: "1px solid rgba(255,180,180,0.15)",
              minWidth: 240,
              zIndex: 40,
            }}
          >
            <div
              style={{
                color: "#f0c8c8",
                fontFamily: "var(--font-display)",
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              {t.game.resignConfirm}
            </div>
            <div
              style={{
                color: "rgba(240,200,200,0.7)",
                fontSize: 11,
                marginBottom: 10,
              }}
            >
              {t.game.resignDescription}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => setConfirmResign(false)}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  border: "none",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t.common.cancel}
              </button>
              <button
                onClick={() => {
                  setConfirmResign(false);
                  onResign();
                }}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: "#8a2020",
                  color: "#fff",
                  border: "none",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {t.game.resign}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// PlayerCrest — name + initial + stats pill. The "you" version with extra
// info; opponents use the smaller OpponentSeat below.
// ────────────────────────────────────────────────────────────────────

interface PlayerCrestProps {
  name: string;
  initial: string;
  color?: string;
  sets?: number;
  totalSetsNeeded?: number;
  money?: number;
  handCount?: number;
  isYou?: boolean;
  active?: boolean;
  compact?: boolean;
}

export function PlayerCrest({
  name,
  initial,
  color = "var(--accent, #f0c14a)",
  sets = 0,
  totalSetsNeeded = 3,
  money = 0,
  handCount = 0,
  isYou = false,
  active = false,
  compact = false,
}: PlayerCrestProps) {
  const { t } = useI18n();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 8 : 10,
        padding: compact ? "6px 10px" : "8px 14px",
        borderRadius: 999,
        background: active
          ? "linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0,0.7))"
          : "linear-gradient(180deg, rgba(0,0,0,0.32), rgba(0,0,0,0.5))",
        boxShadow: active
          ? "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.4)"
          : "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.04)",
        transition: "box-shadow var(--d-base) var(--ease-out-soft)",
      }}
    >
      <div
        style={{
          width: compact ? 26 : 30,
          height: compact ? 26 : 30,
          borderRadius: "50%",
          background: `linear-gradient(180deg, ${color} 0%, color-mix(in oklab, ${color} 65%, #000) 100%)`,
          color: "#1a1208",
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: compact ? 13 : 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.4)",
        }}
      >
        {initial}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: compact ? 12 : 13.5,
              color: "#f5ead0",
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </span>
          {isYou && (
            <span
              style={{
                fontSize: 9,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.12em",
                color,
              }}
            >
              ({t.common.you.toUpperCase()})
            </span>
          )}
        </div>
        <div
          style={{
            display: "flex",
            gap: compact ? 8 : 10,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "rgba(255,255,255,0.7)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span style={{ color: "#7adb88" }}>${money}M</span>
          <span>
            <span style={{ color }}>
              {sets}/{totalSetsNeeded}
            </span>{" "}
            {t.common.sets}
          </span>
          <span>{handCount}c</span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// TurnPill — "Your Turn / 0/3 cards played" or "Waiting" indicator.
// ────────────────────────────────────────────────────────────────────

interface TurnPillProps {
  status?: "your" | "waiting";
  label: string;
  sub?: string;
}

export function TurnPill({ status = "your", label, sub }: TurnPillProps) {
  const colors = {
    your: {
      bg: "color-mix(in oklab, var(--accent, #f0c14a) 15%, transparent)",
      text: "var(--accent, #f5d883)",
    },
    waiting: {
      bg: "rgba(255,255,255,0.06)",
      text: "rgba(255,255,255,0.85)",
    },
  };
  const c = colors[status];
  const isYour = status === "your";
  return (
    <div
      className={isYour ? "turn-pill-pulse" : undefined}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "6px 18px",
        borderRadius: 999,
        background: c.bg,
        boxShadow: isYour
          ? "inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px color-mix(in oklab, var(--accent, #f0c14a) 35%, transparent)"
          : "inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: "0.04em",
          color: c.text,
        }}
      >
        {label}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: "0.05em",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// OpponentSeat — one opponent's chip in the rail. Click to make active.
// ────────────────────────────────────────────────────────────────────

export interface OpponentSeatPlayer {
  id: string;
  name: string;
  initial: string;
  color: string;
  sets: number;
  totalSetsNeeded: number;
  money: number;
  handCount: number;
  /** Whether this player is currently on their turn. Drives the gold
   *  glow on the chip — was previously tied to "active in carousel",
   *  which produced an always-on glow on whichever chip you happened
   *  to be looking at. */
  isCurrentTurn?: boolean;
  /** Whether we're waiting for this player to respond to an action. */
  isWaitingForAction?: boolean;
}

interface OpponentSeatProps {
  player: OpponentSeatPlayer;
  isActive: boolean;
  scale?: number;
  onClick?: () => void;
}

export function OpponentSeat({
  player,
  isActive,
  scale = 1,
  compact = false,
  onClick,
}: OpponentSeatProps & { compact?: boolean }) {
  const onTurn = !!player.isCurrentTurn;
  const waiting = !!player.isWaitingForAction;
  const accent = "var(--accent, #f0c14a)";

  // ── Compact mode: small pill with avatar + name ──────────────
  if (compact) {
    const s = 0.85;
    return (
      <button
        data-opp-id={player.id}
        onClick={onClick}
        style={{
          flex: "0 0 auto",
          scrollSnapAlign: "center",
          padding: "4px 8px 4px 4px",
          borderRadius: 999,
          background: onTurn
            ? "linear-gradient(180deg, rgba(28,22,20,0.7) 0%, rgba(16,10,8,0.85) 100%)"
            : isActive
              ? "rgba(0,0,0,0.35)"
              : "rgba(0,0,0,0.18)",
          border: "none",
          boxShadow: onTurn
            ? `0 0 0 1px ${accent}55, 0 0 12px -4px ${accent}66`
            : isActive
              ? "inset 0 0 0 1px rgba(255,255,255,0.1)"
              : "inset 0 0 0 1px rgba(255,255,255,0.04)",
          cursor: "pointer",
          color: "#f5ead0",
          opacity: onTurn ? 1 : isActive ? 0.95 : 0.6,
          transition: "all var(--d-base) var(--ease-out-soft)",
          display: "flex",
          alignItems: "center",
          gap: 5,
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            style={{
              width: 26 * s,
              height: 26 * s,
              borderRadius: 999,
              background: `linear-gradient(180deg, ${player.color}, color-mix(in oklab, ${player.color} 55%, #000))`,
              color: "#1a1208",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
            }}
          >
            {player.initial}
          </div>
          {waiting && (
            <div
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                width: 12,
                height: 12,
                borderRadius: 999,
                background: "#e08840",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 4px rgba(224,136,64,0.6)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            >
              <Hourglass style={{ width: 7, height: 7, color: "#fff" }} />
            </div>
          )}
        </div>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            fontWeight: 600,
            maxWidth: 56,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {player.name}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: player.color,
            flexShrink: 0,
          }}
        >
          {player.sets}/{player.totalSetsNeeded}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "rgba(245,234,208,0.5)",
            flexShrink: 0,
          }}
        >
          ${player.money}M
        </span>
      </button>
    );
  }

  // ── Full-size mode (desktop) ─────────────────────────────────
  return (
    <button
      data-opp-id={player.id}
      onClick={onClick}
      style={{
        flex: "0 0 auto",
        width: 280 * scale,
        scrollSnapAlign: "center",
        padding: 12 * scale,
        borderRadius: 14,
        background: onTurn
          ? "linear-gradient(180deg, rgba(28,22,20,0.7) 0%, rgba(16,10,8,0.85) 100%)"
          : isActive
            ? "rgba(0,0,0,0.32)"
            : "rgba(0,0,0,0.18)",
        border: "none",
        boxShadow: onTurn
          ? `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px ${accent}55, 0 0 18px -4px ${accent}66`
          : isActive
            ? "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.08)"
            : "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 0 0 1px rgba(255,255,255,0.04)",
        cursor: "pointer",
        textAlign: "left",
        color: "#f5ead0",
        opacity: onTurn ? 1 : isActive ? 0.92 : 0.65,
        transition: "all var(--d-base) var(--ease-out-soft)",
        display: "flex",
        flexDirection: "column",
        gap: 8 * scale,
        position: "relative",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 10 * scale }}
      >
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            style={{
              width: 32 * scale,
              height: 32 * scale,
              borderRadius: 999,
              background: `linear-gradient(180deg, ${player.color}, color-mix(in oklab, ${player.color} 55%, #000))`,
              color: "#1a1208",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 14 * scale,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
            }}
          >
            {player.initial}
          </div>
          {waiting && (
            <div
              style={{
                position: "absolute",
                top: -3 * scale,
                right: -3 * scale,
                width: 16 * scale,
                height: 16 * scale,
                borderRadius: 999,
                background: "#e08840",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 6px rgba(224,136,64,0.6)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            >
              <Hourglass
                style={{
                  width: 10 * scale,
                  height: 10 * scale,
                  color: "#fff",
                }}
              />
            </div>
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 13 * scale,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {player.name}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10 * scale,
              color: "rgba(245,234,208,0.65)",
            }}
          >
            <span style={{ color: player.color }}>
              {player.sets}/{player.totalSetsNeeded}
            </span>{" "}
            · ${player.money}M · {player.handCount}c
          </div>
        </div>
      </div>
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────
// OpponentRail — horizontal scroll-snap rail of OpponentSeat chips.
// ────────────────────────────────────────────────────────────────────

interface OpponentRailProps {
  players: OpponentSeatPlayer[];
  activeId: string | null;
  onSelect: (id: string) => void;
  compact?: boolean;
  /** Imperative scroll ref so a parent can step the rail with nav arrows. */
  railRef?: React.RefObject<HTMLDivElement | null>;
  onScrollLeft?: () => void;
  onScrollRight?: () => void;
}

export function OpponentRail({
  players,
  activeId,
  onSelect,
  compact = false,
  railRef,
  onScrollLeft,
  onScrollRight,
}: OpponentRailProps) {
  const scale = compact ? 0.78 : 1;
  const showArrows = !compact && players.length > 1 && !!onScrollLeft && !!onScrollRight;

  // Internal ref for auto-scroll; also fed to external railRef if provided.
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the rail to keep the active chip visible.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !activeId) return;
    const chip = container.querySelector(
      `[data-opp-id="${activeId}"]`,
    ) as HTMLElement | null;
    if (!chip) return;
    chip.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeId]);

  return (
    <div
      style={{
        position: "relative",
        height: compact ? 40 : 78,
        flexShrink: 0,
      }}
    >
      <div
        ref={(el) => {
          scrollContainerRef.current = el;
          if (railRef && typeof railRef === "object") {
            (railRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: compact ? "flex-start" : "center",
          gap: compact ? undefined : 18,
          overflowX: "auto",
          scrollSnapType: compact ? "none" : "x mandatory",
          padding: compact ? "4px 12px" : "8px 240px",
          height: "100%",
          scrollbarWidth: "none",
        }}
        className="scrollbar-hide"
      >
        {compact ? (
          /* Inner wrapper centers via auto margins when chips fit, and
             naturally overflows/scrolls when they don't — avoids the
             justify-content:center clipping bug on the first chip. */
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              margin: "0 auto",
              width: "fit-content",
              flexShrink: 0,
            }}
          >
            {players.map((p) => (
              <OpponentSeat
                key={p.id}
                player={p}
                isActive={p.id === activeId}
                scale={1}
                compact
                onClick={() => onSelect(p.id)}
              />
            ))}
          </div>
        ) : (
          players.map((p) => (
            <OpponentSeat
              key={p.id}
              player={p}
              isActive={p.id === activeId}
              scale={scale}
              onClick={() => onSelect(p.id)}
            />
          ))
        )}
        {!compact && <div style={{ flex: "0 0 1px" }} />} {/* gap sentinel for scroll-snap */}
      </div>
      {showArrows && (
        <>
          <button
            onClick={onScrollLeft}
            aria-label="Previous opponent"
            style={{
              position: "absolute",
              top: "50%",
              left: 24,
              transform: "translateY(-50%)",
              width: 36,
              height: 36,
              borderRadius: 999,
              background: "rgba(0,0,0,0.55)",
              border: "none",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 12px rgba(0,0,0,0.4)",
              color: "#f5ead0",
              fontSize: 18,
              cursor: "pointer",
              zIndex: 7,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            ‹
          </button>
          <button
            onClick={onScrollRight}
            aria-label="Next opponent"
            style={{
              position: "absolute",
              top: "50%",
              right: 24,
              transform: "translateY(-50%)",
              width: 36,
              height: 36,
              borderRadius: 999,
              background: "rgba(0,0,0,0.55)",
              border: "none",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 12px rgba(0,0,0,0.4)",
              color: "#f5ead0",
              fontSize: 18,
              cursor: "pointer",
              zIndex: 7,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
