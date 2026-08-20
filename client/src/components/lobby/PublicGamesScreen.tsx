// PublicGamesScreen — the dedicated browser for rooms hosts marked public.
// Reached from the lobby's "find a public game" button, which is gated on a
// name — so by the time we're here, joining only needs one click.

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { PublicRoomSummary } from "../../types/game";
import { PublicRoomList } from "./PublicRoomList";
import { MusicControls } from "../common/MusicControls";
import { GameRulesModal } from "../common/GameRulesModal";
import { RulesButton } from "../common/RulesButton";
import { useModalParam } from "../../hooks/useModalParam";
import { useGameStore } from "../../hooks/useGameStore";
import { useI18n } from "../../i18n";
import { getTheme } from "../../theme/colors";
import { useLayout } from "../../hooks/useLayout";

interface PublicGamesScreenProps {
  rooms: PublicRoomSummary[] | null;
  onJoin: (code: string) => void;
  onSpectate: (code: string) => void;
  onBack: () => void;
  musicControls?: {
    isPlaying: boolean;
    onToggle: () => void;
    onNext: () => void;
  };
}

export function PublicGamesScreen({
  rooms,
  onJoin,
  onSpectate,
  onBack,
  musicControls,
}: PublicGamesScreenProps) {
  const { t } = useI18n();
  const { theme } = useGameStore();
  const { modal, open, close } = useModalParam();
  const themeData = getTheme(theme);
  const isCompact = useLayout() === "compact";

  return (
    <div
      className={`min-h-dynamic-screen ${themeData.feltClass} felt-surface flex items-start justify-center`}
      style={{ padding: isCompact ? "70px 12px 24px" : "92px 24px 32px" }}
    >
      {musicControls && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <MusicControls
            isPlaying={musicControls.isPlaying}
            onToggle={musicControls.onToggle}
            onNext={musicControls.onNext}
          />
        </div>
      )}

      <div className="fixed top-4 left-4 z-50">
        <RulesButton onClick={() => open("rules")} />
      </div>

      <GameRulesModal isOpen={modal === "rules"} onClose={close} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 0.9, 0.32, 1] }}
        style={{ width: "100%", maxWidth: 520 }}
      >
        {/* Header row — back + title. The list is pushed over the socket,
            so there's nothing to refresh. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 6,
          }}
        >
          <button
            onClick={onBack}
            title={t.lobby.back}
            aria-label={t.lobby.back}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: "rgba(245,234,208,0.5)",
              display: "flex",
              alignItems: "center",
              transition: "color var(--d-quick) var(--ease-out-soft)",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#f5ead0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(245,234,208,0.5)";
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h1
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: "var(--font-display)",
              fontSize: isCompact ? 26 : 32,
              fontWeight: 800,
              color: "#f5ead0",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {t.lobby.publicGames}
          </h1>
        </div>

        <p
          style={{
            margin: "0 0 18px 32px",
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "rgba(245,234,208,0.5)",
          }}
        >
          {t.lobby.publicGamesSubtitle}
        </p>

        <PublicRoomList
          rooms={rooms}
          onJoin={onJoin}
          onSpectate={onSpectate}
        />
      </motion.div>
    </div>
  );
}
