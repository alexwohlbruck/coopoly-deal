import { useState, useEffect } from "react";
import { BottomSheet } from "../common/BottomSheet";
import { type Card, type ClientPlayer, PropertyColor, PROPERTY_COLOR_LABEL, PROPERTY_COLOR_HEX, isSetComplete } from "../../types/game";

interface RainbowGroupDialogProps {
  card: Card;
  player: ClientPlayer;
  onClose: () => void;
  onConfirm: (color: PropertyColor, createNewSet: boolean, wildcardIds: string[]) => void;
}

export function RainbowGroupDialog({ card, player, onClose, onConfirm }: RainbowGroupDialogProps) {
  const unassignedSet = player.properties.find(s => s.color === PropertyColor.Unassigned);
  const availableWildcards = unassignedSet?.cards || [];
  
  const [step, setStep] = useState<"color" | "set" | "count">("color");
  const [selectedColor, setSelectedColor] = useState<PropertyColor | null>(null);
  const [createNewSet, setCreateNewSet] = useState<boolean | null>(null);
  
  // Skip color selection if card only has 1 color
  useEffect(() => {
    if (card.colors && card.colors.length === 1) {
      setSelectedColor(card.colors[0]);
      setStep("set");
    }
  }, [card]);

  // Skip set selection if no existing incomplete set
  useEffect(() => {
    if (selectedColor && step === "set") {
      const existingIncomplete = player.properties.find(s => s.color === selectedColor && !isSetComplete(s));
      if (!existingIncomplete) {
        setCreateNewSet(true);
        setStep("count");
      }
    }
  }, [selectedColor, step, player.properties]);

  const handleConfirmCount = (count: number) => {
    if (!selectedColor || createNewSet === null) return;
    const wildcardIds = availableWildcards.slice(0, count).map(c => c.id);
    onConfirm(selectedColor, createNewSet, wildcardIds);
  };

  return (
    <BottomSheet isOpen={true} onClose={onClose} title="Group with Rainbow Wildcards" height="h-auto">
      <div className="p-4 flex flex-col gap-4">
        {step === "color" && (
          <div>
            <p className="text-gray-300 text-sm mb-4 text-center">Which color do you want to play this as?</p>
            <div className="grid grid-cols-2 gap-2">
              {card.colors?.map(color => (
                <button
                  key={color}
                  onClick={() => {
                    setSelectedColor(color);
                    setStep("set");
                  }}
                  className="py-3 rounded-lg text-white font-semibold text-sm hover:opacity-80"
                  style={{ backgroundColor: PROPERTY_COLOR_HEX[color] }}
                >
                  {PROPERTY_COLOR_LABEL[color]}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "set" && selectedColor && (
          <div>
            <p className="text-gray-300 text-sm mb-4 text-center">You already have an incomplete {PROPERTY_COLOR_LABEL[selectedColor]} set. What would you like to do?</p>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => {
                  setCreateNewSet(false);
                  setStep("count");
                }}
                className="py-3 rounded-lg text-white font-semibold text-sm hover:opacity-80"
                style={{ backgroundColor: PROPERTY_COLOR_HEX[selectedColor] }}
              >
                Add to Existing Set
              </button>
              <button
                onClick={() => {
                  setCreateNewSet(true);
                  setStep("count");
                }}
                className="py-3 rounded-lg text-white font-semibold text-sm hover:opacity-80 bg-gray-600"
              >
                Start a New Set
              </button>
            </div>
          </div>
        )}

        {step === "count" && selectedColor && (
          <div>
            <p className="text-gray-300 text-sm mb-4 text-center">How many Rainbow wildcards do you want to include?</p>
            <div className="flex flex-wrap justify-center gap-2">
              {Array.from({ length: availableWildcards.length + 1 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleConfirmCount(i)}
                  className="w-12 h-12 rounded-lg text-white font-bold text-lg hover:opacity-80 bg-purple-600 flex items-center justify-center"
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
