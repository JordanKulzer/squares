// toastConfig.tsx
import React from "react";
import { StyleSheet } from "react-native";
import { BaseToast, ErrorToast } from "react-native-toast-message";
import colors from "../../assets/constants/colorOptions";

export const getToastConfig = (isDarkMode: boolean) => {
  const backgroundColor = isDarkMode ? "#1e1e1e" : "#fff";
  const textColor = isDarkMode ? "#eee" : "#333";
  const borderLeftColor = isDarkMode ? "#7f81ff" : colors.primary;
  const errorColor = "#ff4d4f";

  return {
    info: (props) => (
      <BaseToast
        {...props}
        style={[
          styles.toastContainer,
          {
            backgroundColor,
            borderLeftColor,
            borderColor: "rgba(94, 96, 206, 0.4)",
          },
        ]}
        contentContainerStyle={styles.contentContainer}
        text1Style={[styles.text, { color: textColor }]}
      />
    ),
    error: (props) => (
      <ErrorToast
        {...props}
        style={[
          styles.toastContainer,
          {
            backgroundColor,
            borderLeftColor: errorColor,
            borderColor: `${errorColor}66`,
          },
        ]}
        contentContainerStyle={styles.contentContainer}
        text1Style={[styles.text, { color: textColor }]}
      />
    ),
  };
};

const styles = StyleSheet.create({
  toastContainer: {
    marginHorizontal: 8,
    borderRadius: 16,
    borderLeftWidth: 5,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  contentContainer: {
    paddingHorizontal: 0,
  },
  text: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Sora",
  },
});
