import { useState } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "../../hooks/useGameStore";
import { getTheme } from "../../theme/colors";

interface NameEntryDialogProps {
  roomCode: string;
  onSubmit: (name: string) => void;
  onBack: () => void;
}

export function NameEntryDialog({
  roomCode,
  onSubmit,
  onBack,
}: NameEntryDialogProps) {
  const [name, setName] = useState("");
  const { theme } = useGameStore();
  const themeData = getTheme(theme);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  };

  const canSubmit = !!name.trim();

  return (
    <div
      className={`min-h-screen min-h-dvh ${themeData.feltClass} felt-surface flex items-center justify-center p-4`}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div
          style={{
            background:
              "linear-gradient(180deg, rgba(28,22,20,0.88) 0%, rgba(16,10,8,0.94) 100%)",
            border: "1px solid rgba(245,234,208,0.1)",
            borderRadius: 18,
            padding: 32,
            boxShadow: "var(--sh-panel)",
            backdropFilter: "blur(8px)",
          }}
        >
          <button
            onClick={onBack}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(245,234,208,0.65)",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              marginBottom: 14,
            }}
          >
            ← Back
          </button>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "rgba(245,234,208,0.55)",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Joining Room
          </div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 700,
              color: "#f5ead0",
              letterSpacing: "0.18em",
              fontVariantNumeric: "tabular-nums",
              margin: 0,
              marginBottom: 22,
            }}
          >
            {roomCode}
          </h2>
          <form onSubmit={handleSubmit}>
            <label
              style={{
                display: "block",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                color: "rgba(245,234,208,0.55)",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              autoFocus
              style={{
                width: "100%",
                padding: "13px 14px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#f5ead0",
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                marginBottom: 18,
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                width: "100%",
                padding: "14px 18px",
                borderRadius: 10,
                background: canSubmit
                  ? "linear-gradient(180deg, var(--accent) 0%, color-mix(in oklab, var(--accent) 65%, #000) 100%)"
                  : "rgba(255,255,255,0.06)",
                color: canSubmit ? "#1a1208" : "rgba(255,255,255,0.35)",
                border: "none",
                fontFamily: "var(--font-display)",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.08em",
                cursor: canSubmit ? "pointer" : "not-allowed",
                boxShadow: canSubmit
                  ? "inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 10px -2px rgba(0,0,0,0.5)"
                  : "none",
                textTransform: "uppercase",
              }}
            >
              Join Game
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
