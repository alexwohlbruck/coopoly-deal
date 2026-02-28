import { useState, useEffect } from "react";
import { type SoundEffect } from "./useSoundManager";

export function useTurnTimer(
  expiresAt: number | null,
  pausedTimeLeft: number | null,
  play: (effect: SoundEffect) => void,
) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (pausedTimeLeft !== null && pausedTimeLeft !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeLeft(Math.ceil(pausedTimeLeft / 1000));
      return;
    }

    if (!expiresAt) {
      setTimeLeft(null);
      return;
    }

    let lastBeepedTime = -1;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 5 && remaining > 0 && remaining !== lastBeepedTime) {
        play("tick");
        lastBeepedTime = remaining;
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, pausedTimeLeft, play]);

  return timeLeft;
}
