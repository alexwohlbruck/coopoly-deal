import { motion } from "framer-motion";
import {
  type Card,
  CardType,
  CARD_TYPE_LABEL,
  PROPERTY_COLOR_HEX,
  PROPERTY_COLOR_LABEL,
  RENT_VALUES,
  SET_SIZE,
} from "../../types/game";

interface GameCardProps {
  card: Card;
  onClick?: () => void;
  selected?: boolean;
  small?: boolean;
  disabled?: boolean;
}

const ACTION_COLORS: Partial<Record<CardType, string>> = {
  [CardType.PassGo]: "#2563EB",
  [CardType.SlyDeal]: "#5F8A8B",
  [CardType.ForceDeal]: "#5F8A8B",
  [CardType.DealBreaker]: "#6B21A8",
  [CardType.DebtCollector]: "#16A34A",
  [CardType.Birthday]: "#16A34A",
  [CardType.JustSayNo]: "#DC2626",
  [CardType.DoubleTheRent]: "#D97706",
  [CardType.House]: "#16A34A",
  [CardType.Hotel]: "#DC2626",
};

function getActionSubtitle(type: CardType): string | null {
  switch (type) {
    case CardType.DebtCollector: return "Pay 5M";
    case CardType.Birthday: return "Everyone pays 2M";
    case CardType.PassGo: return "Draw 2 cards";
    case CardType.DoubleTheRent: return "2× Rent";
    case CardType.SlyDeal: return "Steal 1 property";
    case CardType.ForceDeal: return "Swap properties";
    case CardType.DealBreaker: return "Steal full set";
    case CardType.JustSayNo: return "Block action";
    case CardType.House: return "+3M rent";
    case CardType.Hotel: return "+4M rent";
    default: return null;
  }
}

function ValueBadge({ value, color, small }: { value: number; color: string; small?: boolean }) {
  if (value <= 0) return null;
  return (
    <div className="absolute top-0.5 left-0.5 z-10">
      <div
        className={`${small ? "w-5 h-5 text-[7px]" : "w-7 h-7 text-[9px]"} rounded-full flex items-center justify-center text-white font-black shadow-md border border-white/30`}
        style={{ backgroundColor: color }}
      >
        ${value}M
      </div>
    </div>
  );
}

