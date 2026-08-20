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

/** Hide the socialist theme toggle on the canonical Monopoly Deal domain. */
export const isMonopolyDealDomain =
  typeof window !== "undefined" &&
  (window.location.hostname === "monopolydeal.online" ||
    window.location.hostname.endsWith(".monopolydeal.online"));

interface GameStore {
  playerId: string | null;
  playerName: string | null;
  roomCode: string | null;
  gameState: ClientGameState | null;
  /** True while watching a public game we aren't playing in. */
  isSpectating: boolean;
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
  /** Whether the creator's last game was listed publicly. */
  preferredIsPublic: boolean;

  setPlayer: (id: string, name: string) => void;
  setPlayerName: (name: string) => void;
  setRoomCode: (code: string) => void;
  setGameState: (state: ClientGameState) => void;
  setSpectating: (spectating: boolean) => void;
  setError: (error: string | null) => void;
  setToast: (toast: string | null) => void;
  recordWin: () => void;
  recordLoss: () => void;
  setTheme: (theme: ThemeName) => void;
  setUseSocialistTheme: (enabled: boolean) => void;
  setPreferredSettings: (settings: GameSettings) => void;
  setPreferredIsPublic: (isPublic: boolean) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      playerId: null,
      playerName: null,
      roomCode: null,
      gameState: null,
      isSpectating: false,
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
      preferredIsPublic: false,

      setPlayer: (id, name) => set({ playerId: id, playerName: name }),
      setPlayerName: (name) => set({ playerName: name }),
      setRoomCode: (code) => set({ roomCode: code }),
      setGameState: (state) => set({ gameState: state }),
      setSpectating: (spectating) => set({ isSpectating: spectating }),
      setError: (error) => set({ error }),
      setToast: (toast) => set({ toast }),
      setTheme: (theme) => set({ theme }),
      setUseSocialistTheme: (enabled) =>
        set({
          // On monopolydeal.online the socialist theme is always off
          useSocialistTheme: isMonopolyDealDomain ? false : enabled,
          // Auto-switch to the soviet theme when turning on
          ...(enabled && !isMonopolyDealDomain
            ? { theme: "soviet" as ThemeName }
            : {}),
        }),
      setPreferredSettings: (settings) => set({ preferredSettings: settings }),
      setPreferredIsPublic: (isPublic) => set({ preferredIsPublic: isPublic }),
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
          isSpectating: false,
          error: null,
          toast: null,
        }),
    }),
    {
      name: "coopoly-settings",
      // Migrate removed themes (e.g. "burgundy") → default on rehydrate.
      // Force socialist theme off on monopolydeal.online even if persisted.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<GameStore>;
        const theme =
          p.theme && p.theme in themes ? p.theme : current.theme;
        const merged = { ...current, ...p, theme } as GameStore;
        if (isMonopolyDealDomain) {
          merged.useSocialistTheme = false;
        }
        return merged;
      },
      partialize: (state) => ({
        theme: state.theme,
        useSocialistTheme: state.useSocialistTheme,
        playerId: state.playerId,
        playerName: state.playerName,
        roomCode: state.roomCode,
        preferredSettings: state.preferredSettings,
        preferredIsPublic: state.preferredIsPublic,
        sessionStats: state.sessionStats,
      }),
    },
  ),
);
