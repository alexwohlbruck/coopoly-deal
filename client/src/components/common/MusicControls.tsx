import { Play, Pause, SkipForward } from "lucide-react";

interface MusicControlsProps {
  isPlaying: boolean;
  onToggle: () => void;
  onNext: () => void;
}

export function MusicControls({ isPlaying, onToggle, onNext }: MusicControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggle}
        className="text-gray-400 hover:text-white bg-white/10 px-2 py-1 rounded transition-colors flex items-center gap-1"
        title={isPlaying ? "Pause music" : "Play music"}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      <button
        onClick={onNext}
        className="text-gray-400 hover:text-white bg-white/10 px-2 py-1 rounded transition-colors"
        title="Next track"
      >
        <SkipForward className="w-4 h-4" />
      </button>
    </div>
  );
}
