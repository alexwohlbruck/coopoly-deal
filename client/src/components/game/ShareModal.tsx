// ShareModal — Wordle-style "tweet preview" with platform deep-links.
//
// Visual centerpiece is the preview card: a stylized "post draft" showing
// the user's result with the winning property colors animated in as a row
// of tinted tiles (the moment you'd want to screenshot or post). Below it,
// brand-colored buttons deep-link to a pre-filled compose window on X,
// Bluesky, Threads — plus copy-to-clipboard and (on mobile) the native
// share sheet for everything else.

import { motion, AnimatePresence } from "framer-motion";
import { Copy, Share2 } from "lucide-react";
import { ModalCloseButton } from "../common/ModalCloseButton";
import type { ClientGameState, PropertyColor } from "../../types/game";
import {
  isSetComplete,
  PROPERTY_COLOR_HEX,
  PropertyColor as PC,
} from "../../types/game";
import { useGameStore } from "../../hooks/useGameStore";
import { useI18n } from "../../i18n";
import { useButtonStates } from "../../hooks/useButtonStates";
import { quipForRank, getPlayerRank } from "../../utils/endGameQuips";

declare global {
  interface Window {
    umami?: {
      track: (
        name?:
          | string
          | Record<string, unknown>
          | ((props: Record<string, unknown>) => Record<string, unknown>),
        data?: Record<string, unknown>,
      ) => void;
    };
  }
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: ClientGameState;
  playerId: string;
  sessionStats?: {
    wins: number;
    losses: number;
    streak: number;
    gamesPlayed: number;
  };
}

const SHARE_URL = typeof window !== "undefined" ? window.location.origin : "https://monopolydeal.online";

// ─── Emoji squares for the plain-text version ───────────────────
// (These ship in the actual posted text. The visual on-screen tiles
// are styled boxes — see ColorTile below.)
const COLOR_EMOJI: Record<PropertyColor, string> = {
  [PC.Brown]: "🟫",
  [PC.LightBlue]: "🟦",
  [PC.Pink]: "🟪",
  [PC.Orange]: "🟧",
  [PC.Red]: "🟥",
  [PC.Yellow]: "🟨",
  [PC.Green]: "🟩",
  [PC.DarkBlue]: "🟦",
  [PC.Railroad]: "⬛",
  [PC.Utility]: "🟪",
  [PC.Unassigned]: "⬜",
};

// Quips are pulled from the shared rank-based pool in ../../utils/endGameQuips
// — the same pool the standings rows use, so the player sees matching
// quotes between their standings card and the post they share.

interface ShareData {
  won: boolean;
  durationMin: number;
  playerCount: number;
  setColors: PropertyColor[];
  streak: number;
  wins: number;
  losses: number;
  quip: string;
}

// Pluralized record string — "6 wins · 2 losses", "1 win · 1 loss".
// Spelled out (not "6W · 2L") so casual readers on social media don't
// have to decode an abbreviation.
function formatRecord(wins: number, losses: number): string {
  const w = `${wins} ${wins === 1 ? "win" : "wins"}`;
  const l = `${losses} ${losses === 1 ? "loss" : "losses"}`;
  return `${w} · ${l}`;
}

function buildShareText(d: ShareData): string {
  const lines: string[] = [];
  if (d.won) {
    if (d.setColors.length > 0) {
      lines.push(d.setColors.map((c) => COLOR_EMOJI[c]).join(""));
    }
    lines.push(`"${d.quip}"`);
    if (d.streak >= 2) {
      lines.push(
        `🚩 ${d.durationMin}m · ${d.playerCount} comrades · 🔥 ${d.streak}-game vanguard streak`,
      );
    } else {
      lines.push(`🚩 ${d.durationMin}m · ${d.playerCount} comrades`);
    }
  } else {
    lines.push(`"${d.quip}"`);
    lines.push(
      `${d.durationMin}m · ${d.playerCount} comrades · ${formatRecord(d.wins, d.losses)}`,
    );
  }
  lines.push("");
  lines.push(SHARE_URL);
  return lines.join("\n");
}

