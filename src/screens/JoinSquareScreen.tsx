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
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { doc, setDoc, arrayUnion } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import colors from "../../assets/constants/colorOptions";
import { Card, TextInput as PaperInput } from "react-native-paper";

type JoinSquareParams = {
  gridId: string;
  inputTitle: string;
  deadline: string;
  usedColors?: string[];
};

const JoinSquareScreen = () => {
  const route = useRoute<RouteProp<{ params: JoinSquareParams }, "params">>();
  const navigation = useNavigation();
  const user = auth.currentUser;

  const { gridId, inputTitle, deadline, usedColors = [] } = route.params;

  const [username, setUsername] = useState("");
  const [selectedColor, setSelectedColor] = useState(null);

  const availableColors = colors.colorOptions.filter(
    (color) => !usedColors.includes(color)
  );

  const joinSquare = async () => {
    if (!username) {
      alert("Please enter a username.");
      return;
    }

    if (!selectedColor) {
      alert("Please select a color.");
      return;
    }

    if (!user) {
      alert("User is not authenticated. Please log in.");
      return;
    }

    try {
      const squareRef = doc(db, "squares", gridId);

      await setDoc(
        squareRef,
        {
          players: arrayUnion({
            userId: user.uid,
            username,
            color: selectedColor,
          }),
          playerIds: arrayUnion(user.uid),
        },
        { merge: true }
      );

      navigation.navigate("FinalSquareScreen", {
        gridId,
        inputTitle,
        username,
        deadline,
      });
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
              <Text style={styles.title}>Joining {inputTitle}</Text>

              <Card style={styles.card}>
                <Card.Content>
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
                          {availableColors
                            .slice(
                              rowIndex * Math.ceil(availableColors.length / 2),
                              (rowIndex + 1) *
                                Math.ceil(availableColors.length / 2)
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
    paddingHorizontal: 10,
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: colors.primaryBackground,
  },
  input: {
    marginBottom: 15,
    backgroundColor: colors.primaryBackground,
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
    backgroundColor: colors.cancel,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

export default JoinSquareScreen;
