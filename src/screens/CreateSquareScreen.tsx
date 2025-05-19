import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  ScrollView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { auth } from "../../firebaseConfig";
import colorOptions from "../../assets/constants/colorOptions";

const CreateSquareScreen = ({ navigation }) => {
  const [inputTitle, setInputTitle] = useState("");
  const [username, setUsername] = useState("");
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [deadline, setDeadline] = useState(new Date());
  const [selectedColor, setSelectedColor] = useState(null);

  // Handle date change from DateTimePicker
  const onDateChange = (event, selectedDate) => {
    if (selectedDate) {
      setDeadline(selectedDate);
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
        players: [
          { userId: user.uid, username, color: selectedColor || "#000000" },
        ],
        playerIds: [user.uid],
        selections: [],
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
      <View style={styles.innerContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
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

          <Text style={styles.colorPickerLabel}>Pick your color:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.colorScrollContainer}
          >
            <View style={styles.colorRowsContainer}>
              {[0, 1].map((rowIndex) => (
                <View key={rowIndex} style={styles.colorRow}>
                  {colorOptions
                    .slice(
                      rowIndex * Math.ceil(colorOptions.length / 2),
                      (rowIndex + 1) * Math.ceil(colorOptions.length / 2)
                    )
                    .map((color) => (
                      <TouchableOpacity
                        key={color}
                        onPress={() => setSelectedColor(color)}
                        style={[
                          styles.colorCircle,
                          {
                            backgroundColor: color,
                            borderColor:
                              selectedColor === color ? "#000" : "#ccc",
                            borderWidth: selectedColor === color ? 3 : 1,
                          },
                        ]}
                      />
                    ))}
                </View>
              ))}
            </View>
          </ScrollView>

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
              mode="datetime"
              display="default"
              onChange={onDateChange}
            />
          </View>
        </ScrollView>

        {/* Fixed Bottom Buttons */}
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
  },
  innerContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    height: 50,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 20,
    paddingLeft: 10,
  },
  colorPickerLabel: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: "600",
    color: "#555",
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 20,
  },
  colorScrollContainer: {
    paddingVertical: 10,
    paddingHorizontal: 5,
  },

  colorRowsContainer: {
    marginBottom: 20,
  },
  colorRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  colorCircle: {
    width: 36,
    height: 36,
    // borderRadius: 18,
    marginHorizontal: 6,
    marginVertical: 6,
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
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ddd",
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
