import { useEffect, useRef, useState } from "react";
import { type SoundEffect } from "./useSoundManager";

/**
 * Seconds left on the current turn, ticking once a second.
 *
 * `expiresAt` is stamped with the *server's* clock, so subtracting a local
 * Date.now() from it is only correct while the two machines agree. They often
 * don't — a container clock that drifted while the host slept is enough to pin
 * the display at 0s even though the server's own timer is running fine. So we
 * anchor to `serverNow` (the server clock at broadcast time) to get the real
 * remaining time, then count that down against the local clock.
 */
export function useTurnTimer(
  expiresAt: number | null,
  pausedTimeLeft: number | null,
  serverNow: number | undefined,
  play: (effect: SoundEffect) => void,
) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  // Survives the effect re-running (every state update re-anchors the clock)
  // so we don't replay the same countdown beep.
  const lastBeepedTime = useRef(-1);

  useEffect(() => {
    // A live deadline wins over `pausedTimeLeft`: the server clears one when
    // it sets the other, and taking the paused value first would freeze the
    // display on a snapshot that carried both.
    if (expiresAt) {
      const deadline = Date.now() + (expiresAt - (serverNow ?? Date.now()));

      const updateTimer = () => {
        const remaining = Math.max(
          0,
          Math.ceil((deadline - Date.now()) / 1000),
        );
        setTimeLeft(remaining);

        if (remaining > 5) {
          lastBeepedTime.current = -1;
        } else if (remaining > 0 && remaining !== lastBeepedTime.current) {
          play("tick");
          lastBeepedTime.current = remaining;
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }

    if (pausedTimeLeft !== null && pausedTimeLeft !== undefined) {
      // Paused (an action is pending) — hold the remaining time on screen.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeLeft(Math.ceil(pausedTimeLeft / 1000));
      return;
    }

    setTimeLeft(null);
  }, [expiresAt, pausedTimeLeft, serverNow, play]);

  return timeLeft;
}
