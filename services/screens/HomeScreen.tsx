import React from "react";
import { View, StyleSheet, TouchableOpacity, Text, Button } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { createSession } from "../../services/sessionService";

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();

  const navigateToSquareCreation = () => {
    navigation.navigate("CreateSquareScreen");
  };

  const handleCreateSession = async () => {
    const sessionId = await createSession("My First Session");
    if (sessionId) {
      console.log("Session successfully created with ID:", sessionId);
    }
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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Welcome to the Session App!</Text>
        <Button title="Create Session" onPress={handleCreateSession} />
      </View>
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
