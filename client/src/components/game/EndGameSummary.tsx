import { motion } from "framer-motion";
import type { ClientPlayer } from "../../types/game";
import { isSetComplete } from "../../types/game";
import { GameCard } from "../cards/GameCard";
import { PlayerArea } from "./PlayerArea";

interface EndGameSummaryProps {
  players: ClientPlayer[];
  winnerId: string | null;
  currentPlayerId: string;
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
  sessionStats,
  onRematch,
  onGoHome,
}: EndGameSummaryProps) {
  const winner = players.find((p) => p.id === winnerId);
  const sortedPlayers = [...players].sort((a, b) => {
    // Winner first
    if (a.id === winnerId) return -1;
    if (b.id === winnerId) return 1;
    // Then by complete sets
    const aSets = a.properties.filter(isSetComplete).length;
    const bSets = b.properties.filter(isSetComplete).length;
    if (aSets !== bSets) return bSets - aSets;
    // Then by total value
    const aValue = a.bank.reduce((sum, c) => sum + c.value, 0) +
      a.properties.flatMap(s => s.cards).reduce((sum, c) => sum + c.value, 0);
    const bValue = b.bank.reduce((sum, c) => sum + c.value, 0) +
      b.properties.flatMap(s => s.cards).reduce((sum, c) => sum + c.value, 0);
    return bValue - aValue;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-800 to-emerald-950 overflow-y-auto">
      <div className="container mx-auto px-4 py-8">
        {/* Winner announcement */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-black text-yellow-400 mb-4">
            {winner?.id === currentPlayerId ? "You Win!" : `${winner?.name} Wins!`}
          </h1>
          <p className="text-emerald-300 text-lg mb-4">
            {winner?.name} collected 3 complete property sets!
          </p>

          {sessionStats && (
            <div className="flex gap-6 justify-center mb-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{sessionStats.wins}</p>
                <p className="text-emerald-400 text-sm">Wins</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{sessionStats.losses}</p>
                <p className="text-red-400 text-sm">Losses</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{sessionStats.streak}</p>
                <p className="text-yellow-400 text-sm">Streak</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Final standings */}
        <div className="max-w-5xl mx-auto space-y-6 mb-8">
          <h2 className="text-2xl font-bold text-white text-center mb-4">Final Standings</h2>
          
          {sortedPlayers.map((player, index) => {
            const bankTotal = player.bank.reduce((sum, c) => sum + c.value, 0);
            const propertyTotal = player.properties.flatMap(s => s.cards).reduce((sum, c) => sum + c.value, 0);
            const totalValue = bankTotal + propertyTotal;
            const completeSets = player.properties.filter(isSetComplete).length;
            const isWinner = player.id === winnerId;

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 ${
                  isWinner ? "border-yellow-400" : "border-white/20"
                }`}
              >
                {/* Player header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                      isWinner ? "bg-yellow-500" : "bg-emerald-600"
                    }`}>
                      {player.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">
                        {player.name}
                        {player.id === currentPlayerId && <span className="text-emerald-400 text-sm ml-2">(you)</span>}
                        {isWinner && <span className="text-yellow-400 text-sm ml-2">👑 Winner</span>}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {completeSets}/3 complete sets • ${totalValue}M total value
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-white">{index + 1}</p>
                    <p className="text-gray-400 text-xs">Place</p>
                  </div>
                </div>

                {/* Properties */}
                {player.properties.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-emerald-300 text-sm font-semibold mb-2">Properties</h4>
                    <div className="bg-black/30 rounded-lg p-3">
                      <PlayerArea
                        player={player}
                        isCurrentTurn={false}
                        isYou={player.id === currentPlayerId}
                      />
                    </div>
                  </div>
                )}

                {/* Bank */}
                {player.bank.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-emerald-300 text-sm font-semibold mb-2">
                      Bank (${bankTotal}M)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {player.bank.map((card) => (
                        <GameCard key={card.id} card={card} small />
                      ))}
                    </div>
                  </div>
                )}

                {/* Hand (cards left) */}
                {player.hand && player.hand.length > 0 && (
                  <div>
                    <h4 className="text-emerald-300 text-sm font-semibold mb-2">
                      Hand ({player.hand.length} cards)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {player.hand.map((card) => (
                        <GameCard key={card.id} card={card} small />
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 justify-center pb-8">
          {onRematch && (
            <button
              onClick={onRematch}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors text-lg"
            >
              Rematch
            </button>
          )}
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors text-lg"
            >
              Leave
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
