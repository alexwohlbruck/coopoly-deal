/**
 * Felt themes — each theme is a 3-token surface (felt + frame + accent).
 * The .felt-{id} class on a root element cascades these as CSS variables
 * (see index.css). Components consume them via var(--felt), var(--accent),
 * etc.; or read this object directly for non-CSS use.
 */

export interface FeltTheme {
  /** Stable id, also the suffix for the .felt-{id} CSS class. */
  id: string;
  /** Display name. */
  name: string;
  /** ClassName to apply to the root element (e.g. "felt-emerald"). */
  feltClass: `felt-${string}`;
  /** Top-of-table felt color (radial-gradient inner). */
  felt: string;
  /** Vignette/edge felt color (radial-gradient outer). */
  felt2: string;
  /** Inner leather/wood frame color. */
  frame: string;
  /** Frame shadow color. */
  frame2: string;
  /** Accent color — turn ring, primary button, complete-set glow. */
  accent: string;
}

export const themes = {
  emerald: {
    id: "emerald",
    name: "Emerald",
    feltClass: "felt-emerald",
    felt: "#1c4634",
    felt2: "#0e2a1f",
    frame: "#2a1810",
    frame2: "#1a0e08",
    accent: "#f0c14a",
  },
  teal: {
    id: "teal",
    name: "Teal",
    feltClass: "felt-teal",
    felt: "#0e5a6e",
    felt2: "#042830",
    frame: "#1a0f0a",
    frame2: "#0c0805",
    accent: "#5ee0d8",
  },
  burgundy: {
    id: "burgundy",
    name: "Burgundy",
    feltClass: "felt-burgundy",
    felt: "#6a1e2a",
    felt2: "#320d12",
    frame: "#1a0a05",
    frame2: "#0a0402",
    accent: "#ffb070",
  },
  midnight: {
    id: "midnight",
    name: "Midnight",
    feltClass: "felt-midnight",
    felt: "#1a2c5a",
    felt2: "#0a1530",
    frame: "#14100a",
    frame2: "#08060a",
    accent: "#ffc14a",
  },
  forest: {
    id: "forest",
    name: "Forest",
    feltClass: "felt-forest",
    felt: "#1f4a28",
    felt2: "#0a2010",
    frame: "#1f1408",
    frame2: "#0e0904",
    accent: "#c8f078",
  },
  amber: {
    id: "amber",
    name: "Amber",
    feltClass: "felt-amber",
    felt: "#7a4818",
    felt2: "#361e06",
    frame: "#1a0e04",
    frame2: "#0c0602",
    accent: "#ffe080",
  },
  slate: {
    id: "slate",
    name: "Slate",
    feltClass: "felt-slate",
    felt: "#2c3540",
    felt2: "#131820",
    frame: "#0e0c0a",
    frame2: "#050404",
    accent: "#88d4ff",
  },
  plum: {
    id: "plum",
    name: "Plum",
    feltClass: "felt-plum",
    felt: "#4a1a58",
    felt2: "#200a28",
    frame: "#16080e",
    frame2: "#08040a",
    accent: "#ff7ae0",
  },
  indigo: {
    id: "indigo",
    name: "Indigo",
    feltClass: "felt-indigo",
    felt: "#2624a8",
    felt2: "#0e0c40",
    frame: "#100a14",
    frame2: "#06040a",
    accent: "#b8a8ff",
  },
  graphite: {
    id: "graphite",
    name: "Graphite",
    feltClass: "felt-graphite",
    felt: "#2a2a2c",
    felt2: "#131314",
    frame: "#0a0a0a",
    frame2: "#050505",
    accent: "#f0c14a",
  },
} as const satisfies Record<string, FeltTheme>;

export type ThemeName = keyof typeof themes;

export const THEME_IDS: readonly ThemeName[] = [
  "emerald",
  "teal",
  "burgundy",
  "midnight",
  "forest",
  "amber",
  "slate",
  "plum",
  "indigo",
  "graphite",
];

export const DEFAULT_THEME: ThemeName = "emerald";

export function getTheme(themeName: ThemeName = DEFAULT_THEME): FeltTheme {
  return themes[themeName] ?? themes[DEFAULT_THEME];
}
