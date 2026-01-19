import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../../assets/constants/colorOptions";
import Icon from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { RouteProp, useRoute } from "@react-navigation/native";
import { TextInput as PaperInput, useTheme, Button } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import DeadlinePickerModal from "../components/DeadlinePickerModal";
import { scheduleNotifications } from "../utils/notifications";
import NotificationsModal from "../components/NotificationsModal";
import { supabase } from "../lib/supabase";
import PerSquareSettingsModal from "../components/PerSquareSettingsModal";
import { useFonts, Anton_400Regular } from "@expo-google-fonts/anton";
import {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_600SemiBold,
} from "@expo-google-fonts/rubik";

type CreateSquareRouteParams = {
  CreateSquareScreen: {
    team1?: string;
    team2?: string;
    team1FullName?: string;
    team2FullName?: string;
    deadline?: string;
    inputTitle?: string;
    username?: string;
    maxSelections?: string;
    pricePerSquare?: number;
    selectedColor?: string;
    eventId?: string;
    team1Abbr?: string;
    team2Abbr?: string;
    league?: string;
  };
};

const CreateSquareScreen = ({ navigation }) => {
  const [inputTitle, setInputTitle] = useState("");
  const [username, setUsername] = useState("");
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [team1FullName, setTeam1FullName] = useState("");
  const [team2FullName, setTeam2FullName] = useState("");
  const [team1Abbr, setTeam1Abbr] = useState("");
  const [team2Abbr, setTeam2Abbr] = useState("");
  const [league, setLeague] = useState("");
  const [deadline, setDeadline] = useState(new Date());
  const [selectedColor, setSelectedColor] = useState(null);
  const [randomizeAxis, setRandomizeAxis] = useState(true);
  const [maxSelections, setMaxSelections] = useState("100");
  const [pricePerSquare, setPricePerSquare] = useState(0);
  const [eventId, setEventId] = useState("");
  const [hideAxisUntilDeadline, setHideAxisUntilDeadline] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [perSquareModalVisible, setPerSquareModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifySettings, setNotifySettings] = useState({
    deadlineReminders: false,
    playerJoined: false,
    playerLeft: false,
    squareDeleted: false,
  });

  const [fontsLoaded] = useFonts({
    Anton_400Regular,
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_600SemiBold,
  });

  const route =
    useRoute<RouteProp<CreateSquareRouteParams, "CreateSquareScreen">>();
  const theme = useTheme();

  useEffect(() => {
    const params = route.params || {};
    if (params.team1) setTeam1(params.team1);
    if (params.team2) setTeam2(params.team2);
    if (params.team1FullName) setTeam1FullName(params.team1FullName);
    if (params.team2FullName) setTeam2FullName(params.team2FullName);
    if (params.team1Abbr) setTeam1Abbr(params.team1Abbr);
    if (params.team2Abbr) setTeam2Abbr(params.team2Abbr);
    if (params.league) setLeague(params.league);
    if (params.deadline) setDeadline(new Date(params.deadline));
    if (params.inputTitle) setInputTitle(params.inputTitle);
    if (params.username) setUsername(params.username);
    setMaxSelections(
      params.maxSelections !== undefined ? String(params.maxSelections) : "100",
    );
    if (params.selectedColor) setSelectedColor(params.selectedColor);
    if (params.eventId) setEventId(params.eventId);
    if (params.pricePerSquare) setPricePerSquare(params.pricePerSquare);
  }, [route.params]);

  const generateShuffledArray = () => {
    const arr = [...Array(10).keys()];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const createSquareSession = async () => {
    if (!inputTitle.trim()) {
      Alert.alert("Missing Info", "Please enter a game title");
      return;
    }
    if (!username.trim()) {
      Alert.alert("Missing Info", "Please enter your username");
      return;
    }
    if (!team1 || !team2) {
      Alert.alert("Missing Info", "Please select a game");
      return;
    }
    if (!selectedColor) {
      Alert.alert("Missing Info", "Please choose your color");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const xAxis = randomizeAxis
        ? generateShuffledArray()
        : [...Array(10).keys()];
      const yAxis = randomizeAxis
        ? generateShuffledArray()
        : [...Array(10).keys()];

      const { data, error } = await supabase
        .from("squares")
        .insert([
          {
            title: inputTitle.trim(),
            team1: team1,
            team2: team2,
            deadline,
            created_by: user.id,
            players: [
              {
                userId: user.id,
                username: username.trim(),
                color: selectedColor,
                notifySettings,
                amount_owed: 0,
              },
            ],
            player_ids: [user.id],
            selections: [],
            x_axis: xAxis,
            y_axis: yAxis,
            max_selection: parseInt(maxSelections, 10),
            event_id: eventId || "",
            axis_hidden: hideAxisUntilDeadline,
            randomize_axis: randomizeAxis,
            price_per_square: pricePerSquare,
            team1_full_name: team1FullName,
            team2_full_name: team2FullName,
            team1_abbr: team1Abbr,
            team2_abbr: team2Abbr,
            league: league,
          },
        ])
        .select("id")
        .single();

      if (error) {
        console.error("Error inserting into Supabase:", error);
        Alert.alert("Error", "Failed to create game. Please try again.");
        setLoading(false);
        return;
      }

      if (notifySettings.deadlineReminders) {
        await scheduleNotifications(deadline, data.id, notifySettings);
      }

      navigation.navigate("SquareScreen", {
        gridId: data.id,
        inputTitle: inputTitle.trim(),
        username: username.trim(),
        deadline,
        xAxis,
        yAxis,
        eventId,
        hideAxisUntilDeadline,
        pricePerSquare,
        team1_full_name: team1FullName,
        team2_full_name: team2FullName,
      });
    } catch (error) {
      console.error("Error creating grid:", error);
      Alert.alert("Error", "Failed to create game. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    inputTitle.trim() && username.trim() && team1 && team2 && selectedColor;

  return (
    <LinearGradient
      colors={
        theme.dark ? ["#121212", "#1d1d1d", "#2b2b2d"] : ["#fdfcf9", "#e0e7ff"]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <MaterialIcons
              name="add-box"
              size={48}
              color={theme.colors.primary}
            />
            <Text
              style={[styles.headerTitle, { color: theme.colors.onBackground }]}
            >
              Create Your Square
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Customize your square's settings
            </Text>
          </View>

          {/* Game Title */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.onBackground }]}>
              Game Title *
            </Text>
            <PaperInput
              mode="outlined"
              value={inputTitle}
              onChangeText={setInputTitle}
              placeholder="e.g., Super Bowl Squares 2025"
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
              maxLength={50}
            />
            <Text
              style={[
                styles.helperText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {inputTitle.length}/50 characters
            </Text>
          </View>

          {/* Username */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.onBackground }]}>
              Your Username *
            </Text>
            <PaperInput
              mode="outlined"
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your display name"
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
              maxLength={20}
            />
          </View>

          {/* Game Selection */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.onBackground }]}>
              Select Game *
            </Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("GamePickerScreen", {
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
                styles.selectButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor:
                    team1 && team2
                      ? theme.colors.primary
                      : theme.dark
                        ? "#444"
                        : "#ddd",
                  borderWidth: team1 && team2 ? 2 : 1,
                },
              ]}
            >
              {team1 && team2 ? (
                <View style={styles.selectedGameInfo}>
                  <View style={styles.selectedTeams}>
                    <Text
                      style={[
                        styles.selectedTeamName,
                        { color: theme.colors.onBackground },
                      ]}
                    >
                      {team1FullName || team1}
                    </Text>
                    <Text
                      style={[
                        styles.vsText,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      vs
                    </Text>
                    <Text
                      style={[
                        styles.selectedTeamName,
                        { color: theme.colors.onBackground },
                      ]}
                    >
                      {team2FullName || team2}
                    </Text>
                  </View>
                  <Text
                    style={[styles.changeText, { color: theme.colors.primary }]}
                  >
                    Change Game
                  </Text>
                </View>
              ) : (
                <View style={styles.selectButtonContent}>
                  <MaterialIcons
                    name="sports-football"
                    size={32}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={[
                      styles.selectButtonText,
                      { color: theme.colors.onBackground },
                    ]}
                  >
                    Choose a Game
                  </Text>
                  <Text
                    style={[
                      styles.selectButtonSubtext,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    Browse upcoming games
                  </Text>
                </View>
              )}
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={theme.colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          </View>

          {/* Color Selection */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.onBackground }]}>
              Your Color *
            </Text>
            <View style={styles.colorGrid}>
              {colors.colorOptions.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => setSelectedColor(color)}
                  style={[
                    styles.colorButton,
                    {
                      backgroundColor: color,
                      borderWidth: selectedColor === color ? 3 : 0,
                      borderColor: theme.colors.primary,
                      transform: [{ scale: selectedColor === color ? 1.1 : 1 }],
                    },
                  ]}
                >
                  {selectedColor === color && (
                    <MaterialIcons
                      name="check"
                      size={20}
                      color="#fff"
                      style={styles.checkIcon}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Settings Card */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.onBackground }]}>
              Game Settings
            </Text>

            {/* Per Square Settings */}
            <TouchableOpacity
              onPress={() => setPerSquareModalVisible(true)}
              style={[
                styles.settingCard,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <View style={styles.settingCardContent}>
                <MaterialIcons
                  name="settings"
                  size={24}
                  color={theme.colors.primary}
                />
                <View style={styles.settingInfo}>
                  <Text
                    style={[
                      styles.settingTitle,
                      { color: theme.colors.onBackground },
                    ]}
                  >
                    Square Limits & Pricing
                  </Text>
                  <Text
                    style={[
                      styles.settingValue,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    Max: {maxSelections} squares • ${pricePerSquare.toFixed(2)}{" "}
                    each
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>
            </TouchableOpacity>

            {/* Deadline */}
            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              style={[
                styles.settingCard,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <View style={styles.settingCardContent}>
                <MaterialIcons
                  name="schedule"
                  size={24}
                  color={theme.colors.primary}
                />
                <View style={styles.settingInfo}>
                  <Text
                    style={[
                      styles.settingTitle,
                      { color: theme.colors.onBackground },
                    ]}
                  >
                    Deadline
                  </Text>
                  <Text
                    style={[
                      styles.settingValue,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {deadline.toLocaleDateString()} at{" "}
                    {deadline.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>
            </TouchableOpacity>

            {/* Axis Settings */}
            <View
              style={[
                styles.settingCard,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <View style={styles.settingCardContent}>
                <MaterialIcons
                  name="grid-on"
                  size={24}
                  color={theme.colors.primary}
                />
                <View style={styles.settingInfo}>
                  <Text
                    style={[
                      styles.settingTitle,
                      { color: theme.colors.onBackground },
                    ]}
                  >
                    Randomize Numbers
                  </Text>
                  <Text
                    style={[
                      styles.settingValue,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {randomizeAxis ? "Random order" : "Sequential (0-9)"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setRandomizeAxis(!randomizeAxis)}
                  style={[
                    styles.toggleButton,
                    {
                      backgroundColor: randomizeAxis
                        ? theme.colors.primary
                        : theme.dark
                          ? "#444"
                          : "#ddd",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      {
                        color: randomizeAxis ? "#fff" : theme.colors.onSurface,
                      },
                    ]}
                  >
                    {randomizeAxis ? "ON" : "OFF"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={[
                styles.settingCard,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <View style={styles.settingCardContent}>
                <MaterialIcons
                  name="visibility-off"
                  size={24}
                  color={theme.colors.primary}
                />
                <View style={styles.settingInfo}>
                  <Text
                    style={[
                      styles.settingTitle,
                      { color: theme.colors.onBackground },
                    ]}
                  >
                    Hide Numbers Until Deadline
                  </Text>
                  <Text
                    style={[
                      styles.settingValue,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {hideAxisUntilDeadline ? "Hidden" : "Visible"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    setHideAxisUntilDeadline(!hideAxisUntilDeadline)
                  }
                  style={[
                    styles.toggleButton,
                    {
                      backgroundColor: hideAxisUntilDeadline
                        ? theme.colors.primary
                        : theme.dark
                          ? "#444"
                          : "#ddd",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      {
                        color: hideAxisUntilDeadline
                          ? "#fff"
                          : theme.colors.onSurface,
                      },
                    ]}
                  >
                    {hideAxisUntilDeadline ? "ON" : "OFF"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Notifications */}
            <TouchableOpacity
              onPress={() => setNotifModalVisible(true)}
              style={[
                styles.settingCard,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <View style={styles.settingCardContent}>
                <MaterialIcons
                  name="notifications"
                  size={24}
                  color={theme.colors.primary}
                />
                <View style={styles.settingInfo}>
                  <Text
                    style={[
                      styles.settingTitle,
                      { color: theme.colors.onBackground },
                    ]}
                  >
                    Notifications
                  </Text>
                  <Text
                    style={[
                      styles.settingValue,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {Object.values(notifySettings).filter(Boolean).length}{" "}
                    active
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Create Button */}
          <Button
            mode="contained"
            onPress={createSquareSession}
            loading={loading}
            disabled={loading || !isFormValid}
            style={styles.createButton}
            contentStyle={styles.createButtonContent}
            labelStyle={styles.createButtonLabel}
          >
            {loading ? "Creating..." : "Create Game"}
          </Button>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
          >
            <Text
              style={[
                styles.cancelButtonText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* Modals */}
      <DeadlinePickerModal
        visible={showPicker}
        onDismiss={() => setShowPicker(false)}
        date={deadline}
        onConfirm={(date) => setDeadline(date)}
      />

      <NotificationsModal
        visible={notifModalVisible}
        onDismiss={() => setNotifModalVisible(false)}
        settings={notifySettings}
        onSave={(settings) => setNotifySettings(settings)}
      />

      <PerSquareSettingsModal
        visible={perSquareModalVisible}
        onDismiss={() => setPerSquareModalVisible(false)}
        maxSelections={maxSelections}
        pricePerSquare={pricePerSquare}
        setMaxSelections={setMaxSelections}
        setPricePerSquare={setPricePerSquare}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    marginBottom: 4,
  },
  helperText: {
    fontSize: 12,
    textAlign: "right",
  },
  selectButton: {
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 2,
  },
  selectButtonContent: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  selectButtonText: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 12,
  },
  selectButtonSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  selectedGameInfo: {
    flex: 1,
  },
  selectedTeams: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  selectedTeamName: {
    fontSize: 16,
    fontWeight: "700",
  },
  vsText: {
    fontSize: 14,
    fontWeight: "500",
  },
  changeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingVertical: 8,
  },
  colorButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  checkIcon: {
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  settingCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  settingCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 13,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 50,
    alignItems: "center",
  },
  toggleText: {
    fontSize: 12,
    fontWeight: "700",
  },
  createButton: {
    marginTop: 8,
  },
  createButtonContent: {
    paddingVertical: 8,
  },
  createButtonLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    alignSelf: "center",
    marginTop: 16,
    padding: 12,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});

export default CreateSquareScreen;
