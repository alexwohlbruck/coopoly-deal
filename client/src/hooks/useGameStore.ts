import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ClientGameState } from "../types/game";
import type { ThemeName } from "../theme/colors";

interface GameStore {
  playerId: string | null;
  playerName: string | null;
  roomCode: string | null;
  gameState: ClientGameState | null;
  error: string | null;
  toast: string | null;
  sessionStats: {
    wins: number;
    losses: number;
    streak: number;
    gamesPlayed: number;
  };
  theme: ThemeName;

  setPlayer: (id: string, name: string) => void;
  setRoomCode: (code: string) => void;
  setGameState: (state: ClientGameState) => void;
  setError: (error: string | null) => void;
  setToast: (toast: string | null) => void;
  recordWin: () => void;
  recordLoss: () => void;
  setTheme: (theme: ThemeName) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      playerId: null,
      playerName: null,
      roomCode: null,
      gameState: null,
      error: null,
      toast: null,
      sessionStats: {
        wins: 0,
        losses: 0,
        streak: 0,
        gamesPlayed: 0,
      },
      theme: "classic",

      setPlayer: (id, name) => set({ playerId: id, playerName: name }),
      setRoomCode: (code) => set({ roomCode: code }),
      setGameState: (state) => set({ gameState: state }),
      setError: (error) => set({ error }),
      setToast: (toast) => set({ toast }),
      setTheme: (theme) => set({ theme }),
      recordWin: () =>
        set((state) => ({
          sessionStats: {
            ...state.sessionStats,
            wins: state.sessionStats.wins + 1,
            streak: state.sessionStats.streak + 1,
            gamesPlayed: state.sessionStats.gamesPlayed + 1,
          },
        })),
      recordLoss: () =>
        set((state) => ({
          sessionStats: {
            ...state.sessionStats,
            losses: state.sessionStats.losses + 1,
            streak: 0,
            gamesPlayed: state.sessionStats.gamesPlayed + 1,
          },
        })),
      reset: () =>
        set({
          playerId: null,
          playerName: null,
          roomCode: null,
          gameState: null,
          error: null,
          toast: null,
        }),
    }),
    {
      name: "coopoly-settings",
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
