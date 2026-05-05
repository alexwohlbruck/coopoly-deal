// MusicControls — refined to use the shared IconButton primitive so
// the play/pause + skip controls match the Rules / Settings buttons
// across the lobby and waiting room.

import { Play, Pause, SkipForward } from "lucide-react";
import { IconButton } from "./IconButton";

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
  return (
    <div className="flex items-center gap-2">
      <IconButton
        onClick={onToggle}
        title={isPlaying ? "Pause music" : "Play music"}
        active={isPlaying}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </IconButton>
      <IconButton onClick={onNext} title="Next track">
        <SkipForward className="w-4 h-4" />
      </IconButton>
    </div>
  );
}
