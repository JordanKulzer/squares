// src/assets/constants/CustomTheme.ts
import type { MD3Theme } from "react-native-paper";

export interface CustomTheme extends MD3Theme {
  custom: {
    card: string;
    cardBorder: string;
    highlight: string;
  };
}
