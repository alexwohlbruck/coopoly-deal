import { motion } from "framer-motion";
import {
  type Card,
  CardType,
  getCardTypeLabel,
  PropertyColor,
  getPropertyColorLabel,
  getPropertyName,
  RENT_VALUES,
  SET_SIZE,
} from "../../types/game";

interface GameCardProps {
  card: Card;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  orientation?: "top" | "bottom"; // For two-color wildcards, which color is on top
  disableHover?: boolean; // Disable hover animation when card is scaled
  scale?: number; // Scale factor (0-1) to shrink the card
  useSocialistTheme?: boolean;
  width?: number; // Target width in pixels (default 96)
}

/**
 * CSS variable name for each property color band.
 * Mirrors :root --p-* tokens in index.css. The design intentionally
 * routes property colors through CSS vars so a theme/mode swap could
 * later override them in one place.
 */
const PROPERTY_COLOR_VAR: Record<PropertyColor, string> = {
  [PropertyColor.Brown]: "var(--p-brown)",
  [PropertyColor.LightBlue]: "var(--p-skyblue)",
  [PropertyColor.Pink]: "var(--p-pink)",
  [PropertyColor.Orange]: "var(--p-orange)",
  [PropertyColor.Red]: "var(--p-red)",
  [PropertyColor.Yellow]: "var(--p-yellow)",
  [PropertyColor.Green]: "var(--p-green)",
  [PropertyColor.DarkBlue]: "var(--p-darkblue)",
  [PropertyColor.Railroad]: "var(--p-railroad)",
  [PropertyColor.Utility]: "var(--p-utility)",
  [PropertyColor.Unassigned]: "#8b5cf6", // visible-only fallback; rainbow card overrides anyway
};

/**
 * Foreground (text) color on each property color band, picked for contrast.
 */
const PROPERTY_BAND_FG: Record<PropertyColor, string> = {
  [PropertyColor.Brown]: "#fff",
  [PropertyColor.LightBlue]: "#0e2230",
  [PropertyColor.Pink]: "#fff",
  [PropertyColor.Orange]: "#fff",
  [PropertyColor.Red]: "#fff",
  [PropertyColor.Yellow]: "#3a2a08",
  [PropertyColor.Green]: "#fff",
  [PropertyColor.DarkBlue]: "#fff",
  [PropertyColor.Railroad]: "#fff",
  [PropertyColor.Utility]: "#fff",
  [PropertyColor.Unassigned]: "#fff",
};

/**
 * Action card accent (banner underline + glyph color).
 */
const ACTION_ACCENT: Partial<Record<CardType, string>> = {
  [CardType.PassGo]: "#88d4ff",
  [CardType.SlyDeal]: "#5ee0d8",
  [CardType.ForceDeal]: "#5ee0d8",
  [CardType.DealBreaker]: "#ff7ae0",
  [CardType.DebtCollector]: "#7adb88",
  [CardType.Birthday]: "#7adb88",
  [CardType.JustSayNo]: "#ff8a8a",
  [CardType.DoubleTheRent]: "#ffb070",
  [CardType.House]: "#7adb88",
  [CardType.Hotel]: "#ff7a7a",
};

const MONEY_BG_VAR: Record<number, string> = {
  1: "var(--m-1)",
  2: "var(--m-2)",
  3: "var(--m-3)",
  4: "var(--m-4)",
  5: "var(--m-5)",
  10: "var(--m-10)",
};

