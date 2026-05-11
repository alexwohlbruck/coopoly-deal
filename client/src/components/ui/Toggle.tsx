// Toggle — shared pill-switch that matches the design system.
// Gold-gradient active state, dark-glass inactive, smooth slide animation.
// Used in both the game-settings panel and the user-preferences sheet.

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: 36,
        height: 22,
        borderRadius: 999,
        background: checked
          ? "linear-gradient(180deg, var(--accent, #f0c14a) 0%, color-mix(in oklab, var(--accent, #f0c14a) 70%, #000) 100%)"
          : "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.08)",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "background var(--d-quick) var(--ease-out-soft)",
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 16 : 2,
          width: 16,
          height: 16,
          borderRadius: 999,
          background: checked ? "#1a1208" : "rgba(245,234,208,0.85)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(0,0,0,0.4)",
          transition: "left var(--d-quick) var(--ease-out-soft)",
        }}
      />
    </button>
  );
}
