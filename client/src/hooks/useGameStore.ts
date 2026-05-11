import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type ClientGameState,
  type GameSettings,
  DEFAULT_SETTINGS as DEFAULT_GAME_SETTINGS,
} from "../types/game";
import { themes, type ThemeName } from "../theme/colors";

/** Default to dialectical mode on the coopoly.deal domain. */
const isCoopolyDomain =
  typeof window !== "undefined" &&
  (window.location.hostname === "coopoly.deal" ||
    window.location.hostname.endsWith(".coopoly.deal"));

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
  useSocialistTheme: boolean;
  preferredSettings: GameSettings;

  setPlayer: (id: string, name: string) => void;
  setRoomCode: (code: string) => void;
  setGameState: (state: ClientGameState) => void;
  setError: (error: string | null) => void;
  setToast: (toast: string | null) => void;
  recordWin: () => void;
  recordLoss: () => void;
  setTheme: (theme: ThemeName) => void;
  setUseSocialistTheme: (enabled: boolean) => void;
  setPreferredSettings: (settings: GameSettings) => void;
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
      theme: isCoopolyDomain ? ("soviet" as ThemeName) : ("emerald" as ThemeName),
      useSocialistTheme: isCoopolyDomain,
      preferredSettings: DEFAULT_GAME_SETTINGS,

      setPlayer: (id, name) => set({ playerId: id, playerName: name }),
      setRoomCode: (code) => set({ roomCode: code }),
      setGameState: (state) => set({ gameState: state }),
      setError: (error) => set({ error }),
      setToast: (toast) => set({ toast }),
      setTheme: (theme) => set({ theme }),
      setUseSocialistTheme: (enabled) =>
        set({
          useSocialistTheme: enabled,
          // Auto-switch to the soviet theme when turning on
          ...(enabled ? { theme: "soviet" as ThemeName } : {}),
        }),
      setPreferredSettings: (settings) => set({ preferredSettings: settings }),
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
          roomCode: null,
          gameState: null,
          error: null,
          toast: null,
        }),
    }),
    {
      name: "coopoly-settings",
      // Migrate removed themes (e.g. "burgundy") → default on rehydrate.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<GameStore>;
        const theme =
          p.theme && p.theme in themes ? p.theme : current.theme;
        return { ...current, ...p, theme } as GameStore;
      },
      partialize: (state) => ({
        theme: state.theme,
        useSocialistTheme: state.useSocialistTheme,
        playerId: state.playerId,
        playerName: state.playerName,
        roomCode: state.roomCode,
        preferredSettings: state.preferredSettings,
        sessionStats: state.sessionStats,
      }),
    },
  ),
);
