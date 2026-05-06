// Shared button helpers — gold-gradient primary + dark-glass secondary.
// Mirrors the design's PrimaryButton / SecondaryButton from chrome.jsx.
//
// All three variants fire a haptic tap on click so the entire UI has
// consistent tactile feedback. Disabled buttons skip both the click
// and the haptic. The haptic comes BEFORE onClick so even if the
// click triggers a navigation/teardown, the user still feels the tap.

import type { CSSProperties, ReactNode } from "react";
import { useHaptics, type HapticEvent } from "../../hooks/useHaptics";
import { useButtonStates } from "../../hooks/useButtonStates";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  /** Tone variant: 'primary' | 'secondary' | 'danger'. */
  tone?: "primary" | "secondary" | "danger";
  /** Custom accent color override (defaults to var(--accent)). */
  accent?: string;
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
  style?: CSSProperties;
  className?: string;
  title?: string;
}

/** Wrap an onClick with a haptic-fire-then-call. Returns undefined
 *  if the original handler is undefined (so the rendered button has
 *  no onClick attribute and stays inert). */
function withHaptic(
  haptic: (e: HapticEvent) => void,
  event: HapticEvent,
  handler?: () => void,
) {
  if (!handler) return undefined;
  return () => {
    haptic(event);
    handler();
  };
}

const SIZES = {
  sm: { padding: "6px 12px", fontSize: 11 },
  md: { padding: "9px 16px", fontSize: 12.5 },
  lg: { padding: "11px 22px", fontSize: 14 },
};

export function PrimaryButton({
  children,
  onClick,
  disabled,
  size = "md",
  accent = "var(--accent, #f0c14a)",
  fullWidth,
  type = "button",
  style,
  className,
  title,
}: ButtonProps) {
  const s = SIZES[size];
  const { haptic } = useHaptics();
  const { handlers, transform, filter, transition } = useButtonStates({
    disabled,
  });
  return (
    <button
      type={type}
      onClick={disabled ? undefined : withHaptic(haptic, "primary", onClick)}
      disabled={disabled}
      title={title}
      className={className}
      {...handlers}
      style={{
        padding: s.padding,
        fontFamily: "var(--font-display)",
        fontSize: s.fontSize,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        borderRadius: 8,
        background: disabled
          ? "rgba(255,255,255,0.06)"
          : `linear-gradient(180deg, ${accent} 0%, color-mix(in oklab, ${accent} 70%, #000) 100%)`,
        color: disabled ? "rgba(255,255,255,0.3)" : "#1a1208",
        border: "none",
        boxShadow: disabled
          ? "none"
          : "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.18), 0 1px 0 rgba(0,0,0,0.5), 0 4px 10px -2px rgba(0,0,0,0.5)",
        cursor: disabled ? "not-allowed" : "pointer",
        width: fullWidth ? "100%" : undefined,
        transform,
        filter,
        transition,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  size = "md",
  fullWidth,
  type = "button",
  style,
  className,
  title,
}: Omit<ButtonProps, "tone" | "accent">) {
  const s = SIZES[size];
  const { haptic } = useHaptics();
  const { handlers, transform, filter, transition } = useButtonStates({
    disabled,
  });
  return (
    <button
      type={type}
      onClick={disabled ? undefined : withHaptic(haptic, "tap", onClick)}
      disabled={disabled}
      title={title}
      className={className}
      {...handlers}
      style={{
        padding: s.padding,
        fontFamily: "var(--font-display)",
        fontSize: s.fontSize,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        borderRadius: 8,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
        color: disabled ? "rgba(255,255,255,0.3)" : "rgba(245,234,208,0.9)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
        cursor: disabled ? "not-allowed" : "pointer",
        width: fullWidth ? "100%" : undefined,
        transform,
        filter,
        transition,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function DangerButton({
  children,
  onClick,
  disabled,
  size = "md",
  fullWidth,
  type = "button",
  style,
  className,
  title,
}: Omit<ButtonProps, "tone" | "accent">) {
  const s = SIZES[size];
  const { haptic } = useHaptics();
  const { handlers, transform, filter, transition } = useButtonStates({
    disabled,
  });
  return (
    <button
      type={type}
      onClick={disabled ? undefined : withHaptic(haptic, "warn", onClick)}
      disabled={disabled}
      title={title}
      className={className}
      {...handlers}
      style={{
        padding: s.padding,
        fontFamily: "var(--font-display)",
        fontSize: s.fontSize,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        borderRadius: 8,
        background: disabled
          ? "rgba(255,255,255,0.06)"
          : "linear-gradient(180deg, #4a1a1a 0%, #2a0e0e 100%)",
        color: disabled ? "rgba(255,255,255,0.3)" : "#f0c8c8",
        border: "none",
        boxShadow: disabled
          ? "none"
          : "inset 0 1px 0 rgba(255,200,200,0.18), 0 1px 0 rgba(0,0,0,0.5), 0 4px 8px -2px rgba(0,0,0,0.5)",
        cursor: disabled ? "not-allowed" : "pointer",
        width: fullWidth ? "100%" : undefined,
        transform,
        filter,
        transition,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
