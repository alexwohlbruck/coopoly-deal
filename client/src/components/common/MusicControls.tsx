// MusicControls — refined to use the shared IconButton primitive so
// the play/pause + skip controls match the Rules / Settings buttons
// across the lobby and waiting room.

import { Play, Pause, SkipForward } from "lucide-react";
import { IconButton } from "./IconButton";
import { useI18n } from "../../i18n";

interface MusicControlsProps {
  isPlaying: boolean;
  onToggle: () => void;
  onNext: () => void;
}

export function MusicControls({
  isPlaying,
  onToggle,
  onNext,
}: MusicControlsProps) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2">
      <IconButton
        onClick={onToggle}
        title={isPlaying ? t.ui.pauseMusic : t.ui.playMusic}
        active={isPlaying}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </IconButton>
      <IconButton onClick={onNext} title={t.ui.nextTrack}>
        <SkipForward className="w-4 h-4" />
      </IconButton>
    </div>
  );
}
