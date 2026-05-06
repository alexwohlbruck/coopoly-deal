import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, Github } from "lucide-react";
import { MusicControls } from "../common/MusicControls";
import { GameRulesModal } from "../common/GameRulesModal";
import { CreditsModal } from "../common/CreditsModal";
import { RulesButton } from "../common/RulesButton";
import { IconButton } from "../common/IconButton";
import { SettingsPanel } from "../game/SettingsPanel";
import { useSoundSettings } from "../../hooks/useSoundManager";
import { useModalParam } from "../../hooks/useModalParam";

import { useGameStore } from "../../hooks/useGameStore";
import { useI18n } from "../../i18n";
import { getTheme } from "../../theme/colors";
import { PrimaryButton, SecondaryButton } from "../ui/Button";

interface LobbyScreenProps {
  onCreateRoom: () => void;
  onJoinRoom: (code: string, name: string) => void;
  musicControls?: {
    isPlaying: boolean;
    onToggle: () => void;
    onNext: () => void;
  };
}

export function LobbyScreen({
  onCreateRoom,
  onJoinRoom,
  musicControls,
}: LobbyScreenProps) {
  const { t } = useI18n();
  const { playerName: savedPlayerName, theme } = useGameStore();
  const [roomCode, setRoomCode] = useState("");
  const { modal, open, close } = useModalParam();
  const { sfxEnabled, toggleSfx } = useSoundSettings();
  const themeData = getTheme(theme);

  const canJoin = roomCode.length === 6;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    // Server-side will prompt for name if not set; otherwise reuse stored.
    if (canJoin) {
      onJoinRoom(roomCode.trim(), savedPlayerName || "");
    }
  };

  return (
    <div
      className={`min-h-dynamic-screen ${themeData.feltClass} felt-surface flex items-center justify-center p-4`}
    >
      {/* Top-right chrome: source-code link + settings gear + music. */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <IconButton
          href="https://github.com/alexwohlbruck/coopoly-deal"
          title={t.common.sourceCode}
        >
          <Github className="w-4 h-4" />
        </IconButton>
        <IconButton onClick={() => open("settings")} title={t.settings.title}>
          <Settings className="w-4 h-4" />
        </IconButton>
        {musicControls && (
          <MusicControls
            isPlaying={musicControls.isPlaying}
            onToggle={musicControls.onToggle}
            onNext={musicControls.onNext}
          />
        )}
      </div>

      {/* Top-left rules pill — shared component matches waiting room. */}
      <div className="fixed top-4 left-4 z-50">
        <RulesButton onClick={() => open("rules")} />
      </div>

      <GameRulesModal isOpen={modal === "rules"} onClose={close} />

      <CreditsModal isOpen={modal === "credits"} onClose={close} />

      <SettingsPanel
        isOpen={modal === "settings"}
        onClose={close}
        currentHandLimit={7}
        canEdit={false}
        sfxEnabled={sfxEnabled}
        onToggleSfx={toggleSfx}
        musicControls={musicControls}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 0.9, 0.32, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.1em",
              color: "rgba(245,234,208,0.55)",
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            {savedPlayerName
              ? t.lobby.welcomeBackName.replace("{name}", savedPlayerName)
              : t.lobby.welcomeBack}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 44,
              fontWeight: 800,
              color: "#f5ead0",
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            {t.lobby.title}
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "rgba(245,234,208,0.65)",
              marginTop: 8,
            }}
          >
            {t.lobby.subtitle}
          </p>
        </div>

        <div
          style={{
            background:
              "linear-gradient(180deg, rgba(28,22,20,0.85) 0%, rgba(16,10,8,0.92) 100%)",
            border: "1px solid rgba(245,234,208,0.1)",
            borderRadius: 18,
            padding: 24,
            boxShadow: "var(--sh-panel)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* Create — primary CTA */}
          <PrimaryButton
            onClick={onCreateRoom}
            fullWidth
            size="lg"
          >
            {t.lobby.createRoom}
          </PrimaryButton>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.08em",
              color: "rgba(245,234,208,0.4)",
              textTransform: "uppercase",
              padding: "2px 0",
            }}
          >
            <div
              style={{
                flex: 1,
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, rgba(245,234,208,0.18), transparent)",
              }}
            />
            <span>{t.lobby.orJoin}</span>
            <div
              style={{
                flex: 1,
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, rgba(245,234,208,0.18), transparent)",
              }}
            />
          </div>

          {/* Inline join form: code input + Join button side-by-side */}
          <form onSubmit={handleJoin} style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, ""))}
              placeholder={t.lobby.roomCodePlaceholder}
              maxLength={6}
              inputMode="numeric"
              style={{
                flex: 1,
                padding: "13px 14px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#f5ead0",
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                letterSpacing: "0.08em",
                outline: "none",
                textAlign: "center",
              }}
            />
            <SecondaryButton
              type="submit"
              disabled={!canJoin}
              size="lg"
              style={{ minWidth: 96 }}
            >
              {t.lobby.join}
            </SecondaryButton>
          </form>
        </div>

        {/* Tip jar — small, deferential. Sits beneath the create/join
            card so it doesn't compete for attention with the CTAs. */}
        <a
          href="https://buymeacoffee.com/alexwohlbruck"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginTop: 16,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            width: "100%",
            padding: "8px 12px",
            borderRadius: 10,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "rgba(245,234,208,0.55)",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(245,234,208,0.06)",
            textDecoration: "none",
            transition:
              "color var(--d-quick) var(--ease-out-soft), background var(--d-quick) var(--ease-out-soft), border-color var(--d-quick) var(--ease-out-soft)",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.color = "var(--accent, #f0c14a)";
            el.style.background = "rgba(240,193,74,0.08)";
            el.style.borderColor = "rgba(240,193,74,0.2)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.color = "rgba(245,234,208,0.55)";
            el.style.background = "rgba(255,255,255,0.03)";
            el.style.borderColor = "rgba(245,234,208,0.06)";
          }}
        >
          <span aria-hidden="true">☕</span>
          <span>{t.lobby.buyMeACoffee}</span>
        </a>

        {/* Author credit. Tiny, centered under everything. */}
        <div
          style={{
            marginTop: 14,
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.06em",
            color: "rgba(245,234,208,0.4)",
          }}
        >
          {t.lobby.madeWithLoveBy.split("♥")[0]}
          <span aria-hidden="true" style={{ color: "#e26a6a" }}>
            ♥
          </span>
          {t.lobby.madeWithLoveBy.split("♥")[1]}{" "}
          <a
            href="https://alex.wohlbruck.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "rgba(245,234,208,0.7)",
              textDecoration: "none",
              borderBottom: "1px dotted rgba(245,234,208,0.3)",
              transition: "color var(--d-quick) var(--ease-out-soft)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--accent, #f0c14a)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(245,234,208,0.7)";
            }}
          >
            Alex Wohlbruck
          </a>
          {" · "}
          <button
            onClick={() => open("credits")}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: "rgba(245,234,208,0.7)",
              fontFamily: "inherit",
              fontSize: "inherit",
              letterSpacing: "inherit",
              borderBottom: "1px dotted rgba(245,234,208,0.3)",
              transition: "color var(--d-quick) var(--ease-out-soft)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--accent, #f0c14a)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(245,234,208,0.7)";
            }}
          >
            {t.lobby.credits}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