// ─── Brand icons (inline SVG, monochrome — colored via currentColor) ──

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function BlueskyIcon() {
  return (
    <svg viewBox="0 0 64 57" width="16" height="16" fill="currentColor">
      <path d="M13.873 3.805C21.21 9.332 29.103 20.537 32 26.55v15.882c0-.338-.13.044-.41.867-1.512 4.456-7.418 21.847-20.923 7.944-7.111-7.32-3.819-14.64 9.125-16.85-7.405 1.264-15.73-.825-18.014-9.015C1.12 23.022 0 8.51 0 6.55 0-3.268 8.579-.182 13.873 3.805zM50.127 3.805C42.79 9.332 34.897 20.537 32 26.55v15.882c0-.338.13.044.41.867 1.512 4.456 7.418 21.847 20.923 7.944 7.111-7.32 3.819-14.64-9.125-16.85 7.405 1.264 15.73-.825 18.014-9.015C62.88 23.022 64 8.51 64 6.55c0-9.818-8.578-6.732-13.873-2.745z" />
    </svg>
  );
}

function ThreadsIcon() {
  return (
    <svg viewBox="0 0 192 192" width="16" height="16" fill="currentColor">
      <path d="M141.537 88.988c-.65-.31-1.31-.61-1.98-.9-1.17-21.55-12.94-33.49-32.7-33.61-9.05-.06-16.6 1.94-22.42 5.97l8.9 13.66c4.16-2.74 9.7-4.06 16.4-4.01 12.04.07 18.51 5.55 19.92 16.62-7.93-1.41-16.5-1.61-25.6-.59-26.93 3.06-44.2 19-43.6 39.79.32 11.13 6.48 20.4 17.42 26.13 9.36 4.9 21.34 6.94 33.85 5.42 19.16-2.13 33.56-11.32 41.66-26.99 5.95-11.55 7.21-26.04 4.05-39.63zM103.2 130.7c-7.65 1.86-15.5.81-19.59-2.83-2.07-1.85-3.07-4.04-3.16-6.92-.16-5.36 4.95-12.04 21.06-13.87 9.39-1.07 17.91-.84 25.78.71-1.95 11.93-7.7 19.84-24.09 22.91zM157.34 71.94c-2.7-1.16-5.5-2.13-8.4-2.91-5.04-23.7-22.03-37.05-43.67-37.05-13.51 0-25.45 5.78-32.97 16.36l13.55 9.66c5.43-7.65 13.55-9.39 19.42-9.39 14.4 0 23.27 7.42 26.46 22.16-7.34-1.62-15.32-2.06-23.66-1.32-26.43 2.34-44.03 18.8-43.55 39.79.32 13.95 7.06 25.6 19.5 33.71 11.16 7.27 25.4 9.97 39.64 7.86 22.76-3.36 39.83-15.91 47.98-35.36 6.06-14.45 7.32-31.61 4.69-46.51z" />
    </svg>
  );
}

// ─── Color tile — styled box version of the emoji squares ─────────

function ColorTile({ color, delay }: { color: PropertyColor; delay: number }) {
  const hex = PROPERTY_COLOR_HEX[color] ?? "#888";
  return (
    <motion.div
      initial={{ scale: 0.4, opacity: 0, rotateY: -90 }}
      animate={{ scale: 1, opacity: 1, rotateY: 0 }}
      transition={{
        delay,
        type: "spring",
        stiffness: 280,
        damping: 18,
      }}
      style={{
        width: 36,
        height: 36,
        borderRadius: 6,
        background: `linear-gradient(180deg, ${hex} 0%, color-mix(in oklab, ${hex} 65%, #000) 100%)`,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.4)",
        border: "1px solid rgba(0,0,0,0.3)",
      }}
    />
  );
}

