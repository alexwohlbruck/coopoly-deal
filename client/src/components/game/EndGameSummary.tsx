// EndGameSummary — winner spotlight + final standings ledger.
// Mirrors mockup-gameover.jsx from the design bundle.

import { motion } from "framer-motion";
import { Share2 } from "lucide-react";
import type { ClientPlayer, GameSettings, PropertySet } from "../../types/game";
import {
  isSetComplete,
  PropertyColor,
  PROPERTY_COLOR_HEX,
} from "../../types/game";
import { useGameStore } from "../../hooks/useGameStore";
import { useI18n } from "../../i18n";
import { getTheme } from "../../theme/colors";
import { useLayout } from "../../hooks/useLayout";
import { PrimaryButton, SecondaryButton } from "../ui/Button";
import { PropertySetsRow } from "./layout/TableObjects";
import { quipForRank, sortPlayersByRank } from "../../utils/endGameQuips";

interface EndGameSummaryProps {
  players: ClientPlayer[];
  winnerId: string | null;
  currentPlayerId: string;
  settings: GameSettings;
  /**
   * Per-game seed used to vary the end-screen quips. Should change every
   * game (including rematches) so players don't see the same line twice.
   * Typically `gameState.startedAt ?? gameState.id`.
   */
  gameSeed: string | number;
  /** When the game started; used to compute duration for the share text. */
  gameStartedAt?: number;
  sessionStats?: {
    wins: number;
    losses: number;
    streak: number;
    gamesPlayed: number;
  };
  onRematch?: () => void;
  onReturnToLobby?: () => void;
  onGoHome?: () => void;
  /** Opens the ShareModal — owned by the parent so the modal lives at
   *  the page level alongside the other ?modal= URL-based modals. */
  onShare?: () => void;
}

