import { useState, useEffect } from "react";
import { BottomSheet } from "../common/BottomSheet";
import {
  type Card,
  type ClientPlayer,
  PropertyColor,
  getPropertyColorLabel,
  PROPERTY_COLOR_HEX,
  isSetComplete,
} from "../../types/game";
import { type GameSettings } from "../../types/game";
import { useGameStore } from "../../hooks/useGameStore";
import { useI18n } from "../../i18n";

interface RainbowGroupDialogProps {
  card: Card;
  player: ClientPlayer;
  settings: GameSettings;
  onClose: () => void;
  onConfirm: (
    color: PropertyColor,
    createNewSet: boolean,
    wildcardIds: string[],
  ) => void;
}

export function RainbowGroupDialog({
  card,
  player,
  settings: _settings,
  onClose,
  onConfirm,
}: RainbowGroupDialogProps) {
  const useSocialistTheme = useGameStore((s) => s.useSocialistTheme);
  const { t } = useI18n();
  const unassignedSet = player.properties.find(
    (s) => s.color === PropertyColor.Unassigned,
  );
  const availableWildcards = unassignedSet?.cards || [];

  const initialColor =
    card.colors && card.colors.length === 1 ? card.colors[0] : null;
  const initialStep = initialColor ? "set" : "color";

  const [step, setStep] = useState<"color" | "set" | "count">(initialStep);
  const [selectedColor, setSelectedColor] = useState<PropertyColor | null>(
    initialColor,
  );
  const [createNewSet, setCreateNewSet] = useState<boolean | null>(null);

  // Skip set selection if no existing incomplete set
  useEffect(() => {
    if (selectedColor && step === "set") {
      const existingIncomplete = player.properties.find(
        (s) => s.color === selectedColor && !isSetComplete(s),
      );
      if (!existingIncomplete) {
        // Use timeout to avoid synchronous state updates during render phase
        setTimeout(() => {
          setCreateNewSet(true);
          setStep("count");
        }, 0);
      }
    }
  }, [selectedColor, step, player.properties]);

  const handleConfirmCount = (count: number) => {
    if (!selectedColor || createNewSet === null) return;
    const wildcardIds = availableWildcards.slice(0, count).map((c) => c.id);
    onConfirm(selectedColor, createNewSet, wildcardIds);
  };

  return (
    <BottomSheet
      isOpen={true}
      onClose={onClose}
      title={t.game.groupWithRainbow}
      height="h-auto"
      playSound={true}
    >
      <div className="p-4 flex flex-col gap-4">
        {step === "color" && (
          <div>
            <p className="text-gray-300 text-sm mb-4 text-center">
              {t.game.playAsColor}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {card.colors?.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    setSelectedColor(color);
                    setStep("set");
                  }}
                  className="py-3 rounded-lg text-white font-semibold text-sm hover:opacity-80"
                  style={{ backgroundColor: PROPERTY_COLOR_HEX[color] }}
                >
                  {getPropertyColorLabel(t, color, useSocialistTheme)}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "set" && selectedColor && (
          <div>
            <p className="text-gray-300 text-sm mb-4 text-center">
              {t.game.incompleteSetPrompt.replace("{color}", getPropertyColorLabel(t, selectedColor, useSocialistTheme))}
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => {
                  setCreateNewSet(false);
                  setStep("count");
                }}
                className="py-3 rounded-lg text-white font-semibold text-sm hover:opacity-80"
                style={{ backgroundColor: PROPERTY_COLOR_HEX[selectedColor] }}
              >
                {t.game.addToExistingSet}
              </button>
              <button
                onClick={() => {
                  setCreateNewSet(true);
                  setStep("count");
                }}
                className="py-3 rounded-lg text-white font-semibold text-sm hover:opacity-80 bg-gray-600"
              >
                {t.game.startNewSet}
              </button>
            </div>
          </div>
        )}

        {step === "count" && selectedColor && (
          <div>
            <p className="text-gray-300 text-sm mb-4 text-center">
              {t.game.howManyRainbow}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {Array.from({ length: availableWildcards.length + 1 }).map(
                (_, i) => (
                  <button
                    key={i}
                    onClick={() => handleConfirmCount(i)}
                    className="w-12 h-12 rounded-lg text-white font-bold text-lg hover:opacity-80 bg-purple-600 flex items-center justify-center"
                  >
                    {i}
                  </button>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