function getActionSubtitle(
  type: CardType,
  useSocialistTheme = false,
): string | null {
  switch (type) {
    case CardType.DebtCollector:
      return "Pay 5M";
    case CardType.Birthday:
      return useSocialistTheme ? "All comrades contribute 2M" : "Everyone pays 2M";
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

/**
 * Integrated property color banner: value chip on the left, name on the right,
 * sharing one row inside a single border. This is the fix for the floating
 * value-badge that previously overlapped sibling cards in fans.
 */
function PropertyBanner({
  color,
  value,
  name,
  fontScale = 1,
}: {
  color: PropertyColor;
  value: number;
  name: string;
  fontScale?: number;
}) {
  const bg = PROPERTY_COLOR_VAR[color];
  const fg = PROPERTY_BAND_FG[color];
  return (
    <div
      style={{
        background: bg,
        color: fg,
        padding: `${5 * fontScale}px ${7 * fontScale}px ${4 * fontScale}px`,
        borderBottom: "1px solid rgba(0,0,0,0.25)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.15)",
        display: "flex",
        alignItems: "center",
        gap: 4,
        lineHeight: 1.05,
      }}
    >
      {value > 0 && (
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 10 * fontScale,
            letterSpacing: "0.02em",
            padding: "1px 5px",
            borderRadius: 4,
            background: "rgba(0,0,0,0.32)",
            color: "#fff",
            flexShrink: 0,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          ${value}M
        </div>
      )}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 9.5 * fontScale,
          letterSpacing: "0.01em",
          textTransform: "uppercase",
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </div>
    </div>
  );
}

function PropertyBody({
  color,
  rents,
  setSize,
  fontScale = 1,
  useSocialistTheme = false,
}: {
  color: PropertyColor;
  rents: number[];
  setSize: number;
  fontScale?: number;
  useSocialistTheme?: boolean;
}) {
  return (
    <div
      className="paper-grain"
      style={{
        flex: 1,
        padding: `${8 * fontScale}px ${8 * fontScale}px ${6 * fontScale}px`,
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(180deg, var(--card-paper) 0%, var(--card-paper-2) 100%)",
      }}
    >
      <div
        style={{
          fontSize: 8 * fontScale,
          letterSpacing: "0.08em",
          color: "var(--card-ink-soft)",
          marginBottom: 4,
          textAlign: "center",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        {useSocialistTheme ? "Levy" : "Rent"}
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-evenly",
          fontSize: 9 * fontScale,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {rents.map((rent, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom:
                i < rents.length - 1 ? "1px dotted rgba(0,0,0,0.15)" : "none",
              padding: "1px 2px",
            }}
          >
            <span style={{ color: "var(--card-ink-soft)" }}>
              {i + 1}
              {i + 1 === setSize ? "★" : ""}
            </span>
            <span style={{ fontWeight: 600 }}>${rent}M</span>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 5,
          height: 3,
          borderRadius: 2,
          background: PROPERTY_COLOR_VAR[color],
          boxShadow: "inset 0 1px 0 rgba(0,0,0,0.2)",
        }}
      />
    </div>
  );
}

/** Property card body. */
function PropertyCardContent({
  card,
  fontScale,
  useSocialistTheme = false,
}: {
  card: Card;
  fontScale: number;
  useSocialistTheme?: boolean;
}) {
  const color = card.colors?.[0] ?? PropertyColor.Brown;
  const rents = RENT_VALUES[color] ?? [];
  const setSize = SET_SIZE[color] ?? 0;
  const name = card.name
    ? getPropertyName(card.name, useSocialistTheme)
    : getPropertyColorLabel(color, useSocialistTheme);
  return (
    <>
      <PropertyBanner
        color={color}
        value={card.value}
        name={name}
        fontScale={fontScale}
      />
      <PropertyBody
        color={color}
        rents={rents}
        setSize={setSize}
        fontScale={fontScale}
        useSocialistTheme={useSocialistTheme}
      />
    </>
  );
}

/** 2-color wildcard: top + bottom color bands with a "Wild" badge in the middle. */
function WildcardPropertyContent({
  card,
  fontScale,
  orientation,
  useSocialistTheme = false,
}: {
  card: Card;
  fontScale: number;
  orientation?: "top" | "bottom";
  useSocialistTheme?: boolean;
}) {
  const colors = card.colors ?? [];
  const isMulti = colors.length > 2;
  const isRainbow = isMulti || colors[0] === PropertyColor.Unassigned;

  if (isRainbow) {
    // Rainbow / property wildcard: 9-stripe band top + bottom.
    const stripes: PropertyColor[] = [
      PropertyColor.Brown,
      PropertyColor.LightBlue,
      PropertyColor.Pink,
      PropertyColor.Orange,
      PropertyColor.Red,
      PropertyColor.Yellow,
      PropertyColor.Green,
      PropertyColor.DarkBlue,
      PropertyColor.Railroad,
    ];
    const stripeBand = (reverse = false) => (
      <div
        style={{
          display: "flex",
          height: 12 * fontScale,
          boxShadow: reverse
            ? "inset 0 1px 0 rgba(0,0,0,0.25)"
            : "inset 0 -1px 0 rgba(0,0,0,0.25)",
        }}
      >
        {(reverse ? [...stripes].reverse() : stripes).map((c, i) => (
          <div
            key={i}
            style={{ flex: 1, background: PROPERTY_COLOR_VAR[c] }}
          />
        ))}
      </div>
    );
    return (
      <>
        {stripeBand(false)}
        <div
          className="paper-grain"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 6 * fontScale,
            textAlign: "center",
            background: "var(--card-paper)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 11 * fontScale,
              fontWeight: 800,
              letterSpacing: "0.03em",
              lineHeight: 1.05,
              color: "var(--card-ink)",
            }}
          >
            PROPERTY
            <br />
            WILDCARD
          </div>
          <div
            style={{
              marginTop: 5,
              fontSize: 7.5 * fontScale,
              letterSpacing: "0.08em",
              color: "var(--card-ink-soft)",
              textTransform: "uppercase",
            }}
          >
            Any Color
          </div>
        </div>
        {stripeBand(true)}
      </>
    );
  }

  // 2-color wildcard. The "active" (top-of-stack) color goes on top
  // right-side up; the inactive color is on the bottom rotated 180°
  // so flipping the card brings it right-side up.
  //
  // The body shows BOTH rent tables side-by-side: the active color's
  // rents on the right (right-side up) and the inactive color's
  // rents on the left (rotated 180°). When the player physically
  // flips the card, the previously-left rent table is now on the
  // right and right-side up — the layout reads symmetrically from
  // either orientation, mirroring the printed real-life card.
  const c1 = colors[0] ?? PropertyColor.Brown;
  const c2 = colors[1] ?? PropertyColor.Brown;
  const top = orientation === "bottom" ? c2 : c1;
  const bot = orientation === "bottom" ? c1 : c2;
  const ColorBand = ({ color, position }: { color: PropertyColor; position: "top" | "bottom" }) => (
    <div
      style={{
        background: PROPERTY_COLOR_VAR[color],
        color: PROPERTY_BAND_FG[color],
        padding: `${4 * fontScale}px ${7 * fontScale}px`,
        fontFamily: "var(--font-display)",
        fontSize: 9 * fontScale,
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow:
          position === "top"
            ? "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.18)"
            : "inset 0 1px 0 rgba(0,0,0,0.18), inset 0 -1px 0 rgba(255,255,255,0.18)",
        transform: position === "bottom" ? "rotate(180deg)" : undefined,
      }}
    >
      <span
        style={{
          background: "rgba(0,0,0,0.3)",
          padding: "0 4px",
          borderRadius: 3,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        ${card.value}M
      </span>
      <span>
        {getPropertyColorLabel(color, useSocialistTheme).toUpperCase()}
      </span>
    </div>
  );

  // Mini rent column. Used twice — once right-side up (active/top
  // color), once rotated 180° (inactive/bottom color). Compact: shows
  // the rent ladder with a tiny "RENT" label and a colored stripe
  // matching the column's color.
  const RentColumn = ({
    color,
    rotated,
  }: {
    color: PropertyColor;
    rotated: boolean;
  }) => {
    const rents = RENT_VALUES[color] ?? [];
    const setSize = SET_SIZE[color] ?? rents.length;
    return (
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          padding: `${4 * fontScale}px ${5 * fontScale}px`,
          transform: rotated ? "rotate(180deg)" : undefined,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 6.5 * fontScale,
            letterSpacing: "0.08em",
            color: "var(--card-ink-soft)",
            textAlign: "center",
            textTransform: "uppercase",
            fontWeight: 700,
            marginBottom: 2 * fontScale,
          }}
        >
          {useSocialistTheme ? "Levy" : "Rent"}
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-evenly",
            fontSize: 7.5 * fontScale,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {rents.map((rent, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom:
                  i < rents.length - 1
                    ? "1px dotted rgba(0,0,0,0.15)"
                    : "none",
                padding: "0.5px 1px",
                lineHeight: 1.1,
              }}
            >
              <span style={{ color: "var(--card-ink-soft)" }}>
                {i + 1}
                {i + 1 === setSize ? "★" : ""}
              </span>
              <span style={{ fontWeight: 600, color: "var(--card-ink)" }}>
                ${rent}
              </span>
            </div>
          ))}
        </div>
        {/* Color stripe to anchor each column to its color. */}
        <div
          style={{
            marginTop: 3,
            height: 2,
            borderRadius: 1,
            background: PROPERTY_COLOR_VAR[color],
            boxShadow: "inset 0 1px 0 rgba(0,0,0,0.2)",
          }}
        />
      </div>
    );
  };

  return (
    <>
      <ColorBand color={top} position="top" />
      <div
        className="paper-grain"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          background: "var(--card-paper)",
          // Hairline divider between the two columns.
          backgroundImage:
            "linear-gradient(90deg, transparent calc(50% - 0.5px), rgba(0,0,0,0.12) calc(50% - 0.5px), rgba(0,0,0,0.12) calc(50% + 0.5px), transparent calc(50% + 0.5px))",
        }}
      >
        {/* Inactive color rents on the LEFT, rotated 180° so they read
            correctly when the card is flipped. */}
        <RentColumn color={bot} rotated />
        {/* Active color rents on the RIGHT, right-side up. */}
        <RentColumn color={top} rotated={false} />
      </div>
      <ColorBand color={bot} position="bottom" />
    </>
  );
}

