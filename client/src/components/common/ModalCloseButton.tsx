import { X } from "lucide-react";

interface ModalCloseButtonProps {
  onClick: () => void;
  ariaLabel?: string;
}

export function ModalCloseButton({
  onClick,
  ariaLabel,
}: ModalCloseButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        flexShrink: 0,
        width: 32,
        height: 32,
        borderRadius: 999,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "rgba(245,234,208,0.7)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <X className="w-4 h-4" />
    </button>
  );
}
