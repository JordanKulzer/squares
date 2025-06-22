import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { addDoc, collection } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import colors from "../../assets/constants/colorOptions";
import Icon from "react-native-vector-icons/Ionicons";
import { RouteProp, useRoute } from "@react-navigation/native";
import {
  Card,
  Chip,
  TextInput as PaperInput,
  useTheme,
} from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import DeadlinePickerModal from "../components/DeadlinePickerModal";
import { scheduleDeadlineNotifications } from "../utils/scheduleDeadlineNotifications";
import NotificationsModal from "../components/NotificationsModal";

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
  const [showPicker, setShowPicker] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [notifySettings, setNotifySettings] = useState({
    deadlineReminders: false,
    quarterResults: false,
    playerJoined: false,
  });

  const route =
    useRoute<RouteProp<CreateSquareRouteParams, "CreateSquareScreen">>();
  const theme = useTheme();

  useEffect(() => {
    const params = route.params || {};
    if (params.team1) setTeam1(params.team1);
    if (params.team2) setTeam2(params.team2);
    if (params.deadline) setDeadline(new Date(params.deadline));
    if (params.inputTitle) setInputTitle(params.inputTitle);
    if (params.username) setUsername(params.username);
    if (params.maxSelections) setMaxSelections(String(params.maxSelections));
    if (params.selectedColor) setSelectedColor(params.selectedColor);
    if (params.eventId) setEventId(params.eventId);
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
          <Icon name="arrow-back" size={24} color={theme.colors.onBackground} />
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
    Keyboard.dismiss();
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
          {
            userId: user.uid,
            username,
            color: selectedColor || "#000000",
            notifySettings,
          },
        ],
        playerIds: [user.uid],
        selections: [],
        xAxis,
        yAxis,
        maxSelections: parseInt(maxSelections, 10),
        eventId: eventId || "",
        hideAxisUntilDeadline,
      });

      if (notifySettings.deadlineReminders) {
        await scheduleDeadlineNotifications(deadline);
      }

      navigation.navigate("SquareScreen", {
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
      <Card
        style={[styles.cardSection, { backgroundColor: theme.colors.surface }]}
      >
        <Text style={[styles.sectionHeader, { color: theme.colors.onSurface }]}>
          Game Settings
        </Text>
        <PaperInput
          label="Enter Your Square Title"
          value={inputTitle}
          onChangeText={setInputTitle}
          mode="outlined"
          style={styles.input}
        />

        <TouchableOpacity
          onPress={() =>
            navigation.replace("GamePickerScreen", {
              team1,
              team2,
              deadline: deadline.toISOString(),
              inputTitle,
              username,
              maxSelections,
              selectedColor,
            })
          }
          style={[
            styles.gameCard,
            { backgroundColor: theme.colors.elevation.level1 },
          ]}
        >
          <Text style={{ color: theme.colors.onSurface, marginBottom: 4 }}>
            NFL Game
          </Text>
          <View style={styles.gameCardRow}>
            <Text style={{ color: theme.colors.onSurface }}>
              {team1 && team2 ? `${team1} vs ${team2}` : "Pick a NFL game"}
            </Text>
            <Icon
              name="chevron-forward"
              size={20}
              color={theme.colors.onSurface}
            />
          </View>
        </TouchableOpacity>

        <PaperInput
          label="Enter Max Squares Per Player"
          keyboardType="numeric"
          value={maxSelections}
          onChangeText={setMaxSelections}
          mode="outlined"
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />

        <Text
          style={{
            color: theme.colors.onSurface,
            fontWeight: "600",
            marginBottom: 10,
          }}
        >
          Deadline For Your Square
        </Text>
        <TouchableOpacity
          onPress={() => setShowPicker(true)}
          style={[
            styles.deadlinePickerButton,
            { backgroundColor: theme.colors.elevation.level1 },
          ]}
        >
          <Text
            style={{
              color: theme.colors.onSurface,
              fontSize: 16,
              fontWeight: "500",
            }}
          >
            {deadline.toLocaleString()}
          </Text>
          <Icon
            name="chevron-forward"
            size={20}
            color={theme.colors.onSurface}
          />
        </TouchableOpacity>

        <DeadlinePickerModal
          visible={showPicker}
          onDismiss={() => setShowPicker(false)}
          date={deadline}
          onConfirm={(date) => setDeadline(date)}
        />

        <Text
          style={{
            color: theme.colors.onSurface,
            fontWeight: "600",
            marginTop: 20,
          }}
        >
          X & Y Axis
        </Text>
        <View style={styles.toggleRow}>
          <Text style={{ color: theme.colors.onSurface }}>
            Randomize Axis Numbers
          </Text>
          <Chip
            mode="outlined"
            selected={randomizeAxis}
            onPress={() => setRandomizeAxis(!randomizeAxis)}
            style={{
              backgroundColor: randomizeAxis
                ? theme.colors.primary
                : theme.dark
                ? "#2a2a2a"
                : "#f0f0f0",
              borderColor: randomizeAxis
                ? theme.colors.primary
                : theme.colors.outlineVariant,
            }}
            textStyle={{
              color: randomizeAxis ? "#fff" : theme.colors.onSurface,
              fontWeight: "600",
            }}
          >
            {randomizeAxis ? "On" : "Off"}
          </Chip>
        </View>

        <View style={styles.toggleRow}>
          <Text style={{ color: theme.colors.onSurface }}>
            Mask X & Y Axis Until Deadline
          </Text>
          <Chip
            mode="outlined"
            selected={hideAxisUntilDeadline}
            onPress={() => setHideAxisUntilDeadline(!hideAxisUntilDeadline)}
            style={{
              backgroundColor: hideAxisUntilDeadline
                ? theme.colors.primary
                : theme.dark
                ? "#2a2a2a"
                : "#f0f0f0",
              borderColor: hideAxisUntilDeadline
                ? theme.colors.primary
                : theme.colors.outlineVariant,
            }}
            textStyle={{
              color: hideAxisUntilDeadline ? "#fff" : theme.colors.onSurface,
              fontWeight: "600",
            }}
          >
            {hideAxisUntilDeadline ? "On" : "Off"}
          </Chip>
        </View>
      </Card>
    </ScrollView>
  );

  const renderStepTwo = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Card
        style={[styles.cardSection, { backgroundColor: theme.colors.surface }]}
      >
        <Text style={[styles.sectionHeader, { color: theme.colors.onSurface }]}>
          Player Settings
        </Text>
        <PaperInput
          label="Enter Your Username"
          value={username}
          onChangeText={setUsername}
          mode="outlined"
          style={styles.input}
        />
        <Text
          style={{
            color: theme.colors.onSurfaceVariant || theme.colors.outline,
            fontSize: 13,
          }}
        >
          Choose a color to represent your squares on the board.
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
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        margin: 6,
                        backgroundColor: color,
                        borderWidth: selectedColor === color ? 4 : 0,
                        borderColor:
                          selectedColor === color ? "#5e60ce" : "transparent",
                        shadowColor:
                          selectedColor === color ? "#5e60ce" : "transparent",
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: selectedColor === color ? 0.9 : 0,
                        shadowRadius: selectedColor === color ? 8 : 0,
                        elevation: selectedColor === color ? 6 : 0,
                      }}
                    />
                  ))}
              </View>
            ))}
          </View>
        </ScrollView>
        <TouchableOpacity
          onPress={() => setNotifModalVisible(true)}
          style={{
            marginTop: 20,
            padding: 12,
            backgroundColor: theme.colors.elevation.level1,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ color: theme.colors.onSurface, fontWeight: "500" }}>
            Notification Preferences
          </Text>
          <Icon
            name="chevron-forward"
            size={20}
            color={theme.colors.onSurface}
          />
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );

  return (
    <LinearGradient
      colors={theme.dark ? ["#1e1e1e", "#121212"] : ["#fdfcf9", "#e0e7ff"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container}>
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>
          Create a New Square
        </Text>
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
                <View
                  style={[
                    styles.buttonContainer,
                    {
                      backgroundColor: theme.colors.surface,
                      shadowColor: theme.dark ? "#000" : "#aaa",
                    },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => setStep(Math.max(step - 1, 0))}
                    style={[
                      styles.cancelButton,
                      { backgroundColor: theme.colors.error },
                      step === 0 && { opacity: 0.5 },
                    ]}
                    disabled={step === 0}
                  >
                    <Text style={styles.buttonText}>Back</Text>
                  </TouchableOpacity>
                  {step === 0 ? (
                    <TouchableOpacity
                      onPress={() => setStep(1)}
                      style={[
                        styles.saveButton,
                        { backgroundColor: theme.colors.primary },
                      ]}
                    >
                      <Text style={styles.buttonText}>Next</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={createSquareSession}
                      style={[
                        styles.saveButton,
                        { backgroundColor: theme.colors.primary },
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
      <NotificationsModal
        visible={notifModalVisible}
        onDismiss={() => setNotifModalVisible(false)}
        settings={notifySettings}
        onSave={(settings) => setNotifySettings(settings)}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
  },
  sectionHeader: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  input: { marginBottom: 15 },
  cardSection: {
    borderRadius: 12,
    marginBottom: 20,
    padding: 16,
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
    borderWidth: 1.5, // Increased border all around
    borderColor: "rgba(94, 96, 206, 0.4)", // Semi-transparent highlight color
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ccc",
    elevation: 8,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 10,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
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
  colorScrollContainer: { paddingVertical: 10 },
  colorRowsContainer: { marginBottom: 10 },
  colorRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  gameCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 15,
  },
  gameCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deadlinePickerButton: {
    borderWidth: 1,
    borderRadius: 10,
    borderColor: "#e0e0e0",
    padding: 12,
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export default CreateSquareScreen;