/** Money card. */
function MoneyCardContent({
  card,
  fontScale,
}: {
  card: Card;
  fontScale: number;
}) {
  const bg = MONEY_BG_VAR[card.value] ?? MONEY_BG_VAR[1];
  return (
    <div
      className="paper-grain"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(160deg, ${bg} 0%, color-mix(in oklab, ${bg} 80%, #000) 100%)`,
        color: "#fff",
      }}
    >
      <div
        style={{
          padding: `${5 * fontScale}px ${8 * fontScale}px`,
          fontFamily: "var(--font-display)",
          fontSize: 9.5 * fontScale,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          borderBottom: "1px solid rgba(0,0,0,0.28)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
          textShadow: "0 1px 0 rgba(0,0,0,0.2)",
        }}
      >
        Money
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28 * fontScale,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            textShadow: "0 2px 0 rgba(0,0,0,0.25)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          ${card.value}M
        </div>
      </div>
    </div>
  );
}

/** Action card (Sly Deal, Pass Go, etc.). */
/**
 * Small "$NM" chip used on cards whose face doesn't otherwise show
 * their bank value (action / rent cards). Positioned absolutely so
 * it floats over the card's top-left corner regardless of the card
 * body's flex layout. Skips rendering when value <= 0.
 *
 * The closest positioned ancestor is the GameCard inner wrapper
 * (which sets position: relative + overflow: hidden), so the badge
 * lands at the corner of the card itself.
 */
