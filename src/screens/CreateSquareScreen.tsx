import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ModalProps,
  ScrollView,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { useNavigation } from "@react-navigation/native";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../../firebaseConfig";

const gridSizes = [
  { label: "1 x 1", value: 1 },
  { label: "2 x 2", value: 2 },
  { label: "3 x 3", value: 3 },
  { label: "4 x 4", value: 4 },
  { label: "5 x 5", value: 5 },
  { label: "6 x 6", value: 6 },
  { label: "7 x 7", value: 7 },
  { label: "8 x 8", value: 8 },
  { label: "9 x 9", value: 9 },
  { label: "10 x 10", value: 10 },
];

const data = [
  { label: "Yes", value: true },
  { label: "No", value: false },
];

const CreateSquareScreen: React.FC<ModalProps> = ({}) => {
  const [inputTitle, setInputTitle] = useState("");
  const [username, setUsername] = useState("");
  const [numPlayers, setNumPlayers] = useState("");
  const [isFocus, setIsFocus] = useState(false);
  const [selectedValue, setSelectedValue] = useState(null);
  const [gridSize, setGridSize] = useState(null);
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const navigation = useNavigation();

  const createGridSession = async (
    gridSize: number,
    inputTitle: string,
    username: string,
    team1: string,
    team2: string
  ) => {
    try {
      const docRef = await addDoc(collection(db, "grids"), {
        size: gridSize,
        players: [username], // Add the player who created the grid
        selections: [], // Initial empty selections
        title: inputTitle,
        team1: team1,
        team2: team2,
      });
      console.log("Grid created with ID:", docRef.id);
      console.log("docRef: ", docRef);
      return docRef.id; // Return the grid ID to later use for updates
    } catch (error) {
      console.error("Error creating grid:", error);
    }
  };

  const createGrid = async () => {
    var gridId = await createGridSession(
      gridSize,
      inputTitle,
      username,
      team1,
      team2
    );
    console.log("Id: ", gridId);
    navigation.navigate("SquareScreen", {
      gridId,
      inputTitle,
      username,
      numPlayers,
      team1,
      team2,
      gridSize,
    });
  };

  const cancel = () => {
    navigation.navigate("Home");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Create a New Square!</Text>
          <TextInput
            style={styles.textInput}
            onChangeText={setInputTitle}
            value={inputTitle}
            placeholder="Enter the name of your new Square"
            placeholderTextColor="#ffe8d6"
          />
          <TextInput
            style={styles.textInput}
            onChangeText={setUsername}
            value={username}
            placeholder="Enter your username"
            placeholderTextColor="#ffe8d6"
          />
          <TextInput
            style={styles.textInput}
            keyboardType="numeric"
            onChangeText={setNumPlayers}
            value={numPlayers}
            placeholder="Enter number of players"
            placeholderTextColor="#ffe8d6"
          />
          <View
            style={[{ flexDirection: "row", justifyContent: "space-between" }]}
          >
            <Text>Enter teams:</Text>
            <View
              style={[{ flexDirection: "column", justifyContent: "center" }]}
            >
              <TextInput
                style={styles.textInput}
                onChangeText={setTeam1}
                value={team1}
                placeholder="Team 1"
                placeholderTextColor="#ffe8d6"
              />
              <TextInput
                style={styles.textInput}
                onChangeText={setTeam2}
                value={team2}
                placeholder="Team 2"
                placeholderTextColor="#ffe8d6"
              />
            </View>
          </View>
          <Dropdown
            style={[styles.dropdown, isFocus && { borderColor: "blue" }]}
            data={gridSizes}
            onChange={(item) => {
              setGridSize(item.value);
              setIsFocus(false);
            }}
            labelField={"label"}
            valueField={"value"}
            value={gridSize}
            placeholder={
              gridSize
                ? `Selected: ${gridSize}`
                : "What is the size of your grid?"
            }
          />
          <Text style={styles.selected}>Selected Grid Size: {gridSize}</Text>

          <Dropdown
            style={styles.dropdown}
            data={data}
            labelField="label"
            valueField="value"
            value={selectedValue}
            onChange={(item) => {
              setSelectedValue(item.value);
              setIsFocus(false);
            }}
            placeholder={
              selectedValue ? `Selected: ${selectedValue}` : "Randomize Grid?"
            }
          />
          <View style={styles.buttonsContainer}>
            <TouchableOpacity onPress={cancel} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={createGrid} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Create Grid</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreateSquareScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#a5a58d",
  },
  selected: {
    marginTop: 20,
    fontSize: 16,
  },
  dropdown: {
    height: 50,
    width: 200,
    borderColor: "#ffe8d6",
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  icon: {
    marginRight: 5,
  },
  button: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },
  modalOverlay: {
    // flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: 300,
    padding: 20,
    backgroundColor: "#a5a58d",
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  textInput: {
    height: 40,
    width: "100%",
    borderColor: "#ffe8d6",
    borderWidth: 1,
    borderRadius: 5,
    paddingLeft: 10,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
    color: "#ffe8d6",
  },
  picker: {
    width: "100%",
    height: 50,
    marginBottom: 20,
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  saveButton: {
    backgroundColor: "#28a745",
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  closeButton: {
    backgroundColor: "#dc3545",
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