// ─── Platform button ───────────────────────────────────────────────

interface PlatformButtonProps {
  label: string;
  icon: React.ReactNode;
  bg: string;
  fg: string;
  onClick: () => void;
}

function PlatformButton({ label, icon, bg, fg, onClick }: PlatformButtonProps) {
  const { handlers, transform, filter, transition } = useButtonStates({
    hoverBrightness: 1.15,
  });
  return (
    <button
      onClick={onClick}
      {...handlers}
      style={{
        flex: 1,
        minWidth: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "10px 12px",
        borderRadius: 10,
        background: bg,
        color: fg,
        border: "1px solid rgba(255,255,255,0.08)",
        fontFamily: "var(--font-ui)",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        transform,
        filter,
        transition,
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ─── Main modal ───────────────────────────────────────────────────

export function ShareModal({
  isOpen,
  onClose,
  gameState,
  playerId,
  sessionStats,
}: ShareModalProps) {
  const { t } = useI18n();
  const { setToast } = useGameStore();

  if (!isOpen) return null;

  const winner =
    gameState.players.find((p) => p.id === gameState.winner) ??
    gameState.players[0];
  const isYouWinner = winner?.id === playerId;
  const setColors: PropertyColor[] = (winner?.properties ?? [])
    .filter(isSetComplete)
    .map((s) => s.color);
  const durationMin = gameState.startedAt
    ? Math.max(1, Math.round((Date.now() - gameState.startedAt) / 60_000))
    : 0;

  // Pick the same quip the standings row will display for this player —
  // shared util, same seed format ("playerId:gameSeed"), same rank
  // bucket. So a 3rd-place comrade reading "Played a fair game.
  // Capitalism didn't." in their card sees the exact same line in their
  // share post.
  const playerRank = getPlayerRank(
    gameState.players,
    playerId,
    gameState.winner,
  );
  const quipSeed = gameState.startedAt ?? gameState.id;
  const quip = quipForRank(playerRank, true, playerId, quipSeed);
  const streak = sessionStats?.streak ?? 0;

  const data: ShareData = {
    won: isYouWinner,
    durationMin,
    playerCount: gameState.players.length,
    setColors,
    streak,
    wins: sessionStats?.wins ?? 0,
    losses: sessionStats?.losses ?? 0,
    quip,
  };
  const shareText = buildShareText(data);

  const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  const bskyUrl = `https://bsky.app/intent/compose?text=${encodeURIComponent(shareText)}`;
  const threadsUrl = `https://www.threads.net/intent/post?text=${encodeURIComponent(shareText)}`;

  const trackShare = (platform: string) => {
    window.umami?.track("share_clicked", { platform });
  };

  const openIntent = (url: string, platform: string) => {
    trackShare(platform);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      trackShare("copy");
      setToast(t.finished.shareCopied);
      onClose();
    } catch {
      // Clipboard blocked — silent.
    }
  };

  const canNativeShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    /Mobi|Android|iPhone|iPad/.test(navigator.userAgent);

  const handleNative = async () => {
    try {
      await navigator.share({ text: shareText, url: SHARE_URL });
      trackShare("native");
    } catch {
      // User cancelled.
    }
  };

  // Stat line — combined for the visual card. The tiles + quip carry the
  // brand identity now that we dropped the title; URL footer reinforces.
  const metaLine = data.won
    ? data.streak >= 2
      ? `🚩 ${data.durationMin}m · ${data.playerCount} comrades · 🔥 ${data.streak}-game vanguard streak`
      : `🚩 ${data.durationMin}m · ${data.playerCount} comrades`
    : `${data.durationMin}m · ${data.playerCount} comrades · ${formatRecord(data.wins, data.losses)}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.22, ease: [0.22, 0.9, 0.32, 1] }}
          className="relative w-full max-w-md game-rules-modal flex flex-col"
          style={{ maxHeight: "85vh" }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "16px 20px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 20,
                fontWeight: 800,
                color: "#f5ead0",
                letterSpacing: "-0.01em",
                margin: 0,
              }}
            >
              {t.finished.shareTitle}
            </h2>
            <ModalCloseButton onClick={onClose} ariaLabel={t.rules.close} />
          </div>

          {/* Body */}
          <div
            style={{
              padding: "18px 20px 20px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Preview caption */}
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(245,234,208,0.45)",
              }}
            >
              {t.finished.sharePreviewLabel}
            </div>

            {/* Preview card — styled like a post draft */}
            <div
              style={{
                position: "relative",
                background:
                  "linear-gradient(180deg, rgba(20,16,14,0.95) 0%, rgba(10,6,4,0.98) 100%)",
                border: "1px solid rgba(245,234,208,0.12)",
                borderRadius: 14,
                padding: 18,
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 24px -4px rgba(0,0,0,0.5)",
                fontFamily: "var(--font-ui)",
                color: "#f5ead0",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {/* Subtle accent stripe */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 18,
                  right: 18,
                  height: 1,
                  background:
                    "linear-gradient(90deg, transparent, rgba(240,193,74,0.4), transparent)",
                }}
              />

              {/* Animated tile row — only when winner. Carries the
                  Wordle-style visual hook now that the title is gone. */}
              {data.won && setColors.length > 0 && (
                <div style={{ display: "flex", gap: 6 }}>
                  {setColors.map((c, i) => (
                    <ColorTile
                      key={`${c}-${i}`}
                      color={c}
                      delay={0.1 + i * 0.12}
                    />
                  ))}
                </div>
              )}

              {/* Flavor quip — italic, gold accent. The narrative hook. */}
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay:
                    data.won && setColors.length > 0
                      ? 0.1 + setColors.length * 0.12 + 0.05
                      : 0.1,
                  duration: 0.3,
                }}
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  fontWeight: 700,
                  fontStyle: "italic",
                  color: "var(--accent, #f0c14a)",
                  lineHeight: 1.35,
                  letterSpacing: "-0.005em",
                }}
              >
                “{quip}”
              </motion.div>

              <div
                style={{
                  fontSize: 13,
                  color: "rgba(245,234,208,0.75)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {metaLine}
              </div>

              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "rgba(245,234,208,0.45)",
                  marginTop: 4,
                }}
              >
                {typeof window !== "undefined" ? window.location.hostname : "monopolydeal.online"}
              </div>
            </div>

            {/* Platform buttons — first row: brand-colored deep-links */}
            <div style={{ display: "flex", gap: 8 }}>
              <PlatformButton
                label={t.finished.shareOnX}
                icon={<XIcon />}
                bg="#000"
                fg="#fff"
                onClick={() => openIntent(xUrl, "x")}
              />
              <PlatformButton
                label={t.finished.shareOnBluesky}
                icon={<BlueskyIcon />}
                bg="#0085ff"
                fg="#fff"
                onClick={() => openIntent(bskyUrl, "bluesky")}
              />
              <PlatformButton
                label={t.finished.shareOnThreads}
                icon={<ThreadsIcon />}
                bg="#101010"
                fg="#fff"
                onClick={() => openIntent(threadsUrl, "threads")}
              />
            </div>

            {/* Second row: copy + native */}
            <div style={{ display: "flex", gap: 8 }}>
              <PlatformButton
                label={t.finished.shareCopy}
                icon={<Copy size={16} />}
                bg="rgba(255,255,255,0.06)"
                fg="rgba(245,234,208,0.85)"
                onClick={handleCopy}
              />
              {canNativeShare && (
                <PlatformButton
                  label={t.finished.shareNative}
                  icon={<Share2 size={16} />}
                  bg="rgba(255,255,255,0.06)"
                  fg="rgba(245,234,208,0.85)"
                  onClick={handleNative}
                />
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