function PropertyCardContent({ card, small }: { card: Card; small?: boolean }) {
  const color = card.colors?.[0];
  const bgColor = color ? PROPERTY_COLOR_HEX[color] : "#888";
  const rents = color ? RENT_VALUES[color] : [];
  const setSize = color ? SET_SIZE[color] : 0;

  return (
    <>
      <ValueBadge value={card.value} color={bgColor} small={small} />

      {/* Color banner with property name */}
      <div
        className={`${small ? "h-9" : "h-14"} w-full flex items-center justify-center px-2 border-b-2 border-gray-300`}
        style={{ backgroundColor: bgColor }}
      >
        <p className={`text-white font-black text-center leading-tight ${small ? "text-[7px]" : "text-[10px]"} drop-shadow-md`}>
          {card.name ?? PROPERTY_COLOR_LABEL[color!]}
        </p>
      </div>

      {/* Rent table */}
      {!small && (
        <div className="flex-1 px-2 py-1.5 bg-white">
          <div className="bg-gray-50 rounded px-1.5 py-1 border border-gray-200">
            <p className="text-[7px] text-gray-600 text-center mb-1 font-bold uppercase tracking-wide">Rent</p>
            <div className="space-y-0.5">
              {rents.map((rent, i) => (
                <div key={i} className="flex justify-between items-center text-[8px] px-1">
                  <span className="text-gray-700 font-semibold">
                    {i + 1}{i + 1 === setSize ? " ★" : ""}
                  </span>
                  <span className="font-black text-gray-900">${rent}M</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function WildcardPropertyContent({ card, small }: { card: Card; small?: boolean }) {
  const colors = card.colors ?? [];
  const isMulti = colors.length > 2;

  const bannerStyle: React.CSSProperties = isMulti
    ? {
        background: `conic-gradient(${Object.values(PROPERTY_COLOR_HEX)
          .map(
            (c, i, arr) =>
              `${c} ${(i / arr.length) * 360}deg ${((i + 1) / arr.length) * 360}deg`
          )
          .join(", ")})`,
      }
    : colors.length === 2
      ? {
          background: `linear-gradient(to right, ${PROPERTY_COLOR_HEX[colors[0]]} 50%, ${PROPERTY_COLOR_HEX[colors[1]]} 50%)`,
        }
      : { backgroundColor: "#888" };

  return (
    <>
      <ValueBadge value={card.value} color="#555" small={small} />

      {/* Color banner */}
      <div className={`${small ? "h-9" : "h-12"} w-full border-b-2 border-gray-300`} style={bannerStyle} />

      {/* Card content */}
      <div className="flex-1 flex flex-col items-center justify-center px-2 bg-white">
        <div className={`${small ? "w-11 h-11" : "w-16 h-16"} rounded-lg border-4 border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center shadow-md`}>
          <p className={`font-black text-center text-gray-700 ${small ? "text-[6px]" : "text-[8px]"} uppercase leading-tight px-1`}>
            Property Wild Card
          </p>
        </div>
        {!isMulti && !small && colors.length === 2 && (
          <p className="text-[8px] text-gray-600 text-center mt-1.5 font-semibold">
            {PROPERTY_COLOR_LABEL[colors[0]]} / {PROPERTY_COLOR_LABEL[colors[1]]}
          </p>
        )}
        {isMulti && !small && (
          <p className="text-[8px] text-gray-600 text-center mt-1.5 font-semibold">
            Any Color
          </p>
        )}
      </div>
    </>
  );
}

function MoneyCardContent({ card, small }: { card: Card; small?: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 w-full h-full rounded-b-lg border-t-4 border-emerald-300">
      <div className={`${small ? "w-12 h-12" : "w-16 h-16"} bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-emerald-700`}>
        <p className={`font-black text-emerald-700 ${small ? "text-sm" : "text-xl"}`}>
          ${card.value}M
        </p>
      </div>
      {!small && (
        <p className="text-[8px] text-white font-bold uppercase tracking-wider mt-2 drop-shadow">
          Monopoly Money
        </p>
      )}
    </div>
  );
}

function ActionCardContent({ card, small }: { card: Card; small?: boolean }) {
  const color = ACTION_COLORS[card.type] ?? "#6B7280";
  const subtitle = getActionSubtitle(card.type);

  return (
    <>
      <ValueBadge value={card.value} color={color} small={small} />

      {/* Colored top banner */}
      <div className={`${small ? "h-3" : "h-4"} w-full border-b-2 border-gray-300`} style={{ backgroundColor: color }} />

      {/* Card content */}
      <div className="flex-1 flex flex-col items-center justify-center px-2 bg-white">
        <div
          className={`${small ? "w-11 h-11" : "w-16 h-16"} rounded-full flex items-center justify-center border-4 shadow-md bg-white`}
          style={{ borderColor: color }}
        >
          <p className={`font-black text-center leading-tight ${small ? "text-[6px]" : "text-[8px]"} uppercase px-1`} style={{ color }}>
            {CARD_TYPE_LABEL[card.type]}
          </p>
        </div>
        {subtitle && !small && (
          <p className="text-[8px] text-gray-600 text-center mt-1.5 font-semibold">{subtitle}</p>
        )}
      </div>
    </>
  );
}

function RentCardContent({ card, small }: { card: Card; small?: boolean }) {
  const isWild = card.type === CardType.RentWild;
  const colors = card.colors ?? [];

  const circleStyle: React.CSSProperties = isWild
    ? {
        background: `conic-gradient(${Object.values(PROPERTY_COLOR_HEX)
          .map(
            (c, i, arr) =>
              `${c} ${(i / arr.length) * 360}deg ${((i + 1) / arr.length) * 360}deg`
          )
          .join(", ")})`,
      }
    : colors.length === 2
      ? {
          background: `linear-gradient(135deg, ${PROPERTY_COLOR_HEX[colors[0]]} 50%, ${PROPERTY_COLOR_HEX[colors[1]]} 50%)`,
        }
      : { backgroundColor: "#7C3AED" };

  return (
    <>
      <ValueBadge value={card.value} color="#555" small={small} />

      {/* Top banner */}
      <div className={`${small ? "h-3" : "h-4"} w-full bg-gradient-to-b from-gray-700 to-gray-800 border-b-2 border-gray-300`} />

      {/* Card content */}
      <div className="flex-1 flex flex-col items-center justify-center px-2 bg-white">
        <div
          className={`${small ? "w-11 h-11" : "w-16 h-16"} rounded-full flex items-center justify-center border-4 border-white shadow-lg`}
          style={circleStyle}
        >
          <p className={`font-black text-white text-center ${small ? "text-[8px]" : "text-sm"} drop-shadow-md`}>
            RENT
          </p>
        </div>
        {!small && !isWild && colors.length === 2 && (
          <p className="text-[8px] text-gray-600 text-center mt-1.5 font-semibold">
            {PROPERTY_COLOR_LABEL[colors[0]]} / {PROPERTY_COLOR_LABEL[colors[1]]}
          </p>
        )}
        {!small && isWild && (
          <p className="text-[8px] text-gray-600 text-center mt-1.5 font-semibold">Any color</p>
        )}
      </div>
    </>
  );
}

function renderCardContent(card: Card, small?: boolean) {
  switch (card.type) {
    case CardType.Property:
      return <PropertyCardContent card={card} small={small} />;
    case CardType.PropertyWildcard:
      return <WildcardPropertyContent card={card} small={small} />;
    case CardType.Money:
      return <MoneyCardContent card={card} small={small} />;
    case CardType.RentDual:
    case CardType.RentWild:
      return <RentCardContent card={card} small={small} />;
    default:
      return <ActionCardContent card={card} small={small} />;
  }
}

export function GameCard({ card, onClick, selected, small, disabled }: GameCardProps) {
  const w = small ? "w-16" : "w-24";
  const h = small ? "h-24" : "h-36";

  return (
    <motion.div
      whileHover={onClick && !disabled ? { y: -8, scale: 1.05 } : undefined}
      whileTap={onClick && !disabled ? { scale: 0.95 } : undefined}
      onClick={disabled ? undefined : onClick}
      className={`
        ${w} ${h} rounded-lg shadow-lg flex flex-col overflow-hidden border border-gray-300 relative
        ${onClick && !disabled ? "cursor-pointer" : ""}
        ${selected ? "ring-3 ring-yellow-400 ring-offset-2 ring-offset-transparent" : ""}
        ${disabled ? "opacity-50" : ""}
        select-none shrink-0
      `}
      style={{ backgroundColor: "#FFFEF5" }}
    >
      {renderCardContent(card, small)}
    </motion.div>
  );
}

export function CardBack({ small }: { small?: boolean }) {
  const w = small ? "w-16" : "w-24";
  const h = small ? "h-24" : "h-36";

  return (
    <div
      className={`${w} ${h} rounded-lg shadow-lg bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center border-2 border-red-600 select-none shrink-0`}
    >
      <div className="w-[80%] h-[80%] rounded border-2 border-red-400/30 flex items-center justify-center">
        <span className={`font-black text-red-300/50 ${small ? "text-[6px]" : "text-[8px]"}`}>
          CO-OPOLY
        </span>
      </div>
    </div>
  );
}
