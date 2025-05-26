import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { addDoc, collection } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import colors from "../../assets/constants/colorOptions";
import Icon from "react-native-vector-icons/Ionicons";
import { RouteProp, useRoute } from "@react-navigation/native";
import { Card, TextInput as PaperInput } from "react-native-paper";

type CreateSquareRouteParams = {
  CreateSquareScreen: {
    team1?: string;
    team2?: string;
    deadline?: string;
    inputTitle?: string;
    username?: string;
    maxSelections?: string;
    selectedColor?: string;
    eventId?: string;
  };
};

const CreateSquareScreen = ({ navigation }) => {
  const [inputTitle, setInputTitle] = useState("");
  const [username, setUsername] = useState("");
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [deadline, setDeadline] = useState(new Date());
  const [selectedColor, setSelectedColor] = useState(null);
  const [randomizeAxis, setRandomizeAxis] = useState(true);
  const [maxSelections, setMaxSelections] = useState("");
  const [eventId, setEventId] = useState("");
  const [step, setStep] = useState(0);
  const [hideAxisUntilDeadline, setHideAxisUntilDeadline] = useState(true);
  const route =
    useRoute<RouteProp<CreateSquareRouteParams, "CreateSquareScreen">>();

  const onDateChange = (event, selectedDate) => {
    if (selectedDate) {
      setDeadline(selectedDate);
    }
  };

  useEffect(() => {
    const params = route.params || {};

    if (params.team1) setTeam1(params.team1);
    if (params.team2) setTeam2(params.team2);
    if (params.deadline) setDeadline(new Date(params.deadline));
    if (params.inputTitle) setInputTitle(params.inputTitle);
    if (params.username) setUsername(params.username);
    if (params.maxSelections) setMaxSelections(String(params.maxSelections));
    if (params.selectedColor) setSelectedColor(params.selectedColor);
    if (params.eventId) {
      setEventId(params.eventId);
    }
  }, [route.params]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => {
            if (step === 0) {
              navigation.goBack();
            } else {
              setStep(0);
            }
          }}
          style={{ paddingLeft: 12 }}
        >
          <Icon name="arrow-back" size={24} color="#212529" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, step]);

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
        maxSelections: parseInt(maxSelections, 10),
        eventId: eventId || "",
        hideAxisUntilDeadline,
      });

      navigation.navigate("FinalSquareScreen", {
        gridId: squareRef.id,
        inputTitle,
        username,
        deadline,
        xAxis,
        yAxis,
        eventId,
        hideAxisUntilDeadline,
      });
    } catch (error) {
      console.error("Error creating grid:", error);
    }
  };

  const isFormValid = inputTitle && username && team1 && team2 && selectedColor;

  const renderStepIndicator = () => (
    <View style={styles.progressRow}>
      <Text style={[styles.stepLabel, step === 0 && styles.activeStep]}>
        1. Game
      </Text>
      <Text style={[styles.stepLabel, step === 1 && styles.activeStep]}>
        2. Info
      </Text>
    </View>
  );

  const renderStepOne = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Create a New Square</Text>

      <Card style={[styles.cardSection]}>
        <Text style={styles.sectionHeader}>Game Settings</Text>
        <PaperInput
          label="Square Title"
          value={inputTitle}
          onChangeText={setInputTitle}
          mode="outlined"
          style={styles.input}
          theme={{ colors: { primary: colors.primary } }}
        />

        <TouchableOpacity
          onPress={() =>
            navigation.replace("GamePickerScreen", {
              team1,
              team2,
              deadline: deadline.toISOString(), // optional if using
              inputTitle,
              username,
              maxSelections,
              selectedColor,
            })
          }
          style={styles.gameCard}
        >
          <Text style={styles.gameCardLabel}>NFL Game</Text>
          <View style={styles.gameCardRow}>
            <Text
              style={[
                styles.gameCardText,
                !(team1 && team2) && { color: "#aaa", fontStyle: "italic" },
              ]}
            >
              {team1 && team2 ? `${team1} vs ${team2}` : "Pick a NFL game"}
            </Text>
            <Icon name="chevron-forward" size={20} color="#888" />
          </View>
        </TouchableOpacity>

        <PaperInput
          label="Max Squares per Player"
          keyboardType="numeric"
          value={maxSelections}
          onChangeText={setMaxSelections}
          mode="outlined"
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />
        <Text style={[styles.label, { marginBottom: 15, marginTop: 5 }]}>
          Deadline For Your Square
        </Text>

        <DateTimePicker
          value={deadline}
          mode="datetime"
          display="default"
          onChange={onDateChange}
        />

        <Text style={[styles.label, { marginTop: 20 }]}>X & Y Axis</Text>

        <View style={styles.toggleRow}>
          <Text style={styles.subtext}>Randomize Axis Numbers</Text>
          <Switch value={randomizeAxis} onValueChange={setRandomizeAxis} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.subtext}>Mask X & Y Axis Until Deadline</Text>
          <Switch
            value={hideAxisUntilDeadline}
            onValueChange={setHideAxisUntilDeadline}
          />
        </View>
      </Card>
    </ScrollView>
  );

  const renderStepTwo = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Create a New Square</Text>

      <Card style={[styles.cardSection]}>
        <Text style={styles.sectionHeader}>Player Settings</Text>
        <PaperInput
          label="Your Username"
          value={username}
          onChangeText={setUsername}
          mode="outlined"
          style={styles.input}
        />
        <Text style={styles.subtext}>
          Choose a color to represent your selected squares on the board.
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.colorScrollContainer}
        >
          <View style={styles.colorRowsContainer}>
            {[0, 1].map((rowIndex) => (
              <View key={rowIndex} style={styles.colorRow}>
                {colors.colorOptions
                  .slice(
                    rowIndex * Math.ceil(colors.colorOptions.length / 2),
                    (rowIndex + 1) * Math.ceil(colors.colorOptions.length / 2)
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
      </Card>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
              {step === 0 ? renderStepOne() : renderStepTwo()}
              {renderStepIndicator()}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  onPress={() => setStep(Math.max(step - 1, 0))}
                  style={[styles.cancelButton, step === 0 && { opacity: 0.5 }]}
                  disabled={step === 0}
                >
                  <Text style={styles.buttonText}>Back</Text>
                </TouchableOpacity>
                {step === 0 ? (
                  <TouchableOpacity
                    onPress={() => setStep(1)}
                    style={styles.saveButton}
                  >
                    <Text style={styles.buttonText}>Next</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={createSquareSession}
                    style={[
                      styles.saveButton,
                      { opacity: isFormValid ? 1 : 0.5 },
                    ]}
                    disabled={!isFormValid}
                  >
                    <Text style={styles.buttonText}>Create Square</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f4f8" },
  scrollContent: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#222",
  },
  input: {
    marginBottom: 15,
    backgroundColor: colors.primaryBackground,
  },
  cardSection: {
    borderRadius: 12,
    marginBottom: 20,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    backgroundColor: "#ffffff",
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
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  label: { fontSize: 16, fontWeight: "600", color: "#333" },
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
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 12,
  },
  stepLabel: {
    fontSize: 14,
    color: "#999",
    marginHorizontal: 12,
  },
  activeStep: {
    fontWeight: "bold",
    color: "#5e60ce",
  },
  subtext: {
    fontSize: 13,
    color: "#666",
    marginTop: 0,
    marginBottom: 5,
    lineHeight: 0,
  },
  gameCard: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.primaryBackground,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 15,
  },

  gameCardLabel: {
    fontSize: 14,
    color: colors.primaryText,
    marginBottom: 4,
  },

  gameCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  gameCardText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
});

export default CreateSquareScreen;
