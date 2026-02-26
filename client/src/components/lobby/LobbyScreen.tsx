import { useState } from "react";
import { motion } from "framer-motion";
import { MusicControls } from "../common/MusicControls";

interface LobbyScreenProps {
  onCreateRoom: () => void;
  onJoinRoom: (code: string, name: string) => void;
  musicControls?: {
    isPlaying: boolean;
    onToggle: () => void;
    onNext: () => void;
  };
}

export function LobbyScreen({ onCreateRoom, onJoinRoom, musicControls }: LobbyScreenProps) {
  const [mode, setMode] = useState<"menu" | "join">("menu");
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim() && playerName.trim()) {
      onJoinRoom(roomCode.trim(), playerName.trim());
    }
  };

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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-white tracking-tight mb-2">
            Co-Opoly
          </h1>
          <h2 className="text-2xl font-bold text-emerald-300">Deal</h2>
          <p className="text-emerald-400 mt-2 text-sm">
            Seize the means of property collection
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          {mode === "menu" ? (
            <div className="space-y-4">
              <button
                onClick={() => {
                  onCreateRoom();
                }}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-lg transition-colors shadow-lg"
              >
                Create Room
              </button>
              <button
                onClick={() => setMode("join")}
                className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-lg transition-colors shadow-lg"
              >
                Join Room
              </button>
            </div>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <button
                type="button"
                onClick={() => setMode("menu")}
                className="text-emerald-300 hover:text-white text-sm transition-colors"
              >
                &larr; Back
              </button>
              <div>
                <label className="block text-emerald-200 text-sm font-medium mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-emerald-200 text-sm font-medium mb-1">
                  Room Code
                </label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-center text-2xl tracking-[0.5em] font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={roomCode.length < 6 || !playerName.trim()}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-bold rounded-xl text-lg transition-colors shadow-lg"
              >
                Join Game
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