// ─── Confetti fall over the felt ─────────────────────────────────
// Pieces spawn above the viewport and fall continuously past the
// bottom (CSS keyframe in index.css translates Y from -15vh to 115vh
// with a 720deg rotation). Per-piece random delay distributes them
// across the loop so the screen always has falling confetti in flight
// rather than all-at-once bursts.
function ConfettiLayer({ count = 60, seed = 7 }: { count?: number; seed?: number }) {
  let s = seed;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s % 10000) / 10000;
  };
  const palette = ["#f0c14a", "#d96aa1", "#7adb88", "#6c9bd2", "#e08840", "#f5ead0"];
  const bits = Array.from({ length: count }, () => {
    // Per-piece duration 4–8s. Random delay across the FULL duration
    // (not 0–4s as before) so spawn times are evenly distributed
    // — including delays past one cycle so some pieces start
    // mid-fall and the layer is dense from the first frame.
    const duration = 4 + rnd() * 4;
    return {
      x: rnd() * 100, // horizontal column
      r: Math.floor(rnd() * 360), // initial rotation
      s: 5 + rnd() * 8, // size px
      c: palette[Math.floor(rnd() * palette.length)],
      flat: rnd() > 0.5,
      duration,
      // Negative delays start the animation mid-cycle so we get
      // continuous coverage immediately on mount.
      delay: -rnd() * duration,
    };
  });
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 5,
        overflow: "hidden",
      }}
    >
      {bits.map((b, i) => (
        <div
          key={i}
          style={
            {
              position: "absolute",
              left: `${b.x}%`,
              top: 0,
              width: b.s,
              height: b.flat ? b.s * 0.4 : b.s * 1.3,
              background: b.c,
              borderRadius: b.flat ? 1 : 1.5,
              boxShadow: "0 1px 1px rgba(0,0,0,0.35)",
              willChange: "transform, opacity",
              animation: `confetti-drift ${b.duration}s linear ${b.delay}s infinite`,
              // Custom property the keyframe references for the
              // initial rotation (each piece spins from a different
              // base angle).
              ["--r0" as string]: `${b.r}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

// ─── Wax-stamp WINNER seal ────────────────────────────────────────
function WinnerSeal({ size = 92 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        position: "relative",
        background:
          "radial-gradient(circle at 35% 30%, #f5d883 0%, #d4a132 45%, #8a6420 90%)",
        boxShadow:
          "inset 0 -3px 6px rgba(0,0,0,0.45), inset 0 3px 4px rgba(255,235,180,0.5), 0 4px 14px rgba(0,0,0,0.45)",
        transform: "rotate(-7deg)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 6,
          borderRadius: "50%",
          border: "2px dashed rgba(60,40,10,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#3a2810",
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: size * 0.18,
          letterSpacing: "0.06em",
          lineHeight: 1,
          textShadow: "0 1px 0 rgba(255,235,180,0.4)",
        }}
      >
        WINNER
      </div>
    </div>
  );
}

// ─── Crown icon ───────────────────────────────────────────────────
function CrownIcon({
  size = 22,
  color = "var(--accent, #f0c14a)",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size * 0.78}
      viewBox="0 0 22 17"
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff4c0" />
          <stop offset="1" stopColor={color} />
        </linearGradient>
      </defs>
      <path
        d="M2 5 L5 11 L7.5 4 L11 12 L14.5 4 L17 11 L20 5 L19 14 L3 14 Z"
        fill="url(#cg)"
        stroke="rgba(60,40,10,0.6)"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      <circle
        cx="2"
        cy="5"
        r="1.4"
        fill="#f0c14a"
        stroke="rgba(60,40,10,0.5)"
        strokeWidth="0.4"
      />
      <circle
        cx="11"
        cy="3"
        r="1.4"
        fill="#d96aa1"
        stroke="rgba(60,40,10,0.5)"
        strokeWidth="0.4"
      />
      <circle
        cx="20"
        cy="5"
        r="1.4"
        fill="#f0c14a"
        stroke="rgba(60,40,10,0.5)"
        strokeWidth="0.4"
      />
    </svg>
  );
}

// ─── Rank ribbon — left-side gilded numeral ──────────────────────
function RankRibbon({ rank, height = 72 }: { rank: number; height?: number }) {
  const tone =
    rank === 1
      ? {
          bg: "linear-gradient(180deg, #f5d883 0%, #c98f24 100%)",
          fg: "#3a2810",
          stroke: "rgba(60,40,10,0.55)",
        }
      : rank === 2
        ? {
            bg: "linear-gradient(180deg, #d8d8d8 0%, #888 100%)",
            fg: "#1c1a14",
            stroke: "rgba(0,0,0,0.4)",
          }
        : rank === 3
          ? {
              bg: "linear-gradient(180deg, #d4925a 0%, #7a4818 100%)",
              fg: "#2a1808",
              stroke: "rgba(0,0,0,0.4)",
            }
          : {
              bg: "linear-gradient(180deg, #555 0%, #2a2a2a 100%)",
              fg: "#f5ead0",
              stroke: "rgba(0,0,0,0.4)",
            };
  return (
    <div
      style={{
        width: 56,
        height,
        background: tone.bg,
        color: tone.fg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.18), 0 1px 0 rgba(0,0,0,0.4)",
        borderRight: `1px solid ${tone.stroke}`,
        clipPath:
          "polygon(0 0, 100% 0, 100% calc(100% - 10px), 50% 100%, 0 calc(100% - 10px))",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.08em",
          opacity: 0.7,
          fontWeight: 700,
        }}
      >
        RANK
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 28,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: "-0.03em",
        }}
      >
        #{rank}
      </div>
    </div>
  );
}

// ─── Stat readout ────────────────────────────────────────────────
function StatReadout({
  label,
  value,
  accent = "var(--accent, #f0c14a)",
  mono = true,
  size = "md",
}: {
  label: string;
  value: string | number;
  accent?: string;
  mono?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const fs = size === "lg" ? 22 : size === "sm" ? 14 : 17;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 1,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.08em",
          color: "rgba(245,234,208,0.55)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: mono ? "var(--font-mono)" : "var(--font-display)",
          fontSize: fs,
          fontWeight: 800,
          color: accent,
          letterSpacing: mono ? 0 : "-0.01em",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── Compact property strip — chip pills per stack ───────────────
// Colors come from PROPERTY_COLOR_HEX (the JS source of truth in
// types/game.ts) — previously this file kept its own color map that
// drifted from the rest of the app, e.g. utility was purple here but
// silver in PROPERTY_COLOR_HEX.

function CompactPropertyStrip({
  sets,
  bank,
  dense = false,
  showBank = true,
}: {
  sets: PropertySet[];
  bank: number[];
  dense?: boolean;
  showBank?: boolean;
}) {
  const totalBank = bank.reduce((a, b) => a + b, 0);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: dense ? 6 : 8,
        flexWrap: "wrap",
      }}
    >
      {sets.map((s, i) => {
        const c =
          PROPERTY_COLOR_HEX[s.color as PropertyColor] ?? "#888";
        const complete = isSetComplete(s);
        return (
          <div
            key={i}
            title={`${s.cards.length}/${s.color}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: dense ? "4px 9px" : "5px 11px",
              borderRadius: 999,
              background: complete ? c : "rgba(0,0,0,0.45)",
              color: complete ? "#fff" : "rgba(245,234,208,0.85)",
              fontFamily: "var(--font-mono)",
              fontSize: dense ? 10 : 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              boxShadow: complete
                ? "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.25)"
                : `inset 0 0 0 1px ${c}66`,
            }}
          >
            {!complete && (
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: c,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
                }}
              />
            )}
            <span>
              {s.cards.length}/{neededFor(s.color)}
            </span>
            {complete && (
              <span
                style={{
                  opacity: 0.85,
                  fontSize: 9,
                  letterSpacing: "0.06em",
                }}
              >
                ✓ SET
              </span>
            )}
            {s.house && <span style={{ fontSize: 10 }}>🏠</span>}
            {s.hotel && <span style={{ fontSize: 10 }}>🏨</span>}
          </div>
        );
      })}
      {sets.length === 0 && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "rgba(245,234,208,0.45)",
            letterSpacing: "0.12em",
          }}
        >
          NO PROPERTIES
        </span>
      )}
      {showBank && (
        <>
          <span
            style={{
              width: 1,
              height: 16,
              background: "rgba(245,234,208,0.15)",
              margin: "0 4px",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: dense ? 10 : 11,
              color: "rgba(245,234,208,0.55)",
              letterSpacing: "0.12em",
            }}
          >
            BANK{" "}
            <span style={{ color: "#7adb88", fontWeight: 700 }}>${totalBank}M</span>
          </span>
        </>
      )}
    </div>
  );
}

