// useButtonStates — shared hover + press tracking for button-shaped
// components. Inline-style buttons can't use CSS :hover / :active, so
// we track these as React state and surface them as a `transform` +
// `filter` pair the caller drops into their style block.
//
// Behavior:
//   - hover (no press): scale(1.02) + slight brightness lift
//   - press (active):    scale(0.96), no brightness lift
//   - leaves cancel both states (avoids "stuck pressed" if the user
//     drags the cursor out of the element while holding down)
//   - touch start/end mirror mouse down/up so taps feel pressy on
//     mobile too
//
// Disabled buttons get a passthrough — no animations, since "press"
// feedback on a disabled control would lie about what's happening.

import { useState } from "react";

interface UseButtonStatesOptions {
  disabled?: boolean;
  /** Hover-time scale. 1.02 by default — subtle, doesn't shift layout. */
  hoverScale?: number;
  /** Active-time scale. 0.96 by default — gives a real press feel. */
  pressScale?: number;
  /** Hover brightness multiplier. 1.08 by default. */
  hoverBrightness?: number;
}

export function useButtonStates({
  disabled = false,
  hoverScale = 1.02,
  pressScale = 0.96,
  hoverBrightness = 1.08,
}: UseButtonStatesOptions = {}) {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);

  const handlers = disabled
    ? {}
    : {
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => {
          setHover(false);
          setPressed(false);
        },
        onMouseDown: () => setPressed(true),
        onMouseUp: () => setPressed(false),
        onTouchStart: () => setPressed(true),
        onTouchEnd: () => {
          setPressed(false);
          setHover(false);
        },
        onBlur: () => {
          setHover(false);
          setPressed(false);
        },
      };

  // Transform / filter strings the caller merges into their style.
  const transform = pressed
    ? `scale(${pressScale})`
    : hover
      ? `scale(${hoverScale})`
      : "scale(1)";

  const filter = hover && !pressed ? `brightness(${hoverBrightness})` : "none";

  return {
    handlers,
    transform,
    filter,
    /** Convenience: combined transition value to drop into style. */
    transition: "transform 0.12s ease-out, filter 0.12s ease-out",
  };
}
