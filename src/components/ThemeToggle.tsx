import React from "react";
import { Chip, useTheme } from "react-native-paper";

const ThemeToggle = ({ isDarkTheme, toggleTheme }) => {
  const theme = useTheme();

  return (
    <Chip
      mode="outlined"
      selected={isDarkTheme}
      onPress={toggleTheme}
      style={{
        backgroundColor: isDarkTheme
          ? theme.colors.primary
          : theme.dark
          ? "#2a2a2a"
          : "#f0f0f0",
        borderColor: isDarkTheme
          ? theme.colors.primary
          : theme.colors.outlineVariant,
      }}
      textStyle={{
        color: isDarkTheme ? "#fff" : theme.colors.onSurface,
        fontWeight: "600",
      }}
    >
      {isDarkTheme ? "On" : "Off"}
    </Chip>
  );
};

export default ThemeToggle;