function CardValueBadge({
  value,
  fontScale = 1,
}: {
  value: number;
  fontScale?: number;
}) {
  if (!value || value <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 4,
        left: 4,
        background: "rgba(0,0,0,0.7)",
        color: "#f5ead0",
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: 9 * fontScale,
        letterSpacing: "0.02em",
        padding: `${1 * fontScale}px ${5 * fontScale}px`,
        borderRadius: 4,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(0,0,0,0.5)",
        fontVariantNumeric: "tabular-nums",
        zIndex: 4,
        pointerEvents: "none",
      }}
    >
      ${value}M
    </div>
  );
}

function ActionCardContent({
  card,
  fontScale,
  useSocialistTheme = false,
}: {
  card: Card;
  fontScale: number;
  useSocialistTheme?: boolean;
}) {
  const accent = ACTION_ACCENT[card.type] ?? "#e8c878";
  const subtitle = getActionSubtitle(card.type, useSocialistTheme);
  const title = getCardTypeLabel(card.type, useSocialistTheme);
  const value = card.value > 0 ? card.value : null;
  return (
    <div
      className="paper-grain"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "var(--card-paper)",
      }}
    >
      {/* Header bar: $value chip on the left, "ACTION" centered.
          The chip used to be a floating absolute-positioned badge in
          the top-left corner, which overlapped the centered title at
          small card sizes. Now it lives inside the header so layout
          flow keeps everything readable. */}
      <div
        style={{
          background: "linear-gradient(180deg, #2a2a2a 0%, #141414 100%)",
          color: accent,
          padding: `${5 * fontScale}px ${6 * fontScale}px ${4 * fontScale}px`,
          fontFamily: "var(--font-display)",
          fontSize: 9.5 * fontScale,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          borderBottom: `2px solid ${accent}`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 4,
        }}
      >
        <span
          style={{
            background: "rgba(0,0,0,0.4)",
            color: "#f5ead0",
            padding: `0 ${5 * fontScale}px`,
            borderRadius: 3,
            fontSize: 8.5 * fontScale,
            letterSpacing: "0.02em",
            fontVariantNumeric: "tabular-nums",
            visibility: value != null ? "visible" : "hidden",
            // Reserve roughly the same width whether visible or not so
            // "ACTION" stays centered.
            minWidth: 26 * fontScale,
            textAlign: "center",
          }}
        >
          {value != null ? `$${value}M` : "$0M"}
        </span>
        <span style={{ flex: 1, textAlign: "center" }}>Action</span>
        {/* Right-side spacer: same width as the left chip so the
            centered text stays visually centered. */}
        <span
          style={{
            visibility: "hidden",
            minWidth: 26 * fontScale,
            padding: `0 ${5 * fontScale}px`,
          }}
        >
          $0M
        </span>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: `${4 * fontScale}px ${6 * fontScale}px`,
          textAlign: "center",
          gap: 4,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 12 * fontScale,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
            color: "var(--card-ink)",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 8 * fontScale,
              color: "var(--card-ink-soft)",
              lineHeight: 1.2,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

