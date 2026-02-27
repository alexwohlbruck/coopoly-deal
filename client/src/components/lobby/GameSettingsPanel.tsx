import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Settings } from "lucide-react";

export interface GameSettings {
  maxHandSize: number;
  turnTimer: number;
  allowDuplicateSets: boolean;
  houseHotelRules: boolean;
  wildcardFlipCountsAsMove: boolean;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  maxHandSize: 7,
  turnTimer: 0,
  allowDuplicateSets: true,
  houseHotelRules: true,
  wildcardFlipCountsAsMove: false,
};

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
          {!isHost && <span className="text-xs text-gray-400">(Host only)</span>}
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
                    min="5"
                    max="10"
                    value={settings.maxHandSize === 999 ? 10 : settings.maxHandSize}
                    onChange={(e) => updateSetting("maxHandSize", parseInt(e.target.value))}
                    disabled={!isHost}
                    className="flex-1 accent-emerald-500 disabled:opacity-50"
                  />
                  <span className="text-white font-semibold w-12 text-center">
                    {settings.maxHandSize === 999 ? "∞" : settings.maxHandSize}
                  </span>
                </div>
                <div className="mt-2">
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.maxHandSize === 999}
                      onChange={(e) =>
                        updateSetting("maxHandSize", e.target.checked ? 999 : 7)
                      }
                      disabled={!isHost}
                      className="w-4 h-4 accent-emerald-500 disabled:opacity-50"
                    />
                    <span>Unlimited hand size</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-emerald-200 text-sm font-medium mb-2">
                  Turn Timer
                </label>
                <select
                  value={settings.turnTimer}
                  onChange={(e) => updateSetting("turnTimer", parseInt(e.target.value))}
                  disabled={!isHost}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="0">Off</option>
                  <option value="30">30 seconds</option>
                  <option value="60">60 seconds</option>
                  <option value="90">90 seconds</option>
                  <option value="120">2 minutes</option>
                </select>
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
                    <span className="text-white font-medium">Allow Duplicate Color Sets</span>
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
                    checked={settings.houseHotelRules}
                    onChange={(e) =>
                      updateSetting("houseHotelRules", e.target.checked)
                    }
                    disabled={!isHost}
                    className="w-4 h-4 accent-emerald-500 disabled:opacity-50"
                  />
                  <div>
                    <span className="text-white font-medium">House & Hotel Rules</span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Allow houses and hotels on complete sets
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
                      updateSetting("wildcardFlipCountsAsMove", e.target.checked)
                    }
                    disabled={!isHost}
                    className="w-4 h-4 accent-emerald-500 disabled:opacity-50"
                  />
                  <div>
                    <span className="text-white font-medium">Wildcard Flip Counts as Move</span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Changing a wildcard's color uses one of your 3 moves
                    </p>
                  </div>
                </label>
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
