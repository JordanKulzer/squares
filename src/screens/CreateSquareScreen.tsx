import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker"; // Import DateTimePicker
import { addDoc, collection } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { auth } from "../../firebaseConfig"; // instead of getAuth()

const CreateSquareScreen = ({ navigation }) => {
  const [inputTitle, setInputTitle] = useState("");
  const [username, setUsername] = useState("");
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [deadline, setDeadline] = useState(new Date()); // Default to current date

  // Handle date change from DateTimePicker
  const onDateChange = (event, selectedDate) => {
    if (selectedDate) {
      setDeadline(selectedDate); // Update state with selected date
    }
  };

  // Create the Square session
  const createSquareSession = async () => {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found.");
      return;
    }

    try {
      const squareRef = await addDoc(collection(db, "squares"), {
        title: inputTitle,
        username,
        team1,
        team2,
        deadline,
        createdBy: user.uid,
        players: [{ userId: user.uid, username }], // Store player data
        playerIds: [user.uid],
        selections: [], // empty selections initially
      });

      console.log("Grid created with ID:", squareRef.id);
      navigation.navigate("SquareScreen", {
        gridId: squareRef.id,
        inputTitle,
        username,
        team1,
        team2,
        deadline,
      });
    } catch (error) {
      console.error("Error creating grid:", error);
    }
  };

  const cancel = () => {
    navigation.navigate("HomeDrawer");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Create a New Square</Text>

        <TextInput
          style={styles.input}
          onChangeText={setInputTitle}
          value={inputTitle}
          placeholder="Enter the name of your Square"
          placeholderTextColor="#888"
        />

        <TextInput
          style={styles.input}
          onChangeText={setUsername}
          value={username}
          placeholder="Enter your username"
          placeholderTextColor="#888"
        />

        <TextInput
          style={styles.input}
          onChangeText={setTeam1}
          value={team1}
          placeholder="Enter Team 1"
          placeholderTextColor="#888"
        />

        <TextInput
          style={styles.input}
          onChangeText={setTeam2}
          value={team2}
          placeholder="Enter Team 2"
          placeholderTextColor="#888"
        />

        <View style={styles.dateContainer}>
          <Text style={styles.dateLabel}>Deadline:</Text>
          <DateTimePicker
            value={deadline}
            mode="datetime" // You can change it to "time" or "datetime" if needed
            display="default"
            onChange={onDateChange}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={cancel} style={styles.cancelButton}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={createSquareSession}
            style={styles.saveButton}
          >
            <Text style={styles.buttonText}>Create Square</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f4f4",
    justifyContent: "center",
    alignItems: "center",
  },
  formContainer: {
    width: "90%",
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    height: 50,
    width: "100%",
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 20,
    paddingLeft: 10,
  },
  dateContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  dateLabel: {
    fontSize: 16,
    color: "#6b705c",
    marginBottom: 10,
  },
  deadlineText: {
    fontSize: 16,
    color: "#333",
    marginTop: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    backgroundColor: "#dc3545",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#28a745",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default CreateSquareScreen;
