import { useState, useEffect } from "react";

/**
 * Layout mode picked by viewport width.
 *
 * - `compact` (<1024px): mobile/tablet. Carousel, bottom-sheet dialogs,
 *   single-column flow.
 * - `table` (≥1024px): desktop. Around-the-table layout with the gold
 *   platter, opponent rail, deck/discard center.
 *
 * Components should NOT sniff `window.innerWidth` directly — go through
 * this hook so the breakpoint is defined in one place.
 */
export type LayoutMode = "compact" | "table";

const TABLE_MIN_WIDTH = 1024;

function pickMode(): LayoutMode {
  if (typeof window === "undefined") return "table"; // SSR safe default
  return window.innerWidth >= TABLE_MIN_WIDTH ? "table" : "compact";
}

export function useLayout(): LayoutMode {
  const [mode, setMode] = useState<LayoutMode>(pickMode);

  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setMode(pickMode()));
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return mode;
}