function neededFor(color: PropertyColor): number {
  switch (color) {
    case PropertyColor.Brown:
    case PropertyColor.DarkBlue:
    case PropertyColor.Utility:
      return 2;
    case PropertyColor.Railroad:
      return 4;
    default:
      return 3;
  }
}

// Quips moved to ../../utils/endGameQuips so the share modal can use
// the same pool (and same seed) — players see matching quotes between
// the standings rows and the post they share.

// ─── HeroPlaque (desktop spotlight) ──────────────────────────────
function HeroPlaque({
  winner,
  isYouWinner,
  bankTotal,
  completeSets,
  gameSeed,
}: {
  winner: ClientPlayer;
  isYouWinner: boolean;
  bankTotal: number;
  completeSets: number;
  gameSeed: string | number;
}) {
  return (
    <div
      style={{
        position: "relative",
        padding: "22px 28px 22px 22px",
        borderRadius: 16,
        background:
          "linear-gradient(180deg, rgba(28,22,20,0.92) 0%, rgba(16,10,8,0.96) 100%)",
        border: "1px solid rgba(245,234,208,0.10)",
        boxShadow:
          "var(--sh-panel), 0 0 0 1px rgba(212,168,96,0.18), 0 0 60px -12px rgba(240,193,74,0.35)",
        display: "flex",
        alignItems: "center",
        gap: 22,
        minHeight: 130,
      }}
    >
      <div
        style={{
          width: 84,
          height: 84,
          borderRadius: "50%",
          background:
            "linear-gradient(180deg, var(--accent, #f0c14a) 0%, color-mix(in oklab, var(--accent, #f0c14a) 55%, #000) 100%)",
          color: "#1a1208",
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: 38,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow:
            "inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -2px 0 rgba(0,0,0,0.2), 0 4px 14px rgba(0,0,0,0.5), 0 0 0 3px rgba(240,193,74,0.45)",
          flexShrink: 0,
        }}
      >
        {winner.name[0]?.toUpperCase() ?? "?"}
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.06em",
            color: "var(--accent, #f0c14a)",
          }}
        >
          <span
            style={{
              width: 18,
              height: 1,
              background: "var(--accent, #f0c14a)",
              opacity: 0.7,
            }}
          />
          GAME OVER · WINNER
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 44,
              fontWeight: 800,
              color: "#f5ead0",
              letterSpacing: "-0.025em",
              lineHeight: 1,
            }}
          >
            {winner.name}
          </div>
          <CrownIcon size={28} />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 19,
              fontWeight: 700,
              color: "rgba(245,234,208,0.65)",
              letterSpacing: "-0.01em",
            }}
          >
            wins
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            fontStyle: "italic",
            color: "rgba(245,234,208,0.7)",
            marginTop: 2,
          }}
        >
          “{quipForRank(1, isYouWinner, winner.id, gameSeed)}”
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 26,
          alignItems: "center",
          paddingLeft: 22,
          borderLeft: "1px solid rgba(245,234,208,0.08)",
          alignSelf: "stretch",
        }}
      >
        <StatReadout
          label="Sets"
          value={`${completeSets}/3`}
          mono={false}
          size="lg"
          accent="#f5ead0"
        />
        <StatReadout
          label="Bank"
          value={`$${bankTotal}M`}
          mono={false}
          size="lg"
          accent="#7adb88"
        />
      </div>

      <WinnerSeal size={84} />
    </div>
  );
}

