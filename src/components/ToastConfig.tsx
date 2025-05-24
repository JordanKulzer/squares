import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { BaseToast, ErrorToast } from "react-native-toast-message";

export const toastConfig = {
  info: (props) => (
    <BaseToast
      {...props}
      style={styles.toastContainer}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={[styles.toastContainer, { borderLeftColor: "red" }]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text}
    />
  ),
};

const styles = StyleSheet.create({
  toastContainer: {
    borderLeftColor: "#007AFF",
    borderLeftWidth: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  contentContainer: {
    paddingHorizontal: 0,
  },
  text: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
});
