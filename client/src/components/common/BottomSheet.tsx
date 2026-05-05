// BottomSheet — layout-aware dialog shell.
//
// Despite the name (kept for backwards-compat with all the in-game dialogs
// that already import it), this renders the design's DialogShell:
//   - compact (<1024px): bottom sheet that slides up from below — the
//     mobile thumb-zone pattern.
//   - table   (>=1024px): centered modal — keeps decision focus without
//     scaling up a sheet that would dominate a desktop screen.
//
// Both variants share the same dark-glass + accent-dot + drag-handle chrome.
// Backdrop is clickable (close on outside-tap), and ESC closes too.

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useSoundManager } from "../../hooks/useSoundManager";
import { useLayout } from "../../hooks/useLayout";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Tailwind height class (e.g. "h-80"). Honored on compact (sheet) only. */
  height?: string;
  /** Tailwind max-width class (e.g. "max-w-lg"). Honored on both variants. */
  maxWidth?: string;
  playSound?: boolean;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  footer,
  height = "h-80",
  maxWidth = "max-w-lg",
  playSound = false,
}: BottomSheetProps) {
  const { play } = useSoundManager();
  const layout = useLayout();
  const isModal = layout === "table";

  useEffect(() => {
    if (isOpen && playSound) play("buttonClick");
  }, [isOpen, playSound, play]);

  // ESC closes
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Shared header
  const header = (
    <div
      style={{
        padding: "14px 18px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {title && (
          <>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: "var(--accent, #f0c14a)",
                boxShadow: "0 0 8px var(--accent, #f0c14a)",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "#f5ead0",
              }}
            >
              {title}
            </span>
          </>
        )}
      </div>
      <button
        onClick={onClose}
        style={{
          background: "transparent",
          border: "none",
          color: "rgba(255,255,255,0.55)",
          cursor: "pointer",
          padding: 4,
          borderRadius: 6,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  const baseShellStyle: React.CSSProperties = {
    background: "linear-gradient(180deg, #1c1614 0%, #100a08 100%)",
    color: "#f5ead0",
    fontFamily: "var(--font-ui)",
    boxShadow: "var(--sh-panel)",
    border: "1px solid rgba(255, 220, 180, 0.08)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — visual dimming only; pointer-events disabled so the
              table behind stays inspectable (a player needs to see their
              own bank/sets while deciding how to pay rent etc.). The X
              button + ESC + the explicit footer buttons close the dialog. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] pointer-events-none"
            style={{
              background: isModal
                ? "rgba(0,0,0,0.35)"
                : "rgba(0,0,0,0.20)",
              backdropFilter: isModal ? "blur(2px)" : "none",
            }}
          />

          {isModal ? (
            // ───── Centered modal (desktop / tablet ≥1024px) ─────
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.22, 0.9, 0.32, 1] }}
              className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[110] w-full ${maxWidth}`}
              style={{
                ...baseShellStyle,
                borderRadius: 16,
                maxHeight: "85vh",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {header}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "14px 22px 18px",
                }}
              >
                {children}
              </div>
              {footer && (
                <div
                  style={{
                    padding: "14px 22px",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    flexShrink: 0,
                  }}
                >
                  {footer}
                </div>
              )}
            </motion.div>
          ) : (
            // ───── Bottom sheet (mobile / compact) ─────
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className={`fixed bottom-0 left-0 right-0 mx-auto z-[110] w-full ${maxWidth} ${height}`}
              style={{
                ...baseShellStyle,
                borderTopLeftRadius: 18,
                borderTopRightRadius: 18,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div
                style={{
                  width: 44,
                  height: 4,
                  background: "rgba(255,255,255,0.18)",
                  borderRadius: 2,
                  margin: "10px auto 0",
                  flexShrink: 0,
                }}
              />
              {header}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "14px 18px 18px",
                }}
              >
                {children}
              </div>
              {footer && (
                <div
                  style={{
                    padding: "12px 18px",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    flexShrink: 0,
                  }}
                >
                  {footer}
                </div>
              )}
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