// ─── StandingsRow (desktop) ──────────────────────────────────────
function StandingsRow({
  player,
  rank,
  isYou,
  expanded,
  bankTotal,
  completeSets,
  settings: _settings,
  gameSeed,
}: {
  player: ClientPlayer;
  rank: number;
  isYou: boolean;
  expanded: boolean;
  bankTotal: number;
  completeSets: number;
  settings: GameSettings;
  gameSeed: string | number;
}) {
  const useSocialistTheme = useGameStore((s) => s.useSocialistTheme);
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        borderRadius: 12,
        background: expanded
          ? "linear-gradient(180deg, rgba(28,22,20,0.84) 0%, rgba(20,12,10,0.92) 100%)"
          : "rgba(0,0,0,0.32)",
        border: expanded
          ? "1px solid rgba(212,168,96,0.32)"
          : "1px solid rgba(255,255,255,0.05)",
        boxShadow: expanded
          ? "inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(212,168,96,0.10), 0 8px 24px -8px rgba(0,0,0,0.55)"
          : "inset 0 1px 0 rgba(255,255,255,0.04)",
        overflow: "hidden",
        opacity: expanded ? 1 : 0.92,
      }}
    >
      <RankRibbon rank={rank} height={expanded ? 134 : 120} />

      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: "14px 18px 14px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background:
                "linear-gradient(180deg, var(--accent, #f0c14a) 0%, color-mix(in oklab, var(--accent, #f0c14a) 55%, #000) 100%)",
              color: "#1a1208",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.2)",
              flexShrink: 0,
            }}
          >
            {player.name[0]?.toUpperCase() ?? "?"}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 20,
                fontWeight: 700,
                color: "#f5ead0",
                letterSpacing: "-0.015em",
              }}
            >
              {player.name}
            </span>
            {rank === 1 && <CrownIcon size={18} />}
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 18,
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.08em",
                  color: "rgba(245,234,208,0.5)",
                }}
              >
                SETS
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  fontWeight: 800,
                  color:
                    rank === 1 ? "var(--accent, #f0c14a)" : "#f5ead0",
                  letterSpacing: "-0.01em",
                  lineHeight: 1,
                }}
              >
                {completeSets}
                <span style={{ opacity: 0.4, fontWeight: 600 }}>/3</span>
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.08em",
                  color: "rgba(245,234,208,0.5)",
                }}
              >
                BANK
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#7adb88",
                  letterSpacing: "-0.01em",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                ${bankTotal}M
              </span>
            </div>
            <div
              style={{
                maxWidth: 260,
                padding: "6px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                fontStyle: "italic",
                color: isYou ? "#f5ead0" : "rgba(245,234,208,0.65)",
              }}
            >
              “{quipForRank(rank, isYou, player.id, gameSeed)}”
            </div>
          </div>
        </div>

        {expanded && player.properties.length > 0 ? (
          <div
            style={{
              marginTop: 4,
              paddingTop: 12,
              borderTop: "1px dashed rgba(245,234,208,0.10)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.12em",
                color: "rgba(245,234,208,0.55)",
                marginBottom: 8,
              }}
            >
              {completeSets} COMPLETE {completeSets === 1 ? "SET" : "SETS"}
            </div>
            <div style={{ overflowX: "auto" }} className="scrollbar-hide">
              <PropertySetsRow
                align="flex-start"
                sets={player.properties}
                useSocialistTheme={useSocialistTheme}
              />
            </div>
          </div>
        ) : (
          <CompactPropertyStrip
            sets={player.properties}
            bank={player.bank.map((c) => c.value)}
            showBank={false}
          />
        )}
      </div>
    </div>
  );
}

