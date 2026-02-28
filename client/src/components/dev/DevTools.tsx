import { useState } from "react";
import {
  CardType,
  PropertyColor,
  PROPERTY_COLOR_LABEL,
  type ClientPlayer,
} from "../../types/game";
import { BottomSheet } from "../common/BottomSheet";

interface DevToolsProps {
  isOpen: boolean;
  onClose: () => void;
  players: ClientPlayer[];
  currentPlayerId: string;
  onInjectCard: (
    cardType: CardType,
    targetPlayerId: string,
    colors?: PropertyColor[],
  ) => void;
  onGiveCompleteSet: (color: PropertyColor, targetPlayerId: string) => void;
  onSetMoney: (amount: number, targetPlayerId: string) => void;
}

export function DevTools({
  isOpen,
  onClose,
  players,
  currentPlayerId,
  onInjectCard,
  onGiveCompleteSet,
  onSetMoney,
}: DevToolsProps) {
  const [selectedCardType, setSelectedCardType] = useState<CardType>(
    CardType.Money,
  );
  const [selectedColors, setSelectedColors] = useState<PropertyColor[]>([]);
  const [moneyAmount, setMoneyAmount] = useState(10);
  const [targetPlayerId, setTargetPlayerId] = useState<string>(currentPlayerId);

  const actionCards = [
    CardType.PassGo,
    CardType.SlyDeal,
    CardType.ForceDeal,
    CardType.DealBreaker,
    CardType.DebtCollector,
    CardType.Birthday,
    CardType.JustSayNo,
    CardType.DoubleTheRent,
    CardType.House,
    CardType.Hotel,
  ];

  const rentCards = [CardType.RentDual, CardType.RentWild];

  const propertyCards = [CardType.Property, CardType.PropertyWildcard];

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Developer Tools"
      height="h-[85vh]"
    >
      <div className="space-y-6 pb-4">
        {/* Target Player Selector */}
        <div className="pb-4 border-b border-gray-700">
          <h4 className="text-purple-400 text-sm font-semibold mb-2">
            Target Player
          </h4>
          <select
            value={targetPlayerId}
            onChange={(e) => setTargetPlayerId(e.target.value)}
            className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1.5"
          >
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name} {player.id === currentPlayerId ? "(you)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Inject Card Section */}
        <div className="pb-4 border-b border-gray-700">
          <h4 className="text-purple-400 text-sm font-semibold mb-2">
            Inject Card
          </h4>

          <select
            value={selectedCardType}
            onChange={(e) => setSelectedCardType(e.target.value as CardType)}
            className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1.5 mb-2"
          >
            <optgroup label="Money">
              <option value={CardType.Money}>Money Card</option>
            </optgroup>
            <optgroup label="Action Cards">
              {actionCards.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </optgroup>
            <optgroup label="Rent Cards">
              {rentCards.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </optgroup>
            <optgroup label="Property Cards">
              {propertyCards.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </optgroup>
          </select>

          {/* Color selection for property wildcards */}
          {selectedCardType === CardType.PropertyWildcard && (
            <div className="mb-2">
              <label className="text-gray-400 text-xs block mb-1">
                Select Colors (for wildcards)
              </label>
              <div className="flex flex-wrap gap-1">
                {Object.values(PropertyColor)
                  .filter((c) => c !== PropertyColor.Unassigned)
                  .map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        if (selectedColors.includes(color)) {
                          setSelectedColors(
                            selectedColors.filter((c) => c !== color),
                          );
                        } else {
                          setSelectedColors([...selectedColors, color]);
                        }
                      }}
                      className={`px-2 py-1 text-xs rounded ${
                        selectedColors.includes(color)
                          ? "bg-purple-600 text-white"
                          : "bg-gray-700 text-gray-300"
                      }`}
                    >
                      {PROPERTY_COLOR_LABEL[color]}
                    </button>
                  ))}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              onInjectCard(
                selectedCardType,
                targetPlayerId,
                selectedColors.length > 0 ? selectedColors : undefined,
              );
              setSelectedColors([]);
            }}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold py-2 rounded transition-colors"
          >
            Inject Card
          </button>
        </div>

        {/* Give Complete Set Section */}
        <div className="pb-4 border-b border-gray-700">
          <h4 className="text-purple-400 text-sm font-semibold mb-2">
            Give Complete Set
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(PropertyColor)
              .filter((c) => c !== PropertyColor.Unassigned)
              .map((color) => (
                <button
                  key={color}
                  onClick={() => onGiveCompleteSet(color, targetPlayerId)}
                  className="bg-gray-800 hover:bg-gray-700 text-white text-xs py-2 rounded transition-colors"
                >
                  {PROPERTY_COLOR_LABEL[color]}
                </button>
              ))}
          </div>
        </div>

        {/* Set Money Section */}
        <div>
          <h4 className="text-purple-400 text-sm font-semibold mb-2">
            Set Money
          </h4>
          <div className="flex gap-2">
            <input
              type="number"
              value={moneyAmount}
              onChange={(e) => setMoneyAmount(Number(e.target.value))}
              className="flex-1 bg-gray-800 text-white text-xs rounded px-2 py-1.5"
              min="0"
              step="1"
            />
            <button
              onClick={() => onSetMoney(moneyAmount, targetPlayerId)}
              className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-1.5 rounded transition-colors"
            >
              Set
            </button>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
