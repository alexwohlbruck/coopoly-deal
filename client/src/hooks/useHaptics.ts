// useHaptics — thin wrapper around web-haptics.
// Centralizes the patterns we trigger across the game so individual
// components don't have to know about web-haptics' API. Honors the
// `hapticsEnabled` setting from useSoundSettings.

import { useCallback } from "react";
import { useWebHaptics } from "web-haptics/react";
import { useSoundSettings } from "./useSoundManager";

/**
 * Higher-level event names mapped to web-haptics presets / custom
 * patterns. Keeping a fixed vocabulary here so the rest of the app
 * doesn't have to think in milliseconds and intensities.
 */
export type HapticEvent =
  | "tap" // generic UI tap
  | "select" // chose an item (color / target)
  | "play" // played a card
  | "draw" // drew a card
  | "complete" // completed a property set / strong success
  | "win" // game won
  | "error" // invalid action / rejected
  | "warn" // caution (low timer, must discard)
  | "steal" // a card was taken from / by you
  | "buzz"; // long buzz (game-over loss / urgent)

type HapticTrigger = (preset: string | number | unknown) => void;

function dispatch(trigger: HapticTrigger, event: HapticEvent) {
  switch (event) {
    case "tap":
      trigger(20);
      break;
    case "select":
      trigger("nudge");
      break;
    case "play":
      // a single firmer tap when a card is committed
      trigger([{ duration: 30, intensity: 0.8 }]);
      break;
    case "draw":
      trigger([
        { duration: 18, intensity: 0.5 },
        { delay: 40, duration: 18, intensity: 0.4 },
      ]);
      break;
    case "complete":
      trigger("success");
      break;
    case "win":
      trigger([
        { duration: 60, intensity: 1 },
        { delay: 80, duration: 60, intensity: 0.8 },
        { delay: 80, duration: 120, intensity: 1 },
      ]);
      break;
    case "error":
      trigger("error");
      break;
    case "warn":
      trigger([
        { duration: 30, intensity: 0.6 },
        { delay: 60, duration: 30, intensity: 0.6 },
      ]);
      break;
    case "steal":
      trigger([
        { duration: 25, intensity: 0.7 },
        { delay: 35, duration: 25, intensity: 0.7 },
        { delay: 35, duration: 60, intensity: 0.9 },
      ]);
      break;
    case "buzz":
      trigger("buzz");
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
