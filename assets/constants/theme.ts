// src/assets/constants/theme.ts
import { MD3LightTheme, MD3DarkTheme } from "react-native-paper";
import type { CustomTheme } from "./CustomTheme";

export const LightTheme: CustomTheme = {
  ...MD3LightTheme,
  isV3: true,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#5e60ce",
    background: "#ffffff",
    surface: "#f5f5f5",
    onBackground: "#000000",
    onSurface: "#333333",
  },
  custom: {
    card: "#eaeaea",
    cardBorder: "#cccccc",
    highlight: "#ffd166",
  },
};

export const DarkTheme: CustomTheme = {
  ...MD3DarkTheme,
  isV3: true,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#5e60ce",
    background: "#121212",
    surface: "#1e1e1e",
    onBackground: "#ffffff",
    onSurface: "#dddddd",
  },
  custom: {
    card: "#2a2a2a",
    cardBorder: "#444444",
    highlight: "#f4c430",
  },
};
