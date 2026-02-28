import { FannedCards } from "../cards/FannedCards";
import type { Card } from "../../types/game";

interface BankAreaProps {
  bankCards: Card[];
  handBackCards: Card[];
  showHandBacks?: boolean;
  isYou: boolean;
  showDropZones: boolean;
  isDragOverBank: boolean;
  onDropToBank?: (cardId: string) => void;
  onBankDragOver?: (e: React.DragEvent) => void;
  onBankDragLeave?: (e: React.DragEvent) => void;
  onBankDrop?: (e: React.DragEvent) => void;
  useSocialistTheme?: boolean;
}

export function BankArea({
  bankCards,
  handBackCards,
  showHandBacks = true,
  isYou,
  showDropZones,
  isDragOverBank,
  onDropToBank,
  onBankDragOver,
  onBankDragLeave,
  onBankDrop,
  useSocialistTheme = false,
}: BankAreaProps) {
  if (
    bankCards.length === 0 &&
    handBackCards.length === 0 &&
    !(isYou && onDropToBank)
  ) {
    return null;
  }

  return (
    <div className="mt-3 w-full flex items-center justify-center gap-3 flex-wrap">
      {/* Bank cards with drop zone */}
      <div
        className={`flex items-center relative transition-all ${
          isDragOverBank
            ? "ring-4 ring-blue-400 bg-blue-400/10 rounded-lg p-2"
            : showDropZones
              ? "ring-2 ring-blue-400/50 ring-dashed rounded-lg p-1"
              : ""
        }`}
        onDragOver={onDropToBank ? onBankDragOver : undefined}
        onDragLeave={onDropToBank ? onBankDragLeave : undefined}
        onDrop={onDropToBank ? onBankDrop : undefined}
        data-bank-drop-zone={isYou ? "true" : undefined}
      >
        {bankCards.length > 0 ? (
          <FannedCards
            cards={[...bankCards].sort((a, b) => a.value - b.value)}
            small={true}
            maxVisible={12}
            useSocialistTheme={useSocialistTheme}
          />
        ) : (
          isYou &&
          onDropToBank && (
            <div
              className={`w-20 h-8 border-2 border-dashed rounded-sm flex items-center justify-center transition-colors ${
                showDropZones
                  ? "border-blue-400 bg-blue-400/10"
                  : "border-gray-600"
              }`}
            >
              <span
                className={`text-xs ${showDropZones ? "text-blue-300" : "text-gray-500"}`}
              >
                {showDropZones ? "Bank" : "Empty"}
              </span>
            </div>
          )
        )}
      </div>

      {/* Hand preview cards */}
      {handBackCards.length > 0 && (
        <div className="flex items-center">
          <FannedCards
            cards={handBackCards}
            small={true}
            showBacks={showHandBacks}
            maxVisible={12}
            useSocialistTheme={useSocialistTheme}
          />
        </div>
      )}
    </div>
  );
}