// ─── Mobile standings card ───────────────────────────────────────
function MobileStandingsCard({
  player,
  rank,
  isYou: _isYou,
  expanded,
  bankTotal,
  completeSets,
  settings: _settings,
}: {
  player: ClientPlayer;
  rank: number;
  isYou: boolean;
  expanded: boolean;
  bankTotal: number;
  completeSets: number;
  settings: GameSettings;
}) {
  const useSocialistTheme = useGameStore((s) => s.useSocialistTheme);
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 12,
        background: expanded
          ? "linear-gradient(180deg, rgba(28,22,20,0.86) 0%, rgba(20,12,10,0.94) 100%)"
          : "rgba(0,0,0,0.32)",
        border: expanded
          ? "1px solid rgba(212,168,96,0.32)"
          : "1px solid rgba(255,255,255,0.05)",
        boxShadow: expanded
          ? "0 0 0 1px rgba(212,168,96,0.10), 0 6px 16px -6px rgba(0,0,0,0.55)"
          : "inset 0 1px 0 rgba(255,255,255,0.04)",
        overflow: "hidden",
        display: "flex",
      }}
    >
      <RankRibbon rank={rank} height={expanded ? 132 : 64} />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: expanded ? "10px 12px 12px" : "8px 12px",
          display: "flex",
          flexDirection: "column",
          gap: expanded ? 8 : 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background:
                "linear-gradient(180deg, var(--accent, #f0c14a) 0%, color-mix(in oklab, var(--accent, #f0c14a) 55%, #000) 100%)",
              color: "#1a1208",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
              flexShrink: 0,
            }}
          >
            {player.name[0]?.toUpperCase() ?? "?"}
          </div>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 14,
              fontWeight: 700,
              color: "#f5ead0",
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {player.name}
          </span>
          {rank === 1 && <CrownIcon size={14} />}
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 8,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span
              style={{
                color:
                  rank === 1 ? "var(--accent, #f0c14a)" : "#f5ead0",
                fontWeight: 700,
              }}
            >
              {completeSets}/3
            </span>
            <span style={{ color: "#7adb88", fontWeight: 700 }}>
              ${bankTotal}M
            </span>
          </div>
        </div>
        {expanded && player.properties.length > 0 ? (
          <>
            <div
              style={{
                paddingTop: 6,
                borderTop: "1px dashed rgba(245,234,208,0.10)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 8,
                  letterSpacing: "0.12em",
                  color: "rgba(245,234,208,0.55)",
                }}
              >
                PROPERTIES
              </div>
            </div>
            <div
              style={{ overflowX: "auto", overflowY: "hidden" }}
              className="scrollbar-hide"
            >
              <PropertySetsRow
                align="flex-start"
                sets={player.properties}
                compact
                useSocialistTheme={useSocialistTheme}
              />
            </div>
          </>
        ) : (
          <CompactPropertyStrip
            sets={player.properties}
            bank={player.bank.map((c) => c.value)}
            dense
            showBank={false}
          />
        )}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────
