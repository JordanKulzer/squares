import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { TextInput as PaperInput, useTheme, Button } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import DeadlinePickerModal from "../components/DeadlinePickerModal";
import { supabase } from "../lib/supabase";
import PerSquareSettingsModal from "../components/PerSquareSettingsModal";
import Toast from "react-native-toast-message";
import { RootStackParamList } from "../utils/types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type EditSquareRouteParams = {
  EditSquareScreen: {
    gridId: string;
  };
};

const EditSquareScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<EditSquareRouteParams, "EditSquareScreen">>();
  const theme = useTheme();

  const { gridId } = route.params;

  // Form state
  const [inputTitle, setInputTitle] = useState("");
  const [deadline, setDeadline] = useState(new Date());
  const [maxSelections, setMaxSelections] = useState("100");
  const [pricePerSquare, setPricePerSquare] = useState(0);
  const [hideAxisUntilDeadline, setHideAxisUntilDeadline] = useState(true);
  const [randomizeAxis, setRandomizeAxis] = useState(true);
  const [blockMode, setBlockMode] = useState(false);

  // Original values for comparison
  const [originalData, setOriginalData] = useState<any>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [perSquareModalVisible, setPerSquareModalVisible] = useState(false);

  // Game info (read-only display)
  const [team1FullName, setTeam1FullName] = useState("");
  const [team2FullName, setTeam2FullName] = useState("");
  const [hasSelections, setHasSelections] = useState(false);

  useEffect(() => {
    loadSquareData();
  }, [gridId]);

  const loadSquareData = async () => {
    try {
      const { data, error } = await supabase
        .from("squares")
        .select("*")
        .eq("id", gridId)
        .single();

      if (error) throw error;

      setOriginalData(data);
      setInputTitle(data.title || "");
      setDeadline(new Date(data.deadline));
      const isBlock = !!data.block_mode;
      const defaultMax = isBlock ? 25 : 100;
      setMaxSelections(String(data.max_selection || defaultMax));
      setPricePerSquare(data.price_per_square || 0);
      setHideAxisUntilDeadline(data.axis_hidden ?? true);
      setRandomizeAxis(data.randomize_axis ?? true);
      setBlockMode(isBlock);
      setTeam1FullName(data.team1_full_name || data.team1 || "Team 1");
      setTeam2FullName(data.team2_full_name || data.team2 || "Team 2");
      setHasSelections(data.selections && data.selections.length > 0);
    } catch (err) {
      console.error("Error loading square data:", err);
      Toast.show({
        type: "error",
        text1: "Failed to load game data",
        position: "bottom",
        bottomOffset: 60,
      });
      navigation.goBack();
    } finally {
      setLoading(false);
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

  const saveChanges = async () => {
    if (!inputTitle.trim()) {
      Alert.alert("Missing Info", "Please enter a game title");
      return;
    }

    setSaving(true);

    try {
      const updates: any = {
        title: inputTitle.trim(),
        deadline: deadline.toISOString(),
        max_selection: parseInt(maxSelections, 10),
        price_per_square: pricePerSquare,
        axis_hidden: hideAxisUntilDeadline,
      };

      // Handle randomize axis change - only re-randomize if changed from OFF to ON
      // and there are no selections yet
      if (randomizeAxis !== originalData.randomize_axis) {
        if (hasSelections) {
          Alert.alert(
            "Cannot Change",
            "Randomize setting cannot be changed after squares have been selected.",
            [{ text: "OK" }]
          );
          setSaving(false);
          return;
        }

        updates.randomize_axis = randomizeAxis;
        if (randomizeAxis) {
          // Generate new random axes
          updates.x_axis = generateShuffledArray();
          updates.y_axis = generateShuffledArray();
        } else {
          // Reset to sequential
          updates.x_axis = [...Array(10).keys()];
          updates.y_axis = [...Array(10).keys()];
        }
      }

      // Handle block mode change
      if (blockMode !== (originalData.block_mode ?? false)) {
        updates.block_mode = blockMode;
        if (hasSelections) {
          // Selections will be cleared since block mode changed
          updates.selections = [];
        }
      }

      const { error } = await supabase
        .from("squares")
        .update(updates)
        .eq("id", gridId);

      if (error) throw error;

      Toast.show({
        type: "success",
        text1: "Game settings updated",
        text2: "All players will see the changes",
        position: "bottom",
        bottomOffset: 60,
      });

      navigation.goBack();
    } catch (err) {
      console.error("Error saving changes:", err);
      Toast.show({
        type: "error",
        text1: "Failed to save changes",
        position: "bottom",
        bottomOffset: 60,
      });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    if (!originalData) return false;
    return (
      inputTitle.trim() !== originalData.title ||
      deadline.toISOString() !== new Date(originalData.deadline).toISOString() ||
      parseInt(maxSelections, 10) !== originalData.max_selection ||
      pricePerSquare !== originalData.price_per_square ||
      hideAxisUntilDeadline !== originalData.axis_hidden ||
      randomizeAxis !== originalData.randomize_axis ||
      blockMode !== (originalData.block_mode ?? false)
    );
  };

  const gradientColors = theme.dark
    ? (["#121212", "#1d1d1d", "#2b2b2d"] as [string, string, ...string[]])
    : (["#fdfcf9", "#e0e7ff"] as [string, string]);

  if (loading) {
    return (
      <LinearGradient colors={gradientColors} style={{ flex: 1 }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}
          >
            Loading game settings...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradientColors} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <MaterialIcons
              name="edit"
              size={48}
              color={theme.colors.primary}
            />
            <Text
              style={[styles.headerTitle, { color: theme.colors.onBackground }]}
            >
              Edit Game Settings
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Changes will update for all players
            </Text>
          </View>

          {/* Game Info (Read-only) */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.onBackground }]}>
              Game
            </Text>
            <View
              style={[
                styles.readOnlyCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.dark ? "#444" : "#ddd",
                },
              ]}
            >
              <MaterialIcons
                name="sports-football"
                size={24}
                color={theme.colors.primary}
              />
              <View style={styles.gameInfo}>
                <Text
                  style={[styles.gameTeams, { color: theme.colors.onBackground }]}
                >
                  {team1FullName} vs {team2FullName}
                </Text>
                <Text
                  style={[
                    styles.gameNote,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Game cannot be changed after creation
                </Text>
              </View>
              <MaterialIcons
                name="lock"
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          </View>

          {/* Game Title */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.onBackground }]}>
              Game Title
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

          {/* Settings */}
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
                    {blockMode ? "Block Limits & Pricing" : "Square Limits & Pricing"}
                  </Text>
                  <Text
                    style={[
                      styles.settingValue,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    Max: {maxSelections} {blockMode ? "blocks" : "squares"} • ${pricePerSquare.toFixed(2)}{" "}
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

            {/* Randomize Numbers */}
            <View
              style={[
                styles.settingCard,
                {
                  backgroundColor: theme.colors.surface,
                  opacity: hasSelections ? 0.6 : 1,
                },
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
                    {hasSelections && " (locked)"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (hasSelections) {
                      Alert.alert(
                        "Cannot Change",
                        "This setting is locked because squares have already been selected."
                      );
                      return;
                    }
                    setRandomizeAxis(!randomizeAxis);
                  }}
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

            {/* Hide Numbers Until Deadline */}
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
                  onPress={() => setHideAxisUntilDeadline(!hideAxisUntilDeadline)}
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

            {/* 2x2 Block Mode */}
            <View
              style={[
                styles.settingCard,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <View style={styles.settingCardContent}>
                <MaterialIcons
                  name="view-module"
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
                    2x2 Block Mode
                  </Text>
                  <Text
                    style={[
                      styles.settingValue,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {blockMode ? "Select 2x2 blocks" : "Select individual squares"}
                    {hasSelections && blockMode !== (originalData?.block_mode ?? false)
                      ? " (will reset selections)"
                      : ""}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const newValue = !blockMode;
                    if (hasSelections) {
                      Alert.alert(
                        "Warning",
                        "Changing block mode will reset all current selections. Continue?",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Reset & Change",
                            style: "destructive",
                            onPress: () => {
                              setBlockMode(newValue);
                              setMaxSelections(newValue ? "25" : "100");
                            },
                          },
                        ]
                      );
                    } else {
                      setBlockMode(newValue);
                      setMaxSelections(newValue ? "25" : "100");
                    }
                  }}
                  style={[
                    styles.toggleButton,
                    {
                      backgroundColor: blockMode
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
                        color: blockMode ? "#fff" : theme.colors.onSurface,
                      },
                    ]}
                  >
                    {blockMode ? "ON" : "OFF"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Save Button */}
          <Button
            mode="contained"
            onPress={saveChanges}
            loading={saving}
            disabled={saving || !hasChanges()}
            style={styles.saveButton}
            contentStyle={styles.saveButtonContent}
            labelStyle={styles.saveButtonLabel}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>

          {!hasChanges() && (
            <Text
              style={[styles.noChangesText, { color: theme.colors.onSurfaceVariant }]}
            >
              No changes to save
            </Text>
          )}

          {/* Reset Selections */}
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                "Reset All Selections",
                "This will remove all player selections from the grid. This cannot be undone. Continue?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Reset",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        const { error } = await supabase
                          .from("squares")
                          .update({ selections: [] })
                          .eq("id", gridId);
                        if (error) throw error;
                        setHasSelections(false);
                        Toast.show({
                          type: "success",
                          text1: "All selections have been reset",
                          position: "bottom",
                          bottomOffset: 60,
                        });
                      } catch (err) {
                        console.error("Error resetting selections:", err);
                        Toast.show({
                          type: "error",
                          text1: "Failed to reset selections",
                          position: "bottom",
                          bottomOffset: 60,
                        });
                      }
                    },
                  },
                ]
              );
            }}
            style={[
              styles.settingCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.error,
                borderWidth: 1,
                marginTop: 16,
              },
            ]}
          >
            <View style={styles.settingCardContent}>
              <MaterialIcons
                name="restart-alt"
                size={24}
                color={theme.colors.error}
              />
              <View style={styles.settingInfo}>
                <Text
                  style={[
                    styles.settingTitle,
                    { color: theme.colors.error },
                  ]}
                >
                  Reset All Selections
                </Text>
                <Text
                  style={[
                    styles.settingValue,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {hasSelections
                    ? "Clear all player selections from the grid"
                    : "No selections to reset"}
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={theme.colors.error}
              />
            </View>
          </TouchableOpacity>

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

      <PerSquareSettingsModal
        visible={perSquareModalVisible}
        onDismiss={() => setPerSquareModalVisible(false)}
        maxSelections={maxSelections}
        pricePerSquare={pricePerSquare}
        setMaxSelections={setMaxSelections}
        setPricePerSquare={setPricePerSquare}
        blockMode={blockMode}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
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
  readOnlyCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
  },
  gameInfo: {
    flex: 1,
  },
  gameTeams: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  gameNote: {
    fontSize: 12,
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
  saveButton: {
    marginTop: 8,
  },
  saveButtonContent: {
    paddingVertical: 8,
  },
  saveButtonLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  noChangesText: {
    textAlign: "center",
    marginTop: 12,
    fontSize: 14,
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

export default EditSquareScreen;
