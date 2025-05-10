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
import { getAuth } from "firebase/auth";
import {
  arrayUnion,
  doc,
  getDoc,
  getFirestore,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";

const JoinSquareScreen = () => {
  const [gridId, setGridId] = useState("");
  const [username, setUsername] = useState("");
  const navigation = useNavigation();

  //const auth = getAuth(); // Get Firebase Auth instance
  const user = auth.currentUser; // Get the currently signed-in user
  const db = getFirestore();

  const saveUserSquare = async (userId, squareId) => {
    try {
      console.log("Saving square for user:", userId, "Square ID:", squareId); // Debugging
      const userRef = doc(db, "users", userId);
      await setDoc(
        userRef,
        {
          squares: arrayUnion(squareId),
        },
        { merge: true }
      );

      console.log("Square successfully saved!");
    } catch (err) {
      console.error("Error saving square:", err);
    }
  };

  const joinSquare = async () => {
    if (!gridId || !username) {
      Alert.alert(
        "Missing Fields",
        "Please enter both a Grid ID and a username."
      );
      return;
    }

    if (!user) {
      Alert.alert("Error", "User is not authenticated. Please log in.");
      return;
    }

    try {
      const squareRef = doc(db, "squares", gridId);
      const squareSnap = await getDoc(squareRef);

      if (squareSnap.exists()) {
        const data = squareSnap.data();
        console.log("Square data:", data); // Debugging

        // Add user to players array in square
        await setDoc(
          squareRef,
          {
            players: arrayUnion({ userId: user.uid, username }),
            playerIds: arrayUnion(user.uid), // Add user ID to playerIds array
          },
          { merge: true }
        );

        saveUserSquare(user.uid, gridId); // Save square to user

        navigation.navigate("SquareScreen", {
          gridId,
          inputTitle: data.title,
          username,
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
      <TouchableOpacity style={styles.submitButton} onPress={joinSquare}>
        <Text style={styles.submitText}>ENTER!</Text>
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
