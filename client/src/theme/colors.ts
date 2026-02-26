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
} as const;

export type ThemeName = keyof typeof themes;

export function getTheme(themeName: ThemeName = "classic"): ThemeColors {
  return themes[themeName];
}
