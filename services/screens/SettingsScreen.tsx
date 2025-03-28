import { StyleSheet, Text, View } from "react-native";
import React from "react";

const SettingsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>SETTINGS!</Text>
    </View>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#a5a58d",
  },
  text: {
    color: "#ffe8d6",
  },
});
