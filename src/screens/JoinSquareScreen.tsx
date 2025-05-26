import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Keyboard,
  StyleSheet,
  TouchableWithoutFeedback,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { doc, getDoc, setDoc, arrayUnion } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import colorOptions from "../../assets/constants/colorOptions";
import { Card, TextInput as PaperInput } from "react-native-paper";

const JoinSquareScreen = () => {
  const [gridId, setGridId] = useState("");
  const [username, setUsername] = useState("");
  const [selectedColor, setSelectedColor] = useState(null);
  const navigation = useNavigation();
  const user = auth.currentUser;

  const joinSquare = async () => {
    if (!gridId || !username) {
      alert("Please enter both a Session ID and a username.");
      return;
    }

    if (!user) {
      alert("User is not authenticated. Please log in.");
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
          deadline: data.deadline,
        });
      } else {
        alert("Grid not found.");
      }
    } catch (error) {
      console.error("Error joining grid:", error);
      alert("Something went wrong when trying to join.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.title}>Join a Square</Text>

              <Card style={styles.card}>
                <Card.Content>
                  <PaperInput
                    label="Session ID"
                    value={gridId}
                    onChangeText={setGridId}
                    mode="outlined"
                    style={styles.input}
                    autoCapitalize="none"
                  />

                  <PaperInput
                    label="Your Username"
                    value={username}
                    onChangeText={setUsername}
                    mode="outlined"
                    style={styles.input}
                  />

                  <Text style={styles.sectionHeader}>Pick Your Color</Text>
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
                              (rowIndex + 1) *
                                Math.ceil(colorOptions.length / 2)
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
                                    borderWidth:
                                      selectedColor === color ? 3 : 1,
                                  },
                                ]}
                              />
                            ))}
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </Card.Content>
              </Card>
            </ScrollView>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.cancelButton}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={joinSquare} style={styles.saveButton}>
                <Text style={styles.buttonText}>Join Square</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f4f8" },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    elevation: 2,
  },
  input: {
    marginBottom: 15,
    backgroundColor: "#f7f7f7",
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
    marginBottom: 8,
  },
  colorScrollContainer: { paddingVertical: 10 },
  colorRowsContainer: { marginBottom: 10 },
  colorRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    margin: 6,
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
    backgroundColor: "#5e60ce",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

export default JoinSquareScreen;
