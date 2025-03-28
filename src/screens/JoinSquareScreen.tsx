import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";

const JoinSquareScreen = () => {
  const [gridId, setGridId] = useState("");
  const [username, setUsername] = useState("");
  const navigation = useNavigation();

  const submit = () => {
    navigation.navigate("SquareScreen");
  };

  const joinGrid = async () => {
    if (!gridId || !username) {
      Alert.alert(
        "Missing Fields",
        "Please enter both a Grid ID and a username."
      );
      return;
    }

    try {
      const docRef = doc(db, "grids", gridId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        navigation.navigate("NewSquareScreen", {
          gridId,
          inputTitle: data.title,
          username: username, // the user joining
          numPlayers: data.numPlayers || null,
          team1: data.team1,
          team2: data.team2,
          gridSize: data.size,
          selections: data.selections || [],
        });
      } else {
        Alert.alert("Error", "Grid not found.");
      }
    } catch (error) {
      console.error("Error joining grid:", error);
      Alert.alert("Error", "Something went wrong when trying to join.");
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.textInput}
        onChangeText={setGridId}
        value={gridId}
        placeholder="Enter grid id"
        placeholderTextColor="#ffe8d6"
      />
      <TextInput
        style={styles.textInput}
        value={username}
        onChangeText={setUsername}
        placeholder="Enter your Username"
        placeholderTextColor="#ffe8d6"
      />
      <TouchableOpacity style={styles.submitButton}>
        <Text style={styles.submitText} onPress={submit}>
          ENTER!
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default JoinSquareScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#a5a58d",
    justifyContent: "center",
    alignItems: "center",
  },
  textInput: {
    height: 40,
    width: "50%",
    borderColor: "#ffe8d6",
    borderWidth: 1,
    borderRadius: 5,
    paddingLeft: 10,
    marginBottom: 20,
  },
  submitText: {
    color: "#ffe8d6",
  },
  submitButton: {
    backgroundColor: "#6b705c",
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
  },
});
