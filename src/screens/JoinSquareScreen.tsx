import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { doc, getDoc, setDoc, arrayUnion } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";

const JoinSquareScreen = () => {
  const [gridId, setGridId] = useState("");
  const [username, setUsername] = useState("");
  const navigation = useNavigation();
  const user = auth.currentUser;

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

        // Join square logic
        await setDoc(
          squareRef,
          {
            players: arrayUnion({ userId: user.uid, username }),
            playerIds: arrayUnion(user.uid),
          },
          { merge: true }
        );

        // Navigate to the SquareScreen and pass the relevant data
        navigation.navigate("SquareScreen", {
          gridId,
          inputTitle: data.title,
          username,
          team1: data.team1,
          team2: data.team2,
          deadline: data.deadline,
          // gridSize: data.gridSize,
          disableAnimation: true,
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

export default JoinSquareScreen;