/** Rent card (dual-color or wild). */
function RentCardContent({
  card,
  fontScale,
  useSocialistTheme = false,
}: {
  card: Card;
  fontScale: number;
  useSocialistTheme?: boolean;
}) {
  const isWild = card.type === CardType.RentWild;
  const colors = card.colors ?? [];
  const c1 = colors[0];
  const c2 = colors[1];
  const subtitle = isWild
    ? "Any color"
    : c1 && c2
      ? `${getPropertyColorLabel(c1, useSocialistTheme)} / ${getPropertyColorLabel(c2, useSocialistTheme)}`
      : null;
  // Use the dual-color stripe across the top as visual signal.
  const stripeBg = isWild
    ? `conic-gradient(${[
        PropertyColor.Brown,
        PropertyColor.LightBlue,
        PropertyColor.Pink,
        PropertyColor.Orange,
        PropertyColor.Red,
        PropertyColor.Yellow,
        PropertyColor.Green,
        PropertyColor.DarkBlue,
        PropertyColor.Railroad,
      ]
        .map((c, i, arr) => {
          const v = PROPERTY_COLOR_VAR[c];
          return `${v} ${(i / arr.length) * 360}deg ${((i + 1) / arr.length) * 360}deg`;
        })
        .join(", ")})`
    : c1 && c2
      ? `linear-gradient(135deg, ${PROPERTY_COLOR_VAR[c1]} 50%, ${PROPERTY_COLOR_VAR[c2]} 50%)`
      : "var(--p-railroad)";
  return (
    <>
    <div
      className="paper-grain"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "var(--card-paper)",
      }}
    >
      <div
        style={{
          height: 18 * fontScale,
          background: stripeBg,
          borderBottom: "1px solid rgba(0,0,0,0.25)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.18)",
        }}
      />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: `${4 * fontScale}px ${6 * fontScale}px`,
          textAlign: "center",
          gap: 4,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 14 * fontScale,
            fontWeight: 800,
            letterSpacing: "0.06em",
            color: "var(--card-ink)",
          }}
        >
          {useSocialistTheme ? "LEVY" : "RENT"}
        </div>
        {subtitle && (
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 8 * fontScale,
              color: "var(--card-ink-soft)",
              lineHeight: 1.2,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
    <CardValueBadge value={card.value} fontScale={fontScale} />
    </>
  );
}

