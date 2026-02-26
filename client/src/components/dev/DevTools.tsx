import { useState } from "react";
import { CardType, PropertyColor, PROPERTY_COLOR_LABEL, type ClientPlayer } from "../../types/game";
import { ChevronDown, ChevronUp } from "lucide-react";

interface DevToolsProps {
  players: ClientPlayer[];
  currentPlayerId: string;
  onInjectCard: (cardType: CardType, targetPlayerId: string, colors?: PropertyColor[]) => void;
  onGiveCompleteSet: (color: PropertyColor, targetPlayerId: string) => void;
  onSetMoney: (amount: number, targetPlayerId: string) => void;
}

export function DevTools({ players, currentPlayerId, onInjectCard, onGiveCompleteSet, onSetMoney }: DevToolsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCardType, setSelectedCardType] = useState<CardType>(CardType.Money);
  const [selectedColors, setSelectedColors] = useState<PropertyColor[]>([]);
  const [moneyAmount, setMoneyAmount] = useState(10);
  const [targetPlayerId, setTargetPlayerId] = useState<string>(currentPlayerId);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg shadow-lg font-semibold text-sm flex items-center gap-2 z-50"
      >
        🛠️ Dev Tools
        <ChevronUp className="w-4 h-4" />
      </button>
    );
  }

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
    <div className="fixed bottom-4 right-4 bg-gray-900 border-2 border-purple-500 rounded-xl shadow-2xl p-4 w-80 max-h-[80vh] overflow-y-auto z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold flex items-center gap-2">
          🛠️ Developer Tools
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {/* Target Player Selector */}
      <div className="mb-4 pb-4 border-b border-gray-700">
        <h4 className="text-purple-400 text-sm font-semibold mb-2">Target Player</h4>
        <select
          value={targetPlayerId}
          onChange={(e) => setTargetPlayerId(e.target.value)}
          className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1.5"
        >
          {players.map(player => (
            <option key={player.id} value={player.id}>
              {player.name} {player.id === currentPlayerId ? "(you)" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Inject Card Section */}
      <div className="mb-4 pb-4 border-b border-gray-700">
        <h4 className="text-purple-400 text-sm font-semibold mb-2">Inject Card</h4>
        
        <select
          value={selectedCardType}
          onChange={(e) => setSelectedCardType(e.target.value as CardType)}
          className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1.5 mb-2"
        >
          <optgroup label="Money">
            <option value={CardType.Money}>Money Card</option>
          </optgroup>
          <optgroup label="Properties">
            {propertyCards.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </optgroup>
          <optgroup label="Rent">
            {rentCards.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </optgroup>
          <optgroup label="Actions">
            {actionCards.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </optgroup>
        </select>

        {(selectedCardType === CardType.Property || 
          selectedCardType === CardType.PropertyWildcard || 
          selectedCardType === CardType.RentDual) && (
          <div className="mb-2">
            <p className="text-gray-400 text-xs mb-1">Select Colors:</p>
            <div className="grid grid-cols-2 gap-1">
              {Object.values(PropertyColor).map(color => (
                <label key={color} className="flex items-center gap-1 text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={selectedColors.includes(color)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedColors([...selectedColors, color]);
                      } else {
                        setSelectedColors(selectedColors.filter(c => c !== color));
                      }
                    }}
                    className="w-3 h-3"
                  />
                  {PROPERTY_COLOR_LABEL[color]}
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => {
            onInjectCard(selectedCardType, targetPlayerId, selectedColors.length > 0 ? selectedColors : undefined);
            setSelectedColors([]);
          }}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold py-2 rounded"
        >
          Inject Card to {players.find(p => p.id === targetPlayerId)?.name}
        </button>
      </div>

      {/* Give Complete Set Section */}
      <div className="mb-4 pb-4 border-b border-gray-700">
        <h4 className="text-purple-400 text-sm font-semibold mb-2">Give Complete Set</h4>
        <div className="grid grid-cols-2 gap-1">
          {Object.values(PropertyColor).map(color => (
            <button
              key={color}
              onClick={() => onGiveCompleteSet(color, targetPlayerId)}
              className="text-white text-xs py-1.5 rounded hover:opacity-80 font-semibold"
              style={{ backgroundColor: `var(--color-${color}, #666)` }}
            >
              {PROPERTY_COLOR_LABEL[color]}
            </button>
          ))}
        </div>
      </div>

      {/* Set Money Section */}
      <div>
        <h4 className="text-purple-400 text-sm font-semibold mb-2">Set Money</h4>
        <div className="flex gap-2">
          <input
            type="number"
            value={moneyAmount}
            onChange={(e) => setMoneyAmount(parseInt(e.target.value) || 0)}
            className="flex-1 bg-gray-800 text-white text-xs rounded px-2 py-1.5"
            min="0"
            max="100"
          />
          <button
            onClick={() => onSetMoney(moneyAmount, targetPlayerId)}
            className="bg-green-600 hover:bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded"
          >
            Set $
          </button>
        </div>
        <div className="flex gap-1 mt-2">
          {[5, 10, 20, 50].map(amount => (
            <button
              key={amount}
              onClick={() => onSetMoney(amount, targetPlayerId)}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-1 rounded"
            >
              ${amount}M
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-gray-500 text-[10px] text-center">
          For development & testing only
        </p>
      </div>
    </div>
  );
}
