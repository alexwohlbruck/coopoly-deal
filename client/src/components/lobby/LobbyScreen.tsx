import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, Github, ScanLine, Globe } from "lucide-react";
import { MusicControls } from "../common/MusicControls";
import { GameRulesModal } from "../common/GameRulesModal";
import { CreditsModal } from "../common/CreditsModal";
import { RulesButton } from "../common/RulesButton";
import { IconButton } from "../common/IconButton";
import { SettingsPanel } from "../game/SettingsPanel";
import { QrScannerModal } from "./QrScannerModal";
import { useSoundSettings } from "../../hooks/useSoundManager";
import { useModalParam } from "../../hooks/useModalParam";

import { useGameStore } from "../../hooks/useGameStore";
import { useI18n } from "../../i18n";
import { getTheme } from "../../theme/colors";
import { PrimaryButton, SecondaryButton } from "../ui/Button";

interface LobbyScreenProps {
  onCreateRoom: (name: string) => void;
  onJoinRoom: (code: string, name: string) => void;
  musicControls?: {
    isPlaying: boolean;
    onToggle: () => void;
    onNext: () => void;
  };
  onlineCount?: number | null;
  publicRoomCount?: number;
  onBrowsePublicGames?: (name: string) => void;
}

export function LobbyScreen({
  onCreateRoom,
  onJoinRoom,
  musicControls,
  onlineCount,
  publicRoomCount = 0,
  onBrowsePublicGames,
}: LobbyScreenProps) {
  const { t } = useI18n();
  const { playerName: savedPlayerName, theme, useSocialistTheme } =
    useGameStore();
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState(savedPlayerName ?? "");
  const { modal, open, close } = useModalParam();
  const { sfxEnabled, toggleSfx } = useSoundSettings();
  const themeData = getTheme(theme);

  const hasName = !!name.trim();
  const canJoin = roomCode.length === 6 && hasName;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (canJoin) {
      onJoinRoom(roomCode.trim(), name.trim());
    }
  };


  return (
    <div
      className={`min-h-dynamic-screen ${themeData.feltClass} felt-surface flex items-center justify-center p-4`}
    >
      {/* Top-right chrome: source-code link + settings gear + music. */}
      <div className="fixed top-4-below-notice right-4 z-50 flex items-center gap-2">
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
      <div className="fixed top-4-below-notice left-4 z-50">
        <RulesButton onClick={() => open("rules")} />
      </div>

      <GameRulesModal isOpen={modal === "rules"} onClose={close} />

      <CreditsModal isOpen={modal === "credits"} onClose={close} />

      <QrScannerModal
        isOpen={modal === "qr-scan"}
        onClose={close}
        onCodeScanned={(code) => {
          setRoomCode(code);
          if (name.trim()) onJoinRoom(code, name.trim());
        }}
      />

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
            {useSocialistTheme ? "Co-Opoly Deal" : t.lobby.title}
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "rgba(245,234,208,0.65)",
              marginTop: 8,
            }}
          >
            {useSocialistTheme ? "The socialist card game" : t.lobby.subtitle}
          </p>
          {onlineCount != null && onlineCount > 0 && (
            <div
              style={{
                marginTop: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.04em",
                color: "rgba(245,234,208,0.5)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#4ade80",
                  boxShadow: "0 0 6px rgba(74,222,128,0.5)",
                  flexShrink: 0,
                }}
              />
              {onlineCount}{" "}
              {onlineCount === 1 ? t.common.player : t.common.players}{" "}
              {t.common.online}
            </div>
          )}
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
          {/* Name input */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.06em",
                color: "rgba(245,234,208,0.55)",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              {t.lobby.yourName}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.lobby.enterName}
              maxLength={20}
              style={{
                width: "100%",
                padding: "13px 14px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#f5ead0",
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>

          {/* Create — primary CTA */}
          <PrimaryButton
            onClick={() => onCreateRoom(name.trim())}
            disabled={!hasName}
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

          {/* Inline join form: code input + scan + Join button */}
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
                // Without this the input can't shrink below its placeholder
                // width, so locales with a longer "Room code · 6 digits" or
                // "Join" push the submit button off screen.
                minWidth: 0,
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
            <button
              type="button"
              onClick={() => open("qr-scan")}
              title={t.lobby.scanQrTitle ?? "Scan QR"}
              style={{
                padding: "0 12px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(245,234,208,0.65)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition:
                  "color var(--d-quick) var(--ease-out-soft), background var(--d-quick) var(--ease-out-soft)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--accent, #f0c14a)";
                e.currentTarget.style.background = "rgba(240,193,74,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(245,234,208,0.65)";
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
            >
              <ScanLine className="w-5 h-5" />
            </button>
            <SecondaryButton
              type="submit"
              disabled={!canJoin}
              size="lg"
              style={{ minWidth: 96 }}
            >
              {t.lobby.join}
            </SecondaryButton>
          </form>

          {/* Don't have a code? Browse open games instead. Gated on a name
              so the browser page can join in one click. */}
          {onBrowsePublicGames && (
            <SecondaryButton
              onClick={() => onBrowsePublicGames(name.trim())}
              disabled={!hasName}
              title={hasName ? undefined : t.lobby.nameRequiredToJoin}
              fullWidth
              size="lg"
              style={{
                marginTop: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
              }}
            >
              <Globe className="w-4 h-4" />
              {t.lobby.findPublicGame}
              {/* Same green "live" dot as the online-player count above. */}
              {publicRoomCount > 0 && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#4ade80",
                      boxShadow: "0 0 6px rgba(74,222,128,0.5)",
                      flexShrink: 0,
                    }}
                  />
                  {publicRoomCount}
                </span>
              )}
            </SecondaryButton>
          )}
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
          {" · "}
          <span style={{ color: "rgba(245,234,208,0.3)" }}>
            v{__APP_VERSION__}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
