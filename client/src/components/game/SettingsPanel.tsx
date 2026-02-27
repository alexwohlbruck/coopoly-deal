import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useI18n, type Locale } from "../../i18n";
import { useGameStore } from "../../hooks/useGameStore";
import type { ThemeName } from "../../theme/colors";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentHandLimit: number;
  onUpdateSettings?: (settings: { maxHandSize: number }) => void;
  canEdit: boolean;
  sfxEnabled: boolean;
  onToggleSfx: () => void;
  musicControls?: {
    isPlaying: boolean;
    onToggle: () => void;
    onNext: () => void;
  };
}

export function SettingsPanel({
  isOpen,
  onClose,
  currentHandLimit,
  onUpdateSettings,
  canEdit,
  sfxEnabled,
  onToggleSfx,
  musicControls,
}: SettingsPanelProps) {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useGameStore();
  const [handLimit, setHandLimit] = useState(currentHandLimit);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onClose();
    };

    const handleClick = (e: MouseEvent) => {
      const rect = dialog.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        onClose();
      }
    };

    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("click", handleClick);
    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("click", handleClick);
    };
  }, [onClose]);

  const handleSave = () => {
    onUpdateSettings?.({ maxHandSize: handLimit });
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="bg-gray-900 rounded-2xl p-5 shadow-2xl border border-white/20 max-w-sm w-full backdrop:bg-black/60"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold text-lg">{t.settings.title}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Theme Selection */}
        <div>
          <label className="text-gray-300 text-sm font-medium mb-2 block">
            {t.settings.theme}
          </label>
          <div className="grid grid-cols-5 gap-2">
            {(["classic", "ocean", "sunset", "forest", "midnight", "ruby", "arctic", "desert", "neon", "royal"] as ThemeName[]).map((themeName) => (
              <button
                key={themeName}
                onClick={() => setTheme(themeName)}
                className={`h-10 rounded-lg border-2 transition-all ${
                  theme === themeName
                    ? "border-white scale-105"
                    : "border-transparent hover:border-white/30"
                }`}
                style={{
                  background:
                    themeName === "classic"
                      ? "#059669"
                      : themeName === "ocean"
                        ? "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)"
                        : themeName === "sunset"
                          ? "linear-gradient(135deg, #f97316 0%, #fb923c 100%)"
                          : themeName === "forest"
                            ? "linear-gradient(135deg, #15803d 0%, #16a34a 100%)"
                            : themeName === "midnight"
                              ? "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)"
                              : themeName === "ruby"
                                ? "linear-gradient(135deg, #be123c 0%, #e11d48 100%)"
                                : themeName === "arctic"
                                  ? "linear-gradient(135deg, #0e7490 0%, #06b6d4 100%)"
                                  : themeName === "desert"
                                    ? "linear-gradient(135deg, #a16207 0%, #ca8a04 100%)"
                                    : themeName === "neon"
                                      ? "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)"
                                      : "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
                }}
                title={themeName.charAt(0).toUpperCase() + themeName.slice(1)}
              />
            ))}
          </div>
        </div>

        {/* Language Selection */}
        <div>
          <label className="text-gray-300 text-sm font-medium mb-2 block">
            {t.settings.language}
          </label>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>

        {/* Sound Effects */}
        <div>
          <label className="flex items-center justify-between text-gray-300 text-sm">
            <span className="font-medium">{t.settings.soundEffects}</span>
            <button
              onClick={onToggleSfx}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                sfxEnabled ? "bg-emerald-600" : "bg-gray-600"
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  sfxEnabled ? "translate-x-6" : ""
                }`}
              />
            </button>
          </label>
        </div>

        {/* Music Controls */}
        {musicControls && (
          <div>
            <label className="flex items-center justify-between text-gray-300 text-sm">
              <span className="font-medium">{t.settings.backgroundMusic}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={musicControls.onNext}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
                >
                  Next
                </button>
                <button
                  onClick={musicControls.onToggle}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    musicControls.isPlaying ? "bg-emerald-600" : "bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      musicControls.isPlaying ? "translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>
            </label>
          </div>
        )}

        {/* Hand Limit (if editable) */}
        {canEdit && onUpdateSettings && (
          <div>
            <label className="text-gray-300 text-sm font-medium mb-2 block">
              Hand Limit
            </label>
            <input
              type="number"
              value={handLimit}
              onChange={(e) => setHandLimit(Number(e.target.value))}
              min={5}
              max={10}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>

      {/* Save button (if editable) */}
      {canEdit && onUpdateSettings && (
        <div className="mt-5 pt-4 border-t border-white/10">
          <button
            onClick={handleSave}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            {t.settings.save}
          </button>
        </div>
      )}
    </dialog>
  );
}
