import { motion } from "framer-motion";
import type { ClientPlayer, GameSettings } from "../../types/game";
import { isSetComplete } from "../../types/game";
import { PropertySetDisplay } from "./PropertySetDisplay";
import { FannedCards } from "../cards/FannedCards";

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
  const winner = players.find((p) => p.id === winnerId);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Winner announcement */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-black text-white mb-3">
            {winner?.id === currentPlayerId
              ? "You Win!"
              : `${winner?.name} Wins!`}
          </h1>
          <p className="text-gray-400 text-lg mb-6">
            {winner?.name} collected 3 complete property sets
          </p>

          {sessionStats && (
            <div className="flex gap-8 justify-center mb-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">
                  {sessionStats.wins}
                </p>
                <p className="text-gray-400 text-sm">Wins</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">
                  {sessionStats.losses}
                </p>
                <p className="text-gray-400 text-sm">Losses</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">
                  {sessionStats.streak}
                </p>
                <p className="text-gray-400 text-sm">Streak</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-4 justify-center">
            {onRematch && (
              <button
                onClick={onRematch}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors shadow-lg text-lg"
              >
                Rematch
              </button>
            )}
            {onGoHome && (
              <button
                onClick={onGoHome}
                className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors shadow-lg text-lg"
              >
                Leave
              </button>
            )}
          </div>
        </motion.div>

        {/* Final standings */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white text-center mb-4">
            Final Standings
          </h2>

          {sortedPlayers.map((player, index) => {
            const bankTotal = player.bank.reduce((sum, c) => sum + c.value, 0);
            const propertyTotal = player.properties
              .flatMap((s) => s.cards)
              .reduce((sum, c) => sum + c.value, 0);
            const totalValue = bankTotal + propertyTotal;
            const completeSets = player.properties.filter(isSetComplete).length;
            const isWinner = player.id === winnerId;

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white/5 rounded-xl p-6 border-2 ${
                  isWinner ? "border-yellow-500/60 bg-yellow-500/5" : "border-white/10"
                }`}
              >
                {/* Player header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-3xl font-black text-white/40">
                    #{index + 1}
                  </div>
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                      isWinner ? "bg-yellow-500" : "bg-slate-600"
                    }`}
                  >
                    {player.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-bold text-xl">
                        {player.name}
                      </span>
                      {player.id === currentPlayerId && (
                        <span className="text-gray-400 text-sm">(you)</span>
                      )}
                      {isWinner && (
                        <span className="text-2xl">👑</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-emerald-400 font-mono text-sm">
                        ${totalValue}M total
                      </span>
                      <span className="text-yellow-400 text-sm font-semibold">
                        {completeSets}/3 complete sets
                      </span>
                    </div>
                  </div>
                </div>

                {/* Property sets */}
                {player.properties.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">
                      Properties
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {player.properties.map((set, i) => (
                        <PropertySetDisplay
                          key={`${set.color}-${i}`}
                          set={set}
                          isYou={false}
                          isCurrentTurn={false}
                          useSocialistTheme={settings?.useSocialistTheme}
                          cardWidth={80}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Bank and Hand side by side */}
                <div className="flex gap-4 flex-wrap">
                  {/* Bank */}
                  {player.bank.length > 0 && (
                    <div>
                      <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">
                        Bank (${bankTotal}M)
                      </h3>
                      <div className="bg-white/5 rounded-lg p-3 inline-block">
                        <FannedCards
                          cards={[...player.bank].sort((a, b) => a.value - b.value)}
                          cardWidth={64}
                          maxVisible={12}
                          useSocialistTheme={settings?.useSocialistTheme}
                        />
                      </div>
                    </div>
                  )}

                  {/* Hand */}
                  {player.hand && player.hand.length > 0 && (
                    <div>
                      <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">
                        Hand ({player.hand.length} cards)
                      </h3>
                      <div className="bg-white/5 rounded-lg p-3 inline-block">
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
