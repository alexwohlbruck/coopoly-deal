import { useState, useEffect } from "react";

interface CardSizeConfig {
  baseWidth: number;
  baseHeight: number;
  scale: number;
  maxColumnsPerRow: number;
}

/**
 * Unified hook for responsive card sizing across the app.
 * Returns consistent sizing based on screen width.
 */
export function useCardSize(): CardSizeConfig {
  const [config, setConfig] = useState<CardSizeConfig>({
    baseWidth: 96,
    baseHeight: 144,
    scale: 1,
    maxColumnsPerRow: 7,
  });

  useEffect(() => {
    const calculateConfig = (): CardSizeConfig => {
      const width = window.innerWidth;

      if (width < 640) {
        // Mobile: base size, 4 columns max
        return {
          baseWidth: 96,
          baseHeight: 144,
          scale: 1,
          maxColumnsPerRow: 4,
        };
      } else if (width < 1024) {
        // Tablet: slightly larger, 6-7 columns
        return {
          baseWidth: 96,
          baseHeight: 144,
          scale: 1.05,
          maxColumnsPerRow: 7,
        };
      } else if (width < 1536) {
        // Desktop: larger cards, 8-10 columns
        return {
          baseWidth: 96,
          baseHeight: 144,
          scale: 1.15,
          maxColumnsPerRow: 10,
        };
      } else {
        // Large screens: biggest cards, 10-12 columns
        return {
          baseWidth: 96,
          baseHeight: 144,
          scale: 1.25,
          maxColumnsPerRow: 12,
        };
      }
    };

    const updateConfig = () => {
      setConfig(calculateConfig());
    };

    updateConfig();

    // Debounce resize events
    let resizeTimer: number;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(updateConfig, 150);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  return config;
}
