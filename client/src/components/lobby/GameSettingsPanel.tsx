import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Settings } from "lucide-react";
import { type GameSettings } from "../../types/game";

interface GameSettingsPanelProps {
  isHost: boolean;
  settings: GameSettings;
  onSettingsChange: (settings: GameSettings) => void;
}

export function GameSettingsPanel({
  isHost,
  settings,
  onSettingsChange,
}: GameSettingsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateSetting = <K extends keyof GameSettings>(
    key: K,
    value: GameSettings[K],
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-3 flex items-center justify-between text-white hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          <span className="font-semibold">Game Settings</span>
          {!isHost && (
            <span className="text-xs text-gray-400">(Host only)</span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 py-4 space-y-4 border-t border-white/10">
              <div>
                <label className="block text-emerald-200 text-sm font-medium mb-2">
                  Max Hand Size
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="7"
                    max="15"
                    value={
                      settings.maxHandSize === 999 ? 15 : settings.maxHandSize
                    }
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      updateSetting("maxHandSize", val === 15 ? 999 : val);
                    }}
                    disabled={!isHost}
                    className="flex-1 accent-emerald-500 disabled:opacity-50"
                  />
                  <span className="text-white font-semibold w-12 text-center">
                    {settings.maxHandSize === 999 ? "∞" : settings.maxHandSize}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-emerald-200 text-sm font-medium">
                    Turn Timer
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-gray-400">
                      {settings.turnTimer === 0 ? "Off" : "On"}
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.turnTimer > 0}
                      onChange={(e) => {
                        updateSetting("turnTimer", e.target.checked ? 20 : 0);
                      }}
                      disabled={!isHost}
                      className="w-4 h-4 accent-emerald-500 disabled:opacity-50"
                    />
                  </label>
                </div>

                {settings.turnTimer > 0 && (
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="10"
                      max="120"
                      step="10"
                      value={settings.turnTimer}
                      onChange={(e) => {
                        updateSetting("turnTimer", parseInt(e.target.value));
                      }}
                      disabled={!isHost}
                      className="flex-1 accent-emerald-500 disabled:opacity-50"
                    />
                    <span className="text-white font-semibold w-12 text-center">
                      {settings.turnTimer}s
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allowDuplicateSets}
                    onChange={(e) =>
                      updateSetting("allowDuplicateSets", e.target.checked)
                    }
                    disabled={!isHost}
                    className="w-4 h-4 accent-emerald-500 disabled:opacity-50"
                  />
                  <div>
                    <span className="text-white font-medium">
                      Allow Duplicate Color Sets
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Win with multiple complete sets of the same color
                    </p>
                  </div>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.wildcardFlipCountsAsMove}
                    onChange={(e) =>
                      updateSetting(
                        "wildcardFlipCountsAsMove",
                        e.target.checked,
                      )
                    }
                    disabled={!isHost}
                    className="w-4 h-4 accent-emerald-500 disabled:opacity-50"
                  />
                  <div>
                    <span className="text-white font-medium">
                      Wildcard Flip Counts as Move
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Changing a wildcard's color uses one of your 3 moves
                      (disables Rainbow set)
                    </p>
                  </div>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.useSocialistTheme}
                    onChange={(e) =>
                      updateSetting("useSocialistTheme", e.target.checked)
                    }
                    disabled={!isHost}
                    className="w-4 h-4 accent-emerald-500 disabled:opacity-50"
                  />
                  <div>
                    <span className="text-white font-medium">
                      Socialist Theme
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Use alternate card names and quirky dialogs
                    </p>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-emerald-200 text-sm font-medium mb-2">
                  Bot Speed
                </label>
                <div className="flex gap-2">
                  {(["slow", "normal", "fast", "instant"] as const).map(
                    (speed) => (
                      <button
                        key={speed}
                        onClick={() => updateSetting("botSpeed", speed)}
                        disabled={!isHost}
                        className={`flex-1 py-1.5 px-2 rounded text-xs font-medium capitalize transition-colors ${
                          settings.botSpeed === speed
                            ? "bg-emerald-500 text-white"
                            : "bg-white/10 text-gray-300 hover:bg-white/20"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {speed}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {!isHost && (
                <p className="text-xs text-gray-400 text-center pt-2 border-t border-white/10">
                  Only the host can change game settings
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