export function EndGameSummary({
  players,
  winnerId,
  currentPlayerId,
  settings,
  gameSeed,
  onRematch,
  onReturnToLobby,
  onGoHome,
  onShare,
}: EndGameSummaryProps) {
  const { theme } = useGameStore();
  const { t } = useI18n();
  const themeData = getTheme(theme);
  const layout = useLayout();
  const isCompact = layout === "compact";

  const winner = players.find((p) => p.id === winnerId) ?? players[0];
  const sortedPlayers = sortPlayersByRank(players, winnerId);

  const winnerBank = winner.bank.reduce((s, c) => s + c.value, 0);
  const winnerSets = winner.properties.filter(isSetComplete).length;
  const isYouWinner = winner.id === currentPlayerId;

  return (
    <div
      className={`min-h-dynamic-screen ${themeData.feltClass} felt-surface overflow-y-auto`}
      style={{ position: "relative" }}
    >
      <ConfettiLayer count={isCompact ? 36 : 70} seed={11} />
      <div
        style={{
          position: "relative",
          zIndex: 6,
          padding: isCompact ? "14px" : "30px 36px",
          display: "flex",
          flexDirection: "column",
          gap: isCompact ? 12 : 14,
          maxWidth: 1280,
          margin: "0 auto",
        }}
      >
        {/* Hero plaque + actions */}
        {isCompact ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            style={{
              padding: "14px",
              borderRadius: 14,
              background:
                "linear-gradient(180deg, rgba(28,22,20,0.92) 0%, rgba(16,10,8,0.96) 100%)",
              border: "1px solid rgba(212,168,96,0.28)",
              boxShadow:
                "0 0 60px -16px rgba(240,193,74,0.4), 0 12px 24px -8px rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background:
                  "linear-gradient(180deg, var(--accent, #f0c14a) 0%, color-mix(in oklab, var(--accent, #f0c14a) 55%, #000) 100%)",
                color: "#1a1208",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 26,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow:
                  "inset 0 2px 0 rgba(255,255,255,0.4), 0 0 0 2px rgba(240,193,74,0.45)",
                flexShrink: 0,
              }}
            >
              {winner.name[0]?.toUpperCase() ?? "?"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  color: "var(--accent, #f0c14a)",
                  marginBottom: 2,
                }}
              >
                GAME OVER · WINNER
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#f5ead0",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.05,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {winner.name}
                </div>
                <CrownIcon size={18} />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 5,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                }}
              >
                <span
                  style={{ color: "var(--accent, #f0c14a)", fontWeight: 700 }}
                >
                  {winnerSets}/3 sets
                </span>
                <span style={{ color: "#7adb88", fontWeight: 700 }}>
                  ${winnerBank}M
                </span>
              </div>
            </div>
            <WinnerSeal size={56} />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            style={{ flexShrink: 0 }}
          >
            <HeroPlaque
              winner={winner}
              isYouWinner={isYouWinner}
              bankTotal={winnerBank}
              completeSets={winnerSets}
              gameSeed={gameSeed}
            />
          </motion.div>
        )}

        {/* Final Standings ledger */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: isCompact ? 8 : 10,
            // Extra bottom padding so the last standings row isn't hidden
            // behind the fixed action bar at the bottom. Compact stacks
            // up to 4 buttons vertically (~240px with gaps + safe area).
            paddingBottom: isCompact ? 260 : 80,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 14,
              padding: "0 4px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.06em",
                color: "rgba(245,234,208,0.6)",
              }}
            >
              FINAL STANDINGS
            </div>
            <div
              style={{
                flex: 1,
                height: 1,
                background:
                  "linear-gradient(90deg, rgba(245,234,208,0.18), transparent)",
              }}
            />
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.06em",
                color: "rgba(245,234,208,0.4)",
              }}
            >
              {players.length} PLAYERS
            </div>
          </div>

          {sortedPlayers.map((player, i) => {
            const rank = i + 1;
            const isYou = player.id === currentPlayerId;
            const expanded = rank === 1;
            const bankTotal = player.bank.reduce((s, c) => s + c.value, 0);
            const completeSets = player.properties.filter(isSetComplete)
              .length;
            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i + 0.2 }}
              >
                {isCompact ? (
                  <MobileStandingsCard
                    player={player}
                    rank={rank}
                    isYou={isYou}
                    expanded={expanded}
                    bankTotal={bankTotal}
                    completeSets={completeSets}
                    settings={settings}
                  />
                ) : (
                  <StandingsRow
                    player={player}
                    rank={rank}
                    isYou={isYou}
                    expanded={expanded}
                    bankTotal={bankTotal}
                    completeSets={completeSets}
                    settings={settings}
                    gameSeed={gameSeed}
                  />
                )}
              </motion.div>
            );
          })}
        </div>

      </div>

      {/* Fixed bottom action bar */}
      {(onRematch || onGoHome) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            padding: isCompact ? "12px 14px" : "14px 36px",
            paddingBottom: isCompact
              ? "max(12px, env(safe-area-inset-bottom))"
              : "14px",
            background:
              "linear-gradient(180deg, rgba(16,10,8,0) 0%, rgba(16,10,8,0.85) 30%, rgba(16,10,8,0.96) 100%)",
            display: "flex",
            gap: 10,
            flexDirection: isCompact ? "column" : "row",
            justifyContent: isCompact ? "stretch" : "center",
            alignItems: "stretch",
          }}
        >
          {onRematch && (
            <PrimaryButton
              onClick={onRematch}
              size="md"
              fullWidth={isCompact}
              style={!isCompact ? { minWidth: 200 } : undefined}
            >
              ↻ {t.finished.rematch}
            </PrimaryButton>
          )}
          {onShare && (
            <SecondaryButton
              onClick={onShare}
              size="md"
              fullWidth={isCompact}
              style={
                !isCompact
                  ? { minWidth: 160, display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }
                  : { display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }
              }
            >
              <Share2 className="w-4 h-4" />
              {t.finished.share}
            </SecondaryButton>
          )}
          {onReturnToLobby && (
            <SecondaryButton
              onClick={onReturnToLobby}
              size="md"
              fullWidth={isCompact}
              style={!isCompact ? { minWidth: 200 } : undefined}
            >
              {t.finished.changePlayers}
            </SecondaryButton>
          )}
          {onGoHome && (
            <SecondaryButton
              onClick={onGoHome}
              size="md"
              fullWidth={isCompact}
              style={!isCompact ? { minWidth: 200 } : undefined}
            >
              {t.finished.leave}
            </SecondaryButton>
          )}
        </motion.div>
      )}
    </div>
  );
}
