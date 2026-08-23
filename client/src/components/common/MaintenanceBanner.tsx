import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useI18n } from "../../i18n";
import { fmt } from "../../i18n/format";
import type { ServerNotice } from "../../types/game";

/**
 * The countdown to a scheduled restart.
 *
 * The server sends one message and then says nothing more: the notice carries
 * an absolute time, so the banner ticks on its own and stays right through a
 * reconnect. Dismissing hides it until the last few minutes, when it comes
 * back regardless — the point of the thing is that nobody is surprised.
 */

/** Below this much time left, a dismissed banner reasserts itself. */
const REASSERT_MS = 5 * 60 * 1000;

const DISMISS_KEY = "coopoly-notice-dismissed";

interface Props {
  notice: ServerNotice;
  /** serverNow − Date.now() at receipt. Phone clocks drift by minutes. */
  clockOffset: number;
}

export function MaintenanceBanner({ notice, clockOffset }: Props) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now() + clockOffset);
  const [dismissedId, setDismissedId] = useState(() => readDismissed());
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + clockOffset), 1000);
    return () => clearInterval(id);
  }, [clockOffset]);

  // A notice already dismissed in a previous session shouldn't flash on load.
  useEffect(() => {
    setDismissedId(readDismissed());
  }, [notice.id]);

  const remaining = notice.scheduledAt - now;
  const hidden = dismissedId === notice.id && remaining > REASSERT_MS;

  // Everything else on screen sits below the bar, so its height has to be a
  // number the rest of the app can read. It wraps to two or three lines on a
  // phone and changes with the locale, so it is measured, not assumed.
  useEffect(() => {
    const root = document.documentElement;
    const clear = () => root.style.setProperty("--notice-height", "0px");
    const el = boxRef.current;
    if (!el) {
      clear();
      return;
    }
    const report = () =>
      root.style.setProperty(
        "--notice-height",
        `${el.getBoundingClientRect().height}px`,
      );
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => {
      observer.disconnect();
      clear();
    };
  }, [hidden]);

  if (hidden) return null;

  const countdown = formatRemaining(remaining, t);
  const text = notice.message
    ? `${notice.message}${remaining > 0 ? ` — ${fmt(t.notice.in, { time: countdown })}` : ""}`
    : remaining > 0
      ? fmt(t.notice.maintenance, { time: countdown })
      : t.notice.maintenanceNow;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, notice.id);
    } catch {
      // Private browsing — the banner just comes back on reload.
    }
    setDismissedId(notice.id);
  };

  return (
    <motion.div
      ref={boxRef}
      role="status"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.18, ease: [0.22, 0.9, 0.32, 1] }}
      // A full-width bar at the very top. Nothing is covered: the app's own
      // chrome is pushed down by --notice-height (see index.css).
      className="fixed top-0 left-0 right-0 z-[90]"
      style={{
        // At the screen edge now, so it owes the notch its inset.
        paddingTop: "max(8px, env(safe-area-inset-top))",
        paddingBottom: 8,
        paddingLeft: "max(14px, env(safe-area-inset-left))",
        paddingRight: "max(10px, env(safe-area-inset-right))",
        background:
          "linear-gradient(180deg, rgba(58,38,16,0.97) 0%, rgba(32,20,8,0.98) 100%)",
        borderBottom: "1px solid rgba(240,193,74,0.35)",
        color: "#f5ead0",
        fontFamily: "var(--font-ui)",
        fontSize: 12,
        fontWeight: 600,
        boxShadow:
          "0 6px 20px -4px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span
        className={remaining <= REASSERT_MS ? "animate-pulse" : undefined}
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          flexShrink: 0,
          background: "var(--accent, #f0c14a)",
          boxShadow: "0 0 8px var(--accent, #f0c14a)",
        }}
      />
      <span style={{ flex: 1, textAlign: "center", lineHeight: 1.35 }}>
        {text}
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t.notice.dismiss}
        title={t.notice.dismiss}
        style={{
          flexShrink: 0,
          width: 22,
          height: 22,
          borderRadius: 6,
          border: "none",
          background: "rgba(255,255,255,0.07)",
          color: "#f5ead0",
          fontSize: 13,
          lineHeight: 1,
          cursor: "pointer",
        }}
      >
        ×
      </button>
    </motion.div>
  );
}

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

/** Coarse on purpose: "58m" reads as an estimate, "57m 43s" reads as a promise. */
function formatRemaining(ms: number, t: ReturnType<typeof useI18n.getState>["t"]): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return fmt(t.notice.hoursMinutes, { h, m });
  if (m > 0) return fmt(t.notice.minutes, { m });
  return fmt(t.notice.seconds, { s: total });
}
