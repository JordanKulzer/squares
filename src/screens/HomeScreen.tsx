import React from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();

  const navigateToSquareCreation = () => {
    navigation.navigate("CreateNewSquareScreen");
  };

  return (
    <View style={[styles.container]}>
      <TouchableOpacity
        style={styles.button}
        onPress={navigateToSquareCreation}
      >
        <Text style={[styles.buttonText]}>Create a new square</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={navigateToSquareCreation}
      >
        <Text style={[styles.buttonText]}>Join a friends</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={navigateToSquareCreation}
      >
        <Text style={[styles.buttonText]}>Join random</Text>
      </TouchableOpacity>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#a5a58d",
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#6b705c",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginVertical: 10,
    width: "75%",
  },
  buttonText: {
    color: "#ffe8d6",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
  },
});
