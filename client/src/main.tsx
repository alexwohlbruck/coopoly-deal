import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { polyfill } from "mobile-drag-drop";
import { scrollBehaviourDragImageTranslateOverride } from "mobile-drag-drop/scroll-behaviour";
import "mobile-drag-drop/default.css";
import "./index.css";
import App from "./App.tsx";

// Initialize mobile drag and drop polyfill
polyfill({
  dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride,
});

// Prevent default touch behavior on draggable elements to allow polyfill to work
window.addEventListener(
  "touchmove",
  function (e) {
    // If the target is draggable, prevent default to allow drag
    if (e.target instanceof Element && e.target.closest('[draggable="true"]')) {
      e.preventDefault();
    }
  },
  { passive: false },
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
