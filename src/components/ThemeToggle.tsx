import React from "react";
import { Switch, useTheme } from "react-native-paper";

const ThemeToggle = ({ isDarkTheme, toggleTheme }) => {
  const theme = useTheme();

  return (
    <Switch
      value={isDarkTheme}
      onValueChange={toggleTheme}
      thumbColor={theme.colors.surface}
    />
  );
};

export default ThemeToggle;
