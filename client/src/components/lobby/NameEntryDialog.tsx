import { useState } from "react";
import { motion } from "framer-motion";

interface NameEntryDialogProps {
  roomCode: string;
  onSubmit: (name: string) => void;
  onBack: () => void;
}

export function NameEntryDialog({ roomCode, onSubmit, onBack }: NameEntryDialogProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-800 to-emerald-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <button
            onClick={onBack}
            className="text-emerald-300 hover:text-white text-sm transition-colors mb-4"
          >
            &larr; Back
          </button>
          <h2 className="text-xl font-bold text-white mb-1">Joining Room</h2>
          <p className="text-2xl font-mono text-emerald-300 tracking-[0.3em] mb-6">
            {roomCode}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-emerald-200 text-sm font-medium mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-bold rounded-xl text-lg transition-colors shadow-lg"
            >
              Join Game
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
