import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    umami?: {
      track: (
        name?: string | ((props: Record<string, unknown>) => Record<string, unknown>),
        data?: Record<string, unknown>,
      ) => void;
    };
  }
}

// Umami's browser script auto-tracks the initial pageview on script load.
// For SPA route changes we fire an explicit track — react-router's pushState
// isn't always reliably picked up by Umami's history listener, especially
// when the script is still booting during early navigation.
export function usePageviewTracking() {
  const { pathname, search } = useLocation();
  const isInitialRender = useRef(true);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    window.umami?.track();
  }, [pathname, search]);
}
