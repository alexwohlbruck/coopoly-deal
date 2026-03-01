import { motion } from "framer-motion";
import {
  type Card,
  CardType,
  getCardTypeLabel,
  PROPERTY_COLOR_HEX,
  getPropertyColorLabel,
  getPropertyName,
  RENT_VALUES,
  SET_SIZE,
} from "../../types/game";

interface GameCardProps {
  card: Card;
  onClick?: () => void;
  selected?: boolean;
  small?: boolean;
  disabled?: boolean;
  orientation?: "top" | "bottom"; // For two-color wildcards, which color is on top
  disableHover?: boolean; // Disable hover animation when card is scaled
  scale?: number; // Scale factor (0-1) to shrink the card
  useSocialistTheme?: boolean;
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

function getActionSubtitle(type: CardType, useSocialistTheme = false): string | null {
  switch (type) {
    case CardType.DebtCollector:
      return "Pay 5M";
    case CardType.Birthday:
      return "Everyone pays 2M";
    case CardType.PassGo:
      return "Draw 2 cards";
    case CardType.DoubleTheRent:
      return useSocialistTheme ? "2× Levy" : "2× Rent";
    case CardType.SlyDeal:
      return useSocialistTheme ? "Expropriate 1 property" : "Steal 1 property";
    case CardType.ForceDeal:
      return "Swap properties";
    case CardType.DealBreaker:
      return useSocialistTheme ? "Expropriate full set" : "Steal full set";
    case CardType.JustSayNo:
      return useSocialistTheme ? "Block directive" : "Block action";
    case CardType.House:
      return useSocialistTheme ? "+3M levy" : "+3M rent";
    case CardType.Hotel:
      return useSocialistTheme ? "+4M levy" : "+4M rent";
    default:
      return null;
  }
}

function ValueBadge({
  value,
  color,
  small,
}: {
  value: number;
  color: string;
  small?: boolean;
}) {
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

function PropertyCardContent({
  card,
  small,
  useSocialistTheme = false,
}: {
  card: Card;
  small?: boolean;
  useSocialistTheme?: boolean;
}) {
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
        <p
          className={`text-white font-black text-center leading-tight ${small ? "text-[7px]" : "text-[10px]"} drop-shadow-md`}
        >
          {card.name ? getPropertyName(card.name, useSocialistTheme) : (color ? getPropertyColorLabel(color, useSocialistTheme) : "")}
        </p>
      </div>

      {/* Rent table */}
      <div
        className={`flex-1 ${small ? "px-1 py-1" : "px-2 py-1.5"} bg-white flex flex-col`}
      >
        <div
          className={`flex-1 bg-gray-50 rounded ${small ? "px-1 py-0.5" : "px-1.5 py-1"} border border-gray-200 flex flex-col justify-center`}
        >
          <p
            className={`${small ? "text-[5px] mb-0.5" : "text-[7px] mb-1"} text-gray-600 text-center font-bold uppercase tracking-wide`}
          >
            {useSocialistTheme ? "Levy" : "Rent"}
          </p>
          <div className="space-y-0.5">
            {rents.map((rent, i) => (
              <div
                key={i}
                className={`flex justify-between items-center ${small ? "text-[6px]" : "text-[8px]"} px-1`}
              >
                <span className="text-gray-700 font-semibold">
                  {i + 1}
                  {i + 1 === setSize ? " ★" : ""}
                </span>
                <span className="font-black text-gray-900">${rent}M</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function WildcardPropertyContent({
  card,
  small,
  orientation,
  useSocialistTheme = false,
}: {
  card: Card;
  small?: boolean;
  orientation?: "top" | "bottom";
  useSocialistTheme?: boolean;
}) {
  const colors = card.colors ?? [];
  const isMulti = colors.length > 2;

  // For two-color wildcards, show as top/bottom split like the real card
  const bannerStyle: React.CSSProperties = isMulti
    ? {
        background: `conic-gradient(${Object.values(PROPERTY_COLOR_HEX)
          .map(
            (c, i, arr) =>
              `${c} ${(i / arr.length) * 360}deg ${((i + 1) / arr.length) * 360}deg`,
          )
          .join(", ")})`,
      }
    : colors.length === 2
      ? {
          background: `linear-gradient(to bottom, ${PROPERTY_COLOR_HEX[colors[0]]} 50%, ${PROPERTY_COLOR_HEX[colors[1]]} 50%)`,
        }
      : { backgroundColor: "#888" };

  return (
    <>
      <ValueBadge value={card.value} color="#555" small={small} />

      {/* Color banner - for two-color, this is the full card background */}
      {colors.length === 2 ? (
        <div className="flex-1 w-full relative" style={bannerStyle}>
          {/* Top color label */}
          <div className="absolute top-2 left-0 right-0 flex justify-center">
            <div className="bg-white/90 px-2 py-0.5 rounded shadow">
              <p
                className={`font-black text-center ${small ? "text-[6px]" : "text-[8px]"}`}
                style={{
                  color: PROPERTY_COLOR_HEX[colors[0]],
                  transform:
                    orientation === "bottom" ? "rotate(180deg)" : undefined,
                }}
              >
                {getPropertyColorLabel(
                  colors[0],
                  useSocialistTheme,
                ).toUpperCase()}
              </p>
            </div>
          </div>

          {/* Center wildcard indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`${small ? "w-10 h-10" : "w-14 h-14"} rounded-full bg-white border-4 border-gray-300 flex items-center justify-center shadow-lg`}
            >
              <p
                className={`font-black text-gray-700 ${small ? "text-[6px]" : "text-[8px]"} uppercase`}
              >
                WILD
              </p>
            </div>
          </div>

          {/* Bottom color label */}
          <div className="absolute bottom-2 left-0 right-0 flex justify-center">
            <div className="bg-white/90 px-2 py-0.5 rounded shadow">
              <p
                className={`font-black text-center ${small ? "text-[6px]" : "text-[8px]"}`}
                style={{
                  color: PROPERTY_COLOR_HEX[colors[1]],
                  transform:
                    orientation === "bottom" ? "rotate(180deg)" : undefined,
                }}
              >
                {getPropertyColorLabel(
                  colors[1],
                  useSocialistTheme,
                ).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div
            className={`${small ? "h-9" : "h-12"} w-full border-b-2 border-gray-300`}
            style={bannerStyle}
          />
          <div className="flex-1 flex flex-col items-center justify-center px-2 bg-white">
            <div
              className={`${small ? "w-10 h-10 border-2" : "w-16 h-16 border-4"} rounded-lg border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center shadow-md`}
            >
              <p
                className={`font-black text-center text-gray-700 ${small ? "text-[5px]" : "text-[8px]"} uppercase leading-tight px-1`}
              >
                Property Wild Card
              </p>
            </div>
            {isMulti && (
              <p
                className={`${small ? "text-[6px] mt-1" : "text-[8px] mt-1.5"} text-gray-600 text-center font-semibold`}
              >
                Any Color
              </p>
            )}
          </div>
        </>
      )}
    </>
  );
}

function getMoneyCardColors(value: number): {
  bg: string;
  border: string;
  text: string;
} {
  switch (value) {
    case 1:
      return { bg: "#F59E0B", border: "#D97706", text: "#92400E" }; // Yellow
    case 2:
      return { bg: "#FB923C", border: "#F97316", text: "#7C2D12" }; // Salmon
    case 3:
      return { bg: "#BEF264", border: "#A3E635", text: "#365314" }; // Faded yellow/green
    case 4:
      return { bg: "#7DD3FC", border: "#38BDF8", text: "#0C4A6E" }; // Light blue
    case 5:
      return { bg: "#C084FC", border: "#A855F7", text: "#581C87" }; // Purple
    case 10:
      return { bg: "#FBBF24", border: "#F59E0B", text: "#78350F" }; // Yellow-orange
    default:
      return { bg: "#10B981", border: "#059669", text: "#064E3B" };
  }
}

function MoneyCardContent({ card, small }: { card: Card; small?: boolean }) {
  const colors = getMoneyCardColors(card.value);

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center w-full h-full rounded-b-lg border-t-4"
      style={{
        background: `linear-gradient(to bottom right, ${colors.bg}, ${colors.border})`,
        borderTopColor: colors.border,
      }}
    >
      <div
        className={`${small ? "w-12 h-12" : "w-16 h-16"} bg-white rounded-full flex items-center justify-center shadow-lg border-2`}
        style={{ borderColor: colors.border }}
      >
        <p
          className={`font-black ${small ? "text-sm" : "text-xl"}`}
          style={{ color: colors.text }}
        >
          ${card.value}M
        </p>
      </div>
      <p
        className={`${small ? "text-[6px] mt-1" : "text-[8px] mt-2"} text-white font-bold uppercase tracking-wider drop-shadow`}
      >
        Money
      </p>
    </div>
  );
}

function ActionCardContent({
  card,
  small,
  useSocialistTheme = false,
}: {
  card: Card;
  small?: boolean;
  useSocialistTheme?: boolean;
}) {
  const color = ACTION_COLORS[card.type] ?? "#6B7280";
  const subtitle = getActionSubtitle(card.type, useSocialistTheme);

  return (
    <>
      <ValueBadge value={card.value} color={color} small={small} />

      {/* Colored top banner */}
      <div
        className={`${small ? "h-3" : "h-4"} w-full border-b-2 border-gray-300`}
        style={{ backgroundColor: color }}
      />

      {/* Card content */}
      <div className="flex-1 flex flex-col items-center justify-center px-2 bg-white">
        <div
          className={`${small ? "w-10 h-10 border-2" : "w-16 h-16 border-4"} rounded-full flex items-center justify-center shadow-md bg-white`}
          style={{ borderColor: color }}
        >
          <p
            className={`font-black text-center leading-tight ${small ? "text-[5px]" : "text-[8px]"} uppercase px-1`}
            style={{ color }}
          >
            {getCardTypeLabel(card.type, useSocialistTheme)}
          </p>
        </div>
        {subtitle && (
          <p
            className={`${small ? "text-[5px] mt-1" : "text-[8px] mt-1.5"} text-gray-600 text-center font-semibold`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </>
  );
}

function RentCardContent({
  card,
  small,
  useSocialistTheme = false,
}: {
  card: Card;
  small?: boolean;
  useSocialistTheme?: boolean;
}) {
  const isWild = card.type === CardType.RentWild;
  const colors = card.colors ?? [];

  const circleStyle: React.CSSProperties = isWild
    ? {
        background: `conic-gradient(${Object.values(PROPERTY_COLOR_HEX)
          .map(
            (c, i, arr) =>
              `${c} ${(i / arr.length) * 360}deg ${((i + 1) / arr.length) * 360}deg`,
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
      <div
        className={`${small ? "h-3" : "h-4"} w-full bg-gradient-to-b from-gray-700 to-gray-800 border-b-2 border-gray-300`}
      />

      {/* Card content */}
      <div className="flex-1 flex flex-col items-center justify-center px-2 bg-white">
        <div
          className={`${small ? "w-10 h-10 border-2" : "w-16 h-16 border-4"} rounded-full flex items-center justify-center border-white shadow-lg`}
          style={circleStyle}
        >
          <p
            className={`font-black text-white text-center ${small ? "text-[6px]" : "text-sm"} drop-shadow-md`}
          >
            {useSocialistTheme ? "LEVY" : "RENT"}
          </p>
        </div>
        {!isWild && colors.length === 2 && (
          <p
            className={`${small ? "text-[5px] mt-1" : "text-[8px] mt-1.5"} text-gray-600 text-center font-semibold`}
          >
            {getPropertyColorLabel(colors[0], useSocialistTheme)} /{" "}
            {getPropertyColorLabel(colors[1], useSocialistTheme)}
          </p>
        )}
        {isWild && (
          <p
            className={`${small ? "text-[5px] mt-1" : "text-[8px] mt-1.5"} text-gray-600 text-center font-semibold`}
          >
            Any color
          </p>
        )}
      </div>
    </>
  );
}

function renderCardContent(
  card: Card,
  small?: boolean,
  orientation?: "top" | "bottom",
  useSocialistTheme?: boolean,
) {
  switch (card.type) {
    case CardType.Property:
      return (
        <PropertyCardContent
          card={card}
          small={small}
          useSocialistTheme={useSocialistTheme}
        />
      );
    case CardType.PropertyWildcard:
      return (
        <WildcardPropertyContent
          card={card}
          small={small}
          orientation={orientation}
          useSocialistTheme={useSocialistTheme}
        />
      );
    case CardType.Money:
      return <MoneyCardContent card={card} small={small} />;
    case CardType.RentDual:
    case CardType.RentWild:
      return (
        <RentCardContent
          card={card}
          small={small}
          useSocialistTheme={useSocialistTheme}
        />
      );
    default:
      return (
        <ActionCardContent
          card={card}
          small={small}
          useSocialistTheme={useSocialistTheme}
        />
      );
  }
}

export function GameCard({
  card,
  onClick,
  selected,
  small,
  disabled,
  orientation,
  disableHover,
  scale = 1,
  useSocialistTheme = false,
}: GameCardProps) {
  const w = small ? "w-16 sm:w-24" : "w-24 sm:w-32";
  const h = small ? "h-24 sm:h-36" : "h-36 sm:h-48";

  return (
    <motion.div
      whileHover={
        onClick && !disabled && !disableHover
          ? { y: -8, scale: 1.05 }
          : undefined
      }
      whileTap={onClick && !disabled ? { scale: 0.95 } : undefined}
      onClick={disabled ? undefined : onClick}
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "center center",
      }}
      className={`
        ${w} ${h} ${onClick && !disabled ? "cursor-pointer" : ""}
      `}
    >
      <div
        style={{
          transform: orientation === "bottom" ? "rotate(180deg)" : undefined,
          transformOrigin: "center center",
        }}
        className={`
          w-full h-full rounded-lg shadow-lg flex flex-col overflow-hidden border border-gray-300 relative bg-[#FFFEF5]
          ${selected ? "ring-4 ring-yellow-400 ring-offset-2 ring-offset-transparent" : ""}
          ${disabled ? "opacity-50" : ""}
          select-none shrink-0
        `}
      >
        {renderCardContent(card, small, orientation, useSocialistTheme)}
      </div>
    </motion.div>
  );
}

export function CardBack({
  small,
  useSocialistTheme = false,
}: {
  small?: boolean;
  useSocialistTheme?: boolean;
}) {
  const w = small ? "w-16 sm:w-24" : "w-24 sm:w-32";
  const h = small ? "h-24 sm:h-36" : "h-36 sm:h-48";

  return (
    <div
      className={`${w} ${h} rounded-lg shadow-lg bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center border-2 border-red-600 select-none shrink-0`}
    >
      <div className="w-[80%] h-[80%] rounded border-2 border-red-400/30 flex flex-col items-center justify-center gap-2">
        {useSocialistTheme ? (
          <>
            <svg
              className={`${small ? "w-6 h-6" : "w-10 h-10"} text-yellow-500/80`}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12.5,2.5 L14,5 L17,5 L15.5,7.5 L17,10 L14,10 L12.5,12.5 L11,10 L8,10 L9.5,7.5 L8,5 L11,5 L12.5,2.5 Z M6,14 C6,17.31 8.69,20 12,20 C15.31,20 18,17.31 18,14 L16,14 C16,16.21 14.21,18 12,18 C9.79,18 8,16.21 8,14 L6,14 Z M10,14 L14,14 L12,17 L10,14 Z" />
            </svg>
            <span
              className={`font-black text-yellow-500/80 ${small ? "text-[5px]" : "text-[7px]"} tracking-widest`}
            >
              CO-OPOLY
            </span>
          </>
        ) : (
          <span
            className={`font-black text-red-300/50 ${small ? "text-[6px]" : "text-[8px]"}`}
          >
            CO-OPOLY
          </span>
        )}
      </div>
    </div>
  );
}