function renderCardContent(
  card: Card,
  fontScale: number,
  orientation?: "top" | "bottom",
  useSocialistTheme?: boolean,
) {
  switch (card.type) {
    case CardType.Property:
      return (
        <PropertyCardContent
          card={card}
          fontScale={fontScale}
          useSocialistTheme={useSocialistTheme}
        />
      );
    case CardType.PropertyWildcard:
      return (
        <WildcardPropertyContent
          card={card}
          fontScale={fontScale}
          orientation={orientation}
          useSocialistTheme={useSocialistTheme}
        />
      );
    case CardType.Money:
      return <MoneyCardContent card={card} fontScale={fontScale} />;
    case CardType.RentDual:
    case CardType.RentWild:
      return (
        <RentCardContent
          card={card}
          fontScale={fontScale}
          useSocialistTheme={useSocialistTheme}
        />
      );
    default:
      return (
        <ActionCardContent
          card={card}
          fontScale={fontScale}
          useSocialistTheme={useSocialistTheme}
        />
      );
  }
}

/**
 * The redesigned playing card. Two-shadow object styling with paper grain.
 * Supports all card states via the selected/disabled props:
 *   - rest:     visible depth, no lift
 *   - hover:    handled by Framer Motion (whileHover)
 *   - selected: ring + lift
 *   - disabled: desat + 55% opacity, no lift (legal-move signal)
 */
