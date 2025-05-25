import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { doc, getDoc, setDoc, arrayUnion } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import colorOptions from "../../assets/constants/colorOptions"; // Adjust path as needed

const JoinSquareScreen = () => {
  const [gridId, setGridId] = useState("");
  const [username, setUsername] = useState("");
  const [selectedColor, setSelectedColor] = useState(null);
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

        await setDoc(
          squareRef,
          {
            players: arrayUnion({
              userId: user.uid,
              username,
              color: selectedColor || "#000000",
            }),
            playerIds: arrayUnion(user.uid),
          },
          { merge: true }
        );

        navigation.navigate("FinalSquareScreen", {
          gridId,
          inputTitle: data.title,
          username,
          // team1: data.team1,
          // team2: data.team2,
          deadline: data.deadline,
        });
      } else {
        Alert.alert("Error", "Grid not found.");
      }
    } catch (error) {
      console.error("Error joining grid:", error);
      Alert.alert("Error", "Something went wrong when trying to join.");
    }
  };

  const cancel = () => navigation.navigate("HomeDrawer");

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Join a Square</Text>

          <TextInput
            style={styles.input}
            onChangeText={setGridId}
            value={gridId}
            placeholder="Enter the Session ID"
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
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={cancel} style={styles.cancelButton}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={joinSquare} style={styles.saveButton}>
            <Text style={styles.buttonText}>Join Square</Text>
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
    borderRadius: 18,
    marginHorizontal: 6,
    marginVertical: 6,
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

export default JoinSquareScreen;
