import { motion } from "framer-motion";
import type { ClientPlayer, GameSettings } from "../../types/game";
import { isSetComplete } from "../../types/game";
import { PropertySetDisplay } from "./PropertySetDisplay";
import { FannedCards } from "../cards/FannedCards";
import { useGameStore } from "../../hooks/useGameStore";
import { getTheme } from "../../theme/colors";
import { PrimaryButton, SecondaryButton } from "../ui/Button";

interface EndGameSummaryProps {
  players: ClientPlayer[];
  winnerId: string | null;
  currentPlayerId: string;
  settings: GameSettings;
  sessionStats?: {
    wins: number;
    losses: number;
    streak: number;
    gamesPlayed: number;
  };
  onRematch?: () => void;
  onGoHome?: () => void;
}

export function EndGameSummary({
  players,
  winnerId,
  currentPlayerId,
  settings,
  sessionStats,
  onRematch,
  onGoHome,
}: EndGameSummaryProps) {
  const { theme } = useGameStore();
  const themeData = getTheme(theme);
  const winner = players.find((p) => p.id === winnerId);
  const youWon = winner?.id === currentPlayerId;
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.id === winnerId) return -1;
    if (b.id === winnerId) return 1;
    const aSets = a.properties.filter(isSetComplete).length;
    const bSets = b.properties.filter(isSetComplete).length;
    if (aSets !== bSets) return bSets - aSets;
    const aValue =
      a.bank.reduce((sum, c) => sum + c.value, 0) +
      a.properties.flatMap((s) => s.cards).reduce((sum, c) => sum + c.value, 0);
    const bValue =
      b.bank.reduce((sum, c) => sum + c.value, 0) +
      b.properties.flatMap((s) => s.cards).reduce((sum, c) => sum + c.value, 0);
    return bValue - aValue;
  });

  return (
    <div
      className={`min-h-screen ${themeData.feltClass} felt-surface overflow-y-auto`}
    >
      <div
        className="container mx-auto px-4 max-w-5xl relative z-10"
        style={{ paddingTop: 64, paddingBottom: 64 }}
      >
        {/* Winner card — center stage */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 22,
          }}
          style={{
            margin: "0 auto 48px",
            maxWidth: 520,
            padding: "32px 28px 28px",
            borderRadius: 22,
            background:
              "linear-gradient(180deg, rgba(28,22,20,0.92) 0%, rgba(16,10,8,0.96) 100%)",
            border: "1px solid rgba(245,234,208,0.12)",
            boxShadow:
              "0 32px 80px -16px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Soft gold glow at the top */}
          <div
            style={{
              position: "absolute",
              top: -120,
              left: "50%",
              transform: "translateX(-50%)",
              width: 320,
              height: 240,
              background:
                "radial-gradient(closest-side, var(--accent, #f0c14a) 0%, transparent 70%)",
              opacity: 0.18,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--accent, #f0c14a)",
              marginBottom: 8,
            }}
          >
            {youWon ? "Victory" : "Game Over"}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 56,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              color: "#f5ead0",
              margin: 0,
            }}
          >
            {youWon ? "You Win!" : `${winner?.name} Wins!`}
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "rgba(245,234,208,0.65)",
              marginTop: 10,
              marginBottom: 24,
            }}
          >
            {settings?.useSocialistTheme
              ? `${winner?.name ?? "Someone"} achieved 3 collective sets`
              : `${winner?.name ?? "Someone"} collected 3 complete property sets`}
          </p>

          {sessionStats && (
            <div
              style={{
                display: "flex",
                gap: 32,
                justifyContent: "center",
                marginBottom: 24,
                paddingTop: 16,
                paddingBottom: 16,
                borderTop: "1px solid rgba(255,255,255,0.06)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {[
                { label: "Wins", value: sessionStats.wins },
                { label: "Losses", value: sessionStats.losses },
                { label: "Streak", value: sessionStats.streak },
              ].map((stat) => (
                <div key={stat.label} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 32,
                      fontWeight: 800,
                      color: "#f5ead0",
                      lineHeight: 1,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {stat.value}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "rgba(245,234,208,0.5)",
                      marginTop: 4,
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
            }}
          >
            {onRematch && (
              <PrimaryButton onClick={onRematch} size="lg">
                Rematch
              </PrimaryButton>
            )}
            {onGoHome && (
              <SecondaryButton onClick={onGoHome} size="lg">
                Leave
              </SecondaryButton>
            )}
          </div>
        </motion.div>

        {/* Final standings */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(245,234,208,0.55)",
            textAlign: "center",
            marginBottom: 18,
          }}
        >
          Final Standings
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sortedPlayers.map((player, index) => {
            const bankTotal = player.bank.reduce((sum, c) => sum + c.value, 0);
            const propertyTotal = player.properties
              .flatMap((s) => s.cards)
              .reduce((sum, c) => sum + c.value, 0);
            const totalValue = bankTotal + propertyTotal;
            const completeSets = player.properties.filter(isSetComplete)
              .length;
            const isWinner = player.id === winnerId;

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * index + 0.2 }}
                style={{
                  borderRadius: 16,
                  padding: "20px 24px 16px",
                  background:
                    "linear-gradient(180deg, rgba(28,22,20,0.78) 0%, rgba(16,10,8,0.86) 100%)",
                  border: isWinner
                    ? "1px solid color-mix(in oklab, var(--accent, #f0c14a) 60%, transparent)"
                    : "1px solid rgba(245,234,208,0.08)",
                  boxShadow: isWinner
                    ? "0 0 0 1px color-mix(in oklab, var(--accent, #f0c14a) 30%, transparent), 0 12px 28px -10px rgba(0,0,0,0.6)"
                    : "0 8px 20px -8px rgba(0,0,0,0.55)",
                }}
              >
                {/* Player header row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 28,
                      fontWeight: 800,
                      color: "rgba(245,234,208,0.32)",
                      minWidth: 36,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    #{index + 1}
                  </div>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 999,
                      background: isWinner
                        ? "linear-gradient(180deg, var(--accent, #f0c14a) 0%, color-mix(in oklab, var(--accent, #f0c14a) 60%, #000) 100%)"
                        : "linear-gradient(180deg, #5a5340, #3a342a)",
                      color: "#1a1208",
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.4)",
                    }}
                  >
                    {player.name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                          fontSize: 18,
                          color: "#f5ead0",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {player.name}
                      </span>
                      {player.id === currentPlayerId && (
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            letterSpacing: "0.14em",
                            color: "rgba(245,234,208,0.55)",
                          }}
                        >
                          (YOU)
                        </span>
                      )}
                      {isWinner && (
                        <span style={{ fontSize: 18 }}>👑</span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 14,
                        marginTop: 4,
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      <span style={{ color: "#7adb88" }}>${totalValue}M total</span>
                      <span style={{ color: "var(--accent, #f0c14a)" }}>
                        {completeSets}/3 sets
                      </span>
                    </div>
                  </div>
                </div>

                {/* Property sets */}
                {player.properties.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "rgba(245,234,208,0.4)",
                        marginBottom: 8,
                      }}
                    >
                      Properties
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        alignItems: "flex-start",
                      }}
                    >
                      {player.properties.map((set, i) => (
                        <PropertySetDisplay
                          key={`${set.color}-${i}`}
                          set={set}
                          isYou={false}
                          isCurrentTurn={false}
                          useSocialistTheme={settings?.useSocialistTheme}
                          cardWidth={76}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Bank + hand */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 16,
                  }}
                >
                  {player.bank.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 9,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: "rgba(245,234,208,0.4)",
                          marginBottom: 8,
                        }}
                      >
                        Bank · ${bankTotal}M
                      </div>
                      <div
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          background: "rgba(0,0,0,0.22)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                          display: "inline-block",
                        }}
                      >
                        <FannedCards
                          cards={[...player.bank].sort(
                            (a, b) => a.value - b.value,
                          )}
                          cardWidth={64}
                          maxVisible={12}
                          useSocialistTheme={settings?.useSocialistTheme}
                        />
                      </div>
                    </div>
                  )}
                  {player.hand && player.hand.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 9,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: "rgba(245,234,208,0.4)",
                          marginBottom: 8,
                        }}
                      >
                        Hand · {player.hand.length} cards
                      </div>
                      <div
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          background: "rgba(0,0,0,0.22)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                          display: "inline-block",
                        }}
                      >
                        <FannedCards
                          cards={player.hand}
                          cardWidth={64}
                          maxVisible={12}
                          useSocialistTheme={settings?.useSocialistTheme}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
