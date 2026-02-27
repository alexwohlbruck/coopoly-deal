export interface ThemeColors {
  primary: string;
  primaryHover: string;
  secondary: string;
  secondaryHover: string;
  danger: string;
  dangerHover: string;
  tableBackground: string;
  cardBackground: string;
}

export const themes = {
  classic: {
    primary: "bg-blue-600",
    primaryHover: "hover:bg-blue-500",
    secondary: "bg-purple-600",
    secondaryHover: "hover:bg-purple-500",
    danger: "bg-red-600",
    dangerHover: "hover:bg-red-500",
    tableBackground: "bg-gradient-to-br from-emerald-950 via-green-900 to-emerald-950",
    cardBackground: "bg-emerald-700",
  },
  ocean: {
    primary: "bg-cyan-600",
    primaryHover: "hover:bg-cyan-500",
    secondary: "bg-indigo-600",
    secondaryHover: "hover:bg-indigo-500",
    danger: "bg-rose-600",
    dangerHover: "hover:bg-rose-500",
    tableBackground: "bg-gradient-to-br from-blue-950 via-cyan-900 to-blue-950",
    cardBackground: "bg-cyan-700",
  },
  sunset: {
    primary: "bg-orange-600",
    primaryHover: "hover:bg-orange-500",
    secondary: "bg-pink-600",
    secondaryHover: "hover:bg-pink-500",
    danger: "bg-red-600",
    dangerHover: "hover:bg-red-500",
    tableBackground: "bg-gradient-to-br from-purple-950 via-pink-900 to-orange-950",
    cardBackground: "bg-orange-700",
  },
  forest: {
    primary: "bg-emerald-600",
    primaryHover: "hover:bg-emerald-500",
    secondary: "bg-teal-600",
    secondaryHover: "hover:bg-teal-500",
    danger: "bg-red-600",
    dangerHover: "hover:bg-red-500",
    tableBackground: "bg-gradient-to-br from-emerald-950 via-green-900 to-emerald-950",
    cardBackground: "bg-emerald-700",
  },
  midnight: {
    primary: "bg-indigo-600",
    primaryHover: "hover:bg-indigo-500",
    secondary: "bg-violet-600",
    secondaryHover: "hover:bg-violet-500",
    danger: "bg-red-600",
    dangerHover: "hover:bg-red-500",
    tableBackground: "bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950",
    cardBackground: "bg-indigo-800",
  },
  ruby: {
    primary: "bg-rose-700",
    primaryHover: "hover:bg-rose-600",
    secondary: "bg-amber-600",
    secondaryHover: "hover:bg-amber-500",
    danger: "bg-red-700",
    dangerHover: "hover:bg-red-600",
    tableBackground: "bg-gradient-to-br from-red-950 via-rose-900 to-red-950",
    cardBackground: "bg-rose-800",
  },
  arctic: {
    primary: "bg-sky-600",
    primaryHover: "hover:bg-sky-500",
    secondary: "bg-blue-600",
    secondaryHover: "hover:bg-blue-500",
    danger: "bg-red-600",
    dangerHover: "hover:bg-red-500",
    tableBackground: "bg-gradient-to-br from-slate-950 via-sky-950 to-slate-950",
    cardBackground: "bg-sky-800",
  },
  desert: {
    primary: "bg-amber-700",
    primaryHover: "hover:bg-amber-600",
    secondary: "bg-orange-700",
    secondaryHover: "hover:bg-orange-600",
    danger: "bg-red-700",
    dangerHover: "hover:bg-red-600",
    tableBackground: "bg-gradient-to-br from-amber-950 via-orange-900 to-amber-950",
    cardBackground: "bg-amber-800",
  },
  neon: {
    primary: "bg-fuchsia-600",
    primaryHover: "hover:bg-fuchsia-500",
    secondary: "bg-cyan-600",
    secondaryHover: "hover:bg-cyan-500",
    danger: "bg-pink-600",
    dangerHover: "hover:bg-pink-500",
    tableBackground: "bg-gradient-to-br from-purple-950 via-fuchsia-950 to-cyan-950",
    cardBackground: "bg-fuchsia-800",
  },
  royal: {
    primary: "bg-purple-700",
    primaryHover: "hover:bg-purple-600",
    secondary: "bg-yellow-600",
    secondaryHover: "hover:bg-yellow-500",
    danger: "bg-red-600",
    dangerHover: "hover:bg-red-500",
    tableBackground: "bg-gradient-to-br from-purple-950 via-violet-900 to-purple-950",
    cardBackground: "bg-purple-800",
  },
} as const;

export type ThemeName = keyof typeof themes;

export function getTheme(themeName: ThemeName = "classic"): ThemeColors {
  return themes[themeName];
}
