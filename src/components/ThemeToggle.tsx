import React from "react";
import { Switch } from "react-native-paper";

const ThemeToggle = ({ isDarkTheme, toggleTheme }) => {
  return <Switch value={isDarkTheme} onValueChange={toggleTheme} />;
};

export default ThemeToggle;
