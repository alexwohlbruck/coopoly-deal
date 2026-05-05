// IconButton — refined glass-button used for the top-bar / lobby
// icon controls (rules, settings gear, music play/pause/next). One
// place to keep size/padding/colors aligned across the app.
//
// Fires a light haptic tap on every click so the whole UI has a
// consistent feel — settings panel handles the toggle preview
// itself; here we just want the universal "I tapped a thing" feedback.

import type { CSSProperties, ReactNode } from "react";
import { useHaptics } from "../../hooks/useHaptics";

interface IconButtonProps {
  onClick?: () => void;
  title?: string;
  ariaLabel?: string;
  /** Optional label rendered to the right of the icon, in mono caps. */
  label?: string;
  /** Mark as "active" (e.g. music currently playing) — uses accent fill. */
  active?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  /** Extra style merge — useful for one-off positioning tweaks. */
  style?: CSSProperties;
}

export function IconButton({
  onClick,
  title,
  ariaLabel,
  label,
  active = false,
  disabled = false,
  children,
  style,
}: IconButtonProps) {
  const { haptic } = useHaptics();
  return (
    <button
      type="button"
      onClick={
        onClick
          ? () => {
              // Chrome icon buttons sit at the bottom of the haptic
              // tier — barely-there tick rather than the full tap.
              haptic("micro");
              onClick();
            }
          : undefined
      }
      title={title}
      aria-label={ariaLabel ?? title}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: label ? 6 : 0,
        height: 34,
        padding: label ? "0 12px 0 10px" : "0 9px",
        borderRadius: 10,
        background: active
          ? "color-mix(in oklab, var(--accent, #f0c14a) 14%, rgba(0,0,0,0.3))"
          : "rgba(255,255,255,0.06)",
        border: "1px solid",
        borderColor: active
          ? "color-mix(in oklab, var(--accent, #f0c14a) 35%, rgba(255,255,255,0.08))"
          : "rgba(255,255,255,0.08)",
        color: active
          ? "var(--accent, #f0c14a)"
          : "rgba(245,234,208,0.78)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 0 rgba(0,0,0,0.4)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontWeight: 600,
        transition:
          "background var(--d-quick) var(--ease-out-soft), color var(--d-quick) var(--ease-out-soft), border-color var(--d-quick) var(--ease-out-soft)",
        ...style,
      }}
    >
      <span style={{ display: "inline-flex" }}>{children}</span>
      {label && <span>{label}</span>}
    </button>
  );
}
