import { useState } from "react";
import { motion } from "framer-motion";
import { X, BookOpen } from "lucide-react";
import type { ClientGameState } from "../../types/game";
import { MusicControls } from "../common/MusicControls";
import { GameRulesModal } from "../common/GameRulesModal";
import {
  GameSettingsPanel,
  DEFAULT_GAME_SETTINGS,
  type GameSettings,
} from "./GameSettingsPanel";

interface WaitingRoomProps {
  gameState: ClientGameState;
  playerId: string;
  onStartGame: (settings?: GameSettings) => void;
  onAddBot: () => void;
  onRemovePlayer?: (playerIdToRemove: string) => void;
  musicControls?: {
    isPlaying: boolean;
    onToggle: () => void;
    onNext: () => void;
  };
}

export function WaitingRoom({
  gameState,
  playerId,
  onStartGame,
  onAddBot,
  onRemovePlayer,
  musicControls,
}: WaitingRoomProps) {
  const [showRules, setShowRules] = useState(false);
  const [gameSettings, setGameSettings] = useState<GameSettings>(
    DEFAULT_GAME_SETTINGS,
  );
  const isHost = gameState.players[0]?.id === playerId;
  const canStart = gameState.players.length >= 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-800 to-emerald-950 flex items-center justify-center p-4">
      {/* Music controls in top right */}
      {musicControls && (
        <div className="fixed top-4 right-4 z-50">
          <MusicControls
            isPlaying={musicControls.isPlaying}
            onToggle={musicControls.onToggle}
            onNext={musicControls.onNext}
          />
        </div>
      )}

      {/* Rules button in top left */}
      <button
        onClick={() => setShowRules(true)}
        className="fixed top-4 left-4 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-lg text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border border-white/20"
      >
        <BookOpen className="w-4 h-4" />
        <span className="font-semibold">Rules</span>
      </button>

      <GameRulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-4"
      >
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-white mb-1">Waiting Room</h1>
          <div className="inline-block bg-white/10 backdrop-blur rounded-lg px-6 py-2 border border-white/20">
            <span className="text-emerald-300 text-sm">Room Code</span>
            <p className="text-3xl font-mono font-bold text-white tracking-[0.3em]">
              {gameState.id}
            </p>
          </div>
        </div>

        <div className="space-y-4 gap-2">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
            <h3 className="text-emerald-200 text-sm font-medium mb-3">
              Players ({gameState.players.length}/6)
            </h3>
            <div className="space-y-2">
              {gameState.players.map((player, i) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-3"
                >
                  <div
                    className={`w-8 h-8 rounded-full ${player.isBot ? "bg-blue-500" : "bg-emerald-500"} flex items-center justify-center text-white font-bold text-sm`}
                  >
                    {player.isBot ? "B" : player.name[0]?.toUpperCase()}
                  </div>
                  <span className="text-white font-medium">{player.name}</span>
                  {player.isBot && (
                    <span className="text-blue-400 text-xs">CPU</span>
                  )}
                  {player.id === playerId && (
                    <span className="text-emerald-400 text-xs ml-auto">
                      (you)
                    </span>
                  )}
                  {i === 0 && !player.isBot && (
                    <span className="text-yellow-400 text-xs ml-auto">
                      Host
                    </span>
                  )}
                  {isHost && i > 0 && onRemovePlayer && (
                    <button
                      onClick={() => onRemovePlayer(player.id)}
                      className="ml-auto p-1 hover:bg-red-500/20 rounded transition-colors text-red-400 hover:text-red-300"
                      title="Remove player"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <GameSettingsPanel
          isHost={isHost}
          settings={gameSettings}
          onSettingsChange={setGameSettings}
        />

        {isHost ? (
          <div className="flex gap-3">
            <button
              onClick={onAddBot}
              disabled={gameState.players.length >= 6}
              className="flex-1 py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-bold rounded-xl text-lg transition-colors shadow-lg"
            >
              + Add Bot
            </button>
            <button
              onClick={() => onStartGame(gameSettings)}
              disabled={!canStart}
              className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-bold rounded-xl text-lg transition-colors shadow-lg"
            >
              {canStart ? "Start Game" : "Waiting for players..."}
            </button>
          </div>
        ) : (
          <p className="text-center text-emerald-300 text-sm">
            Waiting for the host to start the game...
          </p>
        )}
      </motion.div>
    </div>
  );
}