export function GameCard({
  card,
  onClick,
  selected,
  disabled,
  orientation,
  disableHover,
  scale = 1,
  useSocialistTheme = false,
  width = 96,
}: GameCardProps) {
  const cardWidth = width * scale;
  const cardHeight = width * 1.5 * scale; // 2:3 aspect ratio
  // Scale internal type/padding proportional to card width (96 = baseline).
  const fontScale = Math.max(0.7, Math.min(1.4, width / 96));

  const interactive = !!onClick && !disabled;
  const baseShadow = "var(--sh-object), var(--sh-inner-edge)";
  const liftedShadow = "var(--sh-lifted), var(--sh-inner-edge)";

  return (
    <motion.div
      whileHover={
        interactive && !disableHover
          ? { y: -8, rotate: 1, transition: { duration: 0.18 } }
          : undefined
      }
      whileTap={interactive ? { scale: 0.97 } : undefined}
      onClick={disabled ? undefined : onClick}
      style={{
        width: `${cardWidth}px`,
        height: `${cardHeight}px`,
      }}
      className={interactive ? "cursor-pointer" : ""}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "var(--r-card)",
          background: "var(--card-paper)",
          color: "var(--card-ink)",
          fontFamily: "var(--font-ui)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          // NB: the outer card stays right-side-up at all orientations.
          // For 2-color wildcards, WildcardPropertyContent reorders the
          // top/bot color bands based on `orientation`, and only the
          // inactive (bottom) band is rotated 180° internally so it
          // reads correctly when the card is physically flipped.
          // Earlier this rotated the WHOLE card when orientation ===
          // "bottom" — which conflicted with the band reorder and net-
          // resulted in the INACTIVE color appearing visually on top.
          boxShadow: selected
            ? `0 0 0 3px var(--accent, #f0c14a), ${liftedShadow}`
            : baseShadow,
          filter: disabled
            ? "grayscale(1) brightness(0.55) contrast(0.92)"
            : undefined,
          transition:
            "transform var(--d-base) var(--ease-out-soft), box-shadow var(--d-base) var(--ease-out-soft), filter var(--d-base) var(--ease-out-soft)",
        }}
        className="select-none shrink-0"
      >
        {renderCardContent(card, fontScale, orientation, useSocialistTheme)}
      </div>
    </motion.div>
  );
}

/**
 * Co-Opoly Deal card back. Two-shadow object with diagonal pattern + branding.
 */
export function CardBack({
  scale = 1,
  useSocialistTheme = false,
  width = 96,
}: {
  scale?: number;
  useSocialistTheme?: boolean;
  width?: number;
}) {
  const cardWidth = width * scale;
  const cardHeight = width * 1.5 * scale;
  const fontScale = Math.max(0.7, Math.min(1.4, width / 96));

  return (
    <div
      style={{
        width: `${cardWidth}px`,
        height: `${cardHeight}px`,
        borderRadius: "var(--r-card)",
        background:
          "linear-gradient(160deg, var(--card-back-1) 0%, var(--card-back-2) 100%)",
        color: "#f8e8c4",
        position: "relative",
        boxShadow: "var(--sh-object), var(--sh-inner-edge)",
      }}
      className="select-none shrink-0"
    >
      <div
        style={{
          position: "absolute",
          inset: 6,
          borderRadius: 5,
          border: "1px solid rgba(255, 220, 180, 0.18)",
          boxShadow: "inset 0 0 0 3px rgba(0,0,0,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent 0 6px, rgba(0,0,0,0.06) 6px 7px), repeating-linear-gradient(-45deg, transparent 0 6px, rgba(255,255,255,0.04) 6px 7px)",
        }}
      >
        {useSocialistTheme ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <svg
              style={{
                width: 32 * fontScale,
                height: 32 * fontScale,
                color: "rgba(248,232,196,0.7)",
              }}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12.5,2.5 L14,5 L17,5 L15.5,7.5 L17,10 L14,10 L12.5,12.5 L11,10 L8,10 L9.5,7.5 L8,5 L11,5 L12.5,2.5 Z M6,14 C6,17.31 8.69,20 12,20 C15.31,20 18,17.31 18,14 L16,14 C16,16.21 14.21,18 12,18 C9.79,18 8,16.21 8,14 L6,14 Z M10,14 L14,14 L12,17 L10,14 Z" />
            </svg>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 7 * fontScale,
                letterSpacing: "0.08em",
                color: "rgba(248,232,196,0.8)",
              }}
            >
              CO-OPOLY
            </span>
          </div>
        ) : (
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 11 * fontScale,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#f8e8c4",
              textShadow: "0 1px 0 rgba(0,0,0,0.4)",
              textAlign: "center",
              lineHeight: 1.1,
            }}
          >
            Co-Opoly
            <br />
            <span
              style={{
                fontSize: 7 * fontScale,
                letterSpacing: "0.08em",
                opacity: 0.8,
              }}
            >
              DEAL
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
