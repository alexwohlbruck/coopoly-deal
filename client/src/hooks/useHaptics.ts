// useHaptics — thin wrapper around web-haptics.
// Centralizes the patterns we trigger across the game so individual
// components don't have to know about web-haptics' API. Honors the
// `hapticsEnabled` setting from useSoundSettings.

import { useCallback } from "react";
import { useWebHaptics } from "web-haptics/react";
import { WebHaptics } from "web-haptics";
import { useSoundSettings } from "./useSoundManager";

/**
 * Higher-level event names mapped to web-haptics presets / custom
 * patterns. Tuned to a 4-tier importance scale so the entire UI
 * has a consistent rhythm: chrome controls barely tick; primary
 * actions feel firmer; success/loss bursts are reserved for game
 * outcomes. Tweaked DOWN overall vs. the first pass — the early
 * version was noticeably too buzzy.
 *
 *   micro   — barely-there tick (icon chrome buttons, peek slide)
 *   tap     — light tap (secondary buttons, generic UI)
 *   select  — medium tap (turn-start, choosing a target)
 *   play    — firm tap (card committed)
 *   primary — slightly firmer tap (primary CTAs)
 *   warn    — double-tap caution
 *   complete — short success cluster (set complete)
 *   win     — triple cluster, big moment
 *   error   — three sharp taps
 *   steal   — escalating cluster (cards taken)
 *   buzz    — long buzz (game-over loss / urgent)
 */
export type HapticEvent =
  | "micro"
  | "tap"
  | "select"
  | "play"
  | "primary"
  | "draw"
  | "complete"
  | "win"
  | "error"
  | "warn"
  | "steal"
  | "buzz";

type HapticTrigger = (preset: string | number | unknown) => void;

function dispatch(trigger: HapticTrigger, event: HapticEvent) {
  switch (event) {
    case "micro":
      trigger([{ duration: 8, intensity: 0.35 }]);
      break;
    case "tap":
      trigger([{ duration: 12, intensity: 0.45 }]);
      break;
    case "select":
      trigger([{ duration: 18, intensity: 0.6 }]);
      break;
    case "play":
      // Card committed — firm but short.
      trigger([{ duration: 22, intensity: 0.7 }]);
      break;
    case "primary":
      // Primary CTAs (Confirm Swap, Start Game, Rematch).
      trigger([{ duration: 22, intensity: 0.65 }]);
      break;
    case "draw":
      trigger([
        { duration: 12, intensity: 0.4 },
        { delay: 50, duration: 12, intensity: 0.35 },
      ]);
      break;
    case "complete":
      trigger([
        { duration: 26, intensity: 0.7 },
        { delay: 60, duration: 26, intensity: 0.55 },
      ]);
      break;
    case "win":
      // Slightly toned down vs. the first pass.
      trigger([
        { duration: 40, intensity: 0.85 },
        { delay: 80, duration: 40, intensity: 0.65 },
        { delay: 80, duration: 90, intensity: 0.85 },
      ]);
      break;
    case "error":
      trigger([
        { duration: 22, intensity: 0.65 },
        { delay: 60, duration: 22, intensity: 0.65 },
        { delay: 60, duration: 22, intensity: 0.65 },
      ]);
      break;
    case "warn":
      trigger([
        { duration: 18, intensity: 0.5 },
        { delay: 60, duration: 18, intensity: 0.5 },
      ]);
      break;
    case "steal":
      trigger([
        { duration: 18, intensity: 0.55 },
        { delay: 40, duration: 18, intensity: 0.55 },
        { delay: 40, duration: 40, intensity: 0.75 },
      ]);
      break;
    case "buzz":
      // Was the "buzz" preset (1000ms full intensity) — that's a lot.
      // Short single thump for game-over loss instead.
      trigger([{ duration: 200, intensity: 0.8 }]);
      break;
  }
}

export function useHaptics() {
  const { trigger } = useWebHaptics();
  const enabled = useSoundSettings((s) => s.hapticsEnabled);

  const fire = useCallback(
    (event: HapticEvent) => {
      if (!enabled) return;
      try {
        dispatch(trigger as HapticTrigger, event);
      } catch {
        // Vibration API unavailable on this device; silent fallback.
      }
    },
    [trigger, enabled],
  );

  return { haptic: fire };
}

// ── Preview helper (non-hook) ─────────────────────────────────────
// Bypasses the `enabled` check so settings can fire a one-shot
// preview when the user toggles haptics ON (the hook-based haptic
// would otherwise be cached against the previous `enabled = false`
// render and skip the call).
let previewHapticsInstance: WebHaptics | null = null;
function getPreviewHaptics(): WebHaptics {
  if (!previewHapticsInstance) previewHapticsInstance = new WebHaptics();
  return previewHapticsInstance;
}

export function previewHaptic(event: HapticEvent) {
  try {
    const h = getPreviewHaptics();
    dispatch((p) => h.trigger(p as never), event);
  } catch {
    // Vibration API unavailable; silent fallback.
  }
}
