import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { addDoc, collection } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import colorOptions from "../../assets/constants/colorOptions";
import Icon from "react-native-vector-icons/Ionicons";
import GestureRecognizer from "react-native-swipe-gestures";

const CreateSquareScreen = ({ navigation }) => {
  const [inputTitle, setInputTitle] = useState("");
  const [username, setUsername] = useState("");
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [deadline, setDeadline] = useState(new Date());
  const [selectedColor, setSelectedColor] = useState(null);
  const [randomizeAxis, setRandomizeAxis] = useState(false);
  const [step, setStep] = useState(0);
  const slideAnim = useState(new Animated.Value(0))[0];

  const onDateChange = (event, selectedDate) => {
    if (selectedDate) {
      setDeadline(selectedDate);
    }
  };

  const generateShuffledArray = () => {
    const arr = [...Array(10).keys()];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const createSquareSession = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const xAxis = randomizeAxis
        ? generateShuffledArray()
        : [...Array(10).keys()];
      const yAxis = randomizeAxis
        ? generateShuffledArray()
        : [...Array(10).keys()];

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
        xAxis,
        yAxis,
      });

      navigation.navigate("FinalSquareScreen", {
        gridId: squareRef.id,
        inputTitle,
        username,
        // team1,
        // team2,
        deadline,
        xAxis,
        yAxis,
      });
    } catch (error) {
      console.error("Error creating grid:", error);
    }
  };

  const isFormValid = inputTitle && username && team1 && team2 && selectedColor;

  const animateStep = (newStep) => {
    Animated.timing(slideAnim, {
      toValue: newStep,
      duration: 300,
      useNativeDriver: false,
    }).start(() => setStep(newStep));
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {[0, 1].map((i) => (
        <View
          key={i}
          style={[styles.stepDot, step === i && styles.activeDot]}
        />
      ))}
    </View>
  );

  const renderStepOne = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Create a New Square</Text>
      <View style={styles.formSectionContainer}>
        <Text style={styles.sectionHeader}>Square Details</Text>
        <TextInput
          style={styles.input}
          onChangeText={setInputTitle}
          value={inputTitle}
          placeholder="Enter the name of your Square"
          placeholderTextColor="#888"
        />

        <Text style={styles.sectionHeader}>Teams</Text>
        <TextInput
          style={styles.input}
          onChangeText={setTeam1}
          value={team1}
          placeholder="Enter Team 1 (e.g. 🦅 Eagles)"
          placeholderTextColor="#888"
        />

        <TextInput
          style={styles.input}
          onChangeText={setTeam2}
          value={team2}
          placeholder="Enter Team 2 (e.g. 🐻 Bears)"
          placeholderTextColor="#888"
        />

        <Text style={styles.sectionHeader}>Deadline</Text>
        <View style={styles.dateContainer}>
          <DateTimePicker
            value={deadline}
            mode="datetime"
            display="default"
            onChange={onDateChange}
          />
        </View>
        <View style={styles.helperTextContainer}>
          <Text style={styles.helperText}>
            This deadline determines when the square locks and reveals results.
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderStepTwo = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.sectionHeader}>Your Info</Text>
      <TextInput
        style={styles.input}
        onChangeText={setUsername}
        value={username}
        placeholder="Enter your username"
        placeholderTextColor="#888"
      />

      <Text style={styles.sectionHeader}>Pick your color</Text>
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
                        borderColor: selectedColor === color ? "#000" : "#ccc",
                        borderWidth: selectedColor === color ? 3 : 1,
                      },
                    ]}
                  >
                    {selectedColor === color && (
                      <View style={styles.checkMarkOverlay}>
                        <Icon name="checkmark" size={18} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.randomizeContainer}>
        <View style={styles.toggleRow}>
          <Text style={styles.label}>Randomize Axes</Text>
          <Switch value={randomizeAxis} onValueChange={setRandomizeAxis} />
        </View>
        <Text style={styles.helperText}>
          Shuffles the 0–9 order for both X and Y axis to make square selection
          less predictable.
        </Text>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* {renderStepIndicator()} */}
        <GestureRecognizer
          onSwipeLeft={() => animateStep(Math.min(step + 1, 1))}
          onSwipeRight={() => animateStep(Math.max(step - 1, 0))}
          style={{ flex: 1 }}
        >
          {step === 0 ? renderStepOne() : renderStepTwo()}
          {renderStepIndicator()}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={() => navigation.navigate("HomeDrawer")}
              style={styles.cancelButton}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={createSquareSession}
              style={[styles.saveButton, { opacity: isFormValid ? 1 : 0.5 }]}
              disabled={!isFormValid}
            >
              <Text style={styles.buttonText}>Create Square</Text>
            </TouchableOpacity>
          </View>
        </GestureRecognizer>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f4f4" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 30 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 25,
    marginBottom: 10,
    color: "#222",
  },
  formSectionContainer: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
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
    justifyContent: "center",
    alignItems: "center",
  },
  checkMarkOverlay: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    padding: 2,
  },
  randomizeContainer: {
    marginVertical: 20,
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 16, fontWeight: "600", color: "#333" },
  helperText: { marginTop: 6, fontSize: 13, color: "#666", lineHeight: 18 },
  helperTextContainer: { paddingHorizontal: 5 },
  dateContainer: { marginBottom: 10, alignItems: "center" },
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
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  stepIndicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 10,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ccc",
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: "#28a745",
  },
});

export default CreateSquareScreen;
