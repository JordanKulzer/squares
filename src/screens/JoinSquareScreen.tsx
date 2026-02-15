import React, { useEffect, useMemo, useState } from "react";
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
import { Card, TextInput as PaperInput, useTheme } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import colors from "../../assets/constants/colorOptions";
import { iconOptions } from "../../assets/constants/iconOptions";
import tinycolor from "tinycolor2";
import Icon from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import NotificationsModal from "../components/NotificationsModal";
import {
  scheduleNotifications,
  sendPlayerJoinedNotification,
} from "../utils/notifications";
import { RootStackParamList } from "../utils/types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";
import { acceptInvite } from "../lib/gameInvites";
import { usePremium } from "../contexts/PremiumContext";
import PremiumUpgradeModal from "../components/PremiumUpgradeModal";
import PremiumBadge from "../components/PremiumBadge";
import ColorPickerModal from "../components/ColorPickerModal";

const JoinSquareScreen = () => {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList, "JoinSquareScreen">
    >();
  const route = useRoute<RouteProp<RootStackParamList, "JoinSquareScreen">>();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        alert("You must be logged in.");
        navigation.goBack();
      } else {
        setUser(data.user);
        // Fetch username from users table
        const { data: profile } = await supabase
          .from("users")
          .select("username")
          .eq("id", data.user.id)
          .single();
        if (profile?.username) {
          setUsername(profile.username);
        }
      }
    };

    getUser();
  }, []);
  const theme = useTheme();

  const params = route.params;

  let gridId = "";
  let paramTitle = "";
  let paramDeadline = "";
  let paramUsedColors: string[] = [];
  let inviteId: string | undefined;

  if ("gridId" in params) {
    // normal join path
    gridId = params.gridId;
    paramTitle = params.inputTitle;
    paramDeadline = params.deadline;
    paramUsedColors = params.usedColors ?? [];
  } else if ("sessionId" in params) {
    // deep link path or invite acceptance
    gridId = params.sessionId;
    inviteId = params.inviteId;
  }

  const [username, setUsername] = useState("");
  const [selectedColor, setSelectedColor] = useState(null);
  const [pricePerSquare, setPricePerSquare] = useState<number | null>(null);
  const [blockMode, setBlockMode] = useState(false);
  const [inputTitle, setInputTitle] = useState(paramTitle || "");
  const [deadline, setDeadline] = useState(paramDeadline || null);
  const [usedColors, setUsedColors] = useState<string[]>(paramUsedColors || []);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [notifySettings, setNotifySettings] = useState({
    deadlineReminders: false,
    playerJoined: false,
    playerLeft: false,
    squareDeleted: false,
  });
  const [league, setLeague] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [displayType, setDisplayType] = useState<"color" | "icon" | "initial">(
    "color",
  );
  const [displayValue, setDisplayValue] = useState("");

  // Premium state
  const { isPremium } = usePremium();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showColorPickerModal, setShowColorPickerModal] = useState(false);

  const gradientColors = theme.dark
    ? (["#121212", "#1d1d1d", "#2b2b2d"] as const)
    : (["#fdfcf9", "#e0e7ff"] as const);

  const availableColors = useMemo(() => {
    return colors.colorOptions.filter((color) => !usedColors.includes(color));
  }, [usedColors]);

  useEffect(() => {
    if (!gridId) {
      alert("Invalid session ID.");
      navigation.goBack();
      return;
    }
    const fetchSession = async () => {
      const { data: square, error } = await supabase
        .from("squares")
        .select("title, deadline, price_per_square, id, league, block_mode")
        .eq("id", gridId)
        .single();

      if (error || !square) {
        alert("Session not found.");
        navigation.goBack();
        return;
      }
      setPricePerSquare(square.price_per_square || null);
      setBlockMode(!!square.block_mode);

      setInputTitle(square.title || "Untitled");
      setDeadline(square.deadline || null);
      setLeague(square.league || "NFL");

      const { data: squareWithPlayers } = await supabase
        .from("squares")
        .select("players")
        .eq("id", gridId)
        .single();

      const takenColors =
        squareWithPlayers?.players?.map((p) => p.color).filter(Boolean) || [];
      setUsedColors(takenColors);
    };

    fetchSession();
  }, [gridId]);

  const joinSquare = async () => {
    Keyboard.dismiss();

    if (!username) {
      alert("Could not load your username. Please try again.");
      return;
    }

    if (!selectedColor) {
      alert("Please select a color.");
      return;
    }

    if (displayType === "initial" && !displayValue.trim()) {
      alert("Please enter an initial for your display.");
      return;
    }

    if (displayType === "icon" && !displayValue) {
      alert("Please select an icon for your display.");
      return;
    }

    if (!user) {
      alert("User is not authenticated. Please log in.");
      return;
    }

    setIsJoining(true);

    try {
      const { data: square, error: fetchError } = await supabase
        .from("squares")
        .select("players")
        .eq("id", gridId)
        .single();

      if (fetchError || !square) {
        console.error("Failed to fetch existing players:", fetchError);
        alert("Failed to join. Could not fetch session.");
        setIsJoining(false);
        return;
      }

      const existingPlayers = square.players || [];

      if (existingPlayers.some((p) => p.userId === user.id)) {
        alert("You've already joined this session.");
        setIsJoining(false);
        return;
      }

      const newPlayer = {
        userId: user.id,
        username,
        color: selectedColor,
        displayType,
        displayValue: displayType !== "color" ? displayValue : undefined,
        joined_at: new Date().toISOString(),
        notifySettings,
      };

      const updatedPlayers = [...existingPlayers, newPlayer];

      const { data: updatedSquare, error: updateError } = await supabase
        .from("squares")
        .update({ players: updatedPlayers })
        .eq("id", gridId)
        .select();

      if (updateError) {
        console.error("Update failed:", updateError);
        alert("Failed to join square.");
        setIsJoining(false);
        return;
      }

      if (!updatedSquare || updatedSquare.length === 0) {
        console.warn("No rows updated — gridId may not match.");
        alert("Failed to join — session may not exist.");
        setIsJoining(false);
        return;
      }

      const { error: rpcError } = await supabase.rpc("add_player_to_square", {
        square_id: gridId,
        new_user_id: user.id,
      });

      if (rpcError) {
        console.error("Failed to update player_ids array:", rpcError);
        alert("Joined the session, but failed to update player_ids.");
        setIsJoining(false);
        return;
      }

      // Schedule notifications and send join notification
      if (notifySettings.deadlineReminders && deadline) {
        const deadlineDate = new Date(deadline);
        await scheduleNotifications(deadlineDate, gridId, notifySettings);
      }
      await sendPlayerJoinedNotification(gridId, username, inputTitle);

      // Verify the data was written by polling until we see ourselves in the player list
      let verified = false;
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 200));

        const { data: verifySquare } = await supabase
          .from("squares")
          .select("players, player_ids")
          .eq("id", gridId)
          .single();

        if (
          verifySquare?.players?.some((p) => p.userId === user.id) &&
          verifySquare?.player_ids?.includes(user.id)
        ) {
          verified = true;
          break;
        }
      }

      // If this was from an invite, mark it as accepted now that user has joined
      if (inviteId) {
        await acceptInvite(inviteId);
      }

      // Navigate to SquareScreen - use replace to prevent going back to join screen
      navigation.replace("SquareScreen", {
        gridId,
        inputTitle,
        username,
        deadline,
        eventId: "",
        pricePerSquare,
        league,
      });
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("Something went wrong when trying to join.");
      setIsJoining(false);
    }
  };

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <MaterialIcons
              name="group-add"
              size={48}
              color={theme.colors.primary}
            />
            <Text
              style={[styles.headerTitle, { color: theme.colors.onBackground }]}
            >
              Join {inputTitle}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Set up your preferences to join this game
            </Text>
          </View>

          {/* Color Selection */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.onBackground }]}>
              Your Color *
            </Text>
            <View style={styles.colorGrid}>
              {availableColors.map((color) => (
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
              {/* Custom Color Button (Premium) */}
              <TouchableOpacity
                onPress={() => {
                  if (isPremium) {
                    setShowColorPickerModal(true);
                  } else {
                    setShowPremiumModal(true);
                  }
                }}
                style={[
                  styles.colorButton,
                  {
                    backgroundColor: theme.dark ? "#333" : "#e8e8e8",
                    borderWidth: 2,
                    borderColor: theme.colors.primary,
                    borderStyle: "dashed",
                  },
                ]}
              >
                <MaterialIcons
                  name="colorize"
                  size={20}
                  color={theme.colors.primary}
                />
                {!isPremium && <PremiumBadge size={10} />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Display Style */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.onBackground }]}>
              Display Style
            </Text>
            <View style={styles.displayTypeRow}>
              {(["color", "icon", "initial"] as const).map((type) => {
                const isLocked = type !== "color" && !isPremium;
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => {
                      if (isLocked) {
                        setShowPremiumModal(true);
                        return;
                      }
                      setDisplayType(type);
                      if (type === "icon") setDisplayValue("sports-football");
                      else if (type === "initial") setDisplayValue("");
                      else setDisplayValue("");
                    }}
                    style={[
                      styles.displayTypeButton,
                      {
                        backgroundColor:
                          displayType === type
                            ? theme.colors.primary
                            : theme.dark
                              ? "#333"
                              : "#e8e8e8",
                        opacity: isLocked ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.displayTypeText,
                        {
                          color:
                            displayType === type
                              ? "#fff"
                              : theme.colors.onBackground,
                        },
                      ]}
                    >
                      {type === "color"
                        ? "Color Only"
                        : type === "icon"
                          ? "Icon"
                          : "Initial"}
                    </Text>
                    {isLocked && <PremiumBadge size={10} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {displayType === "icon" && (
              <View style={styles.iconGrid}>
                {iconOptions.map((icon) => {
                  const isLocked = icon.isPremium && !isPremium;
                  return (
                    <TouchableOpacity
                      key={icon.name}
                      onPress={() => {
                        if (isLocked) {
                          setShowPremiumModal(true);
                        } else {
                          setDisplayValue(icon.name);
                        }
                      }}
                      style={[
                        styles.iconButton,
                        {
                          backgroundColor: selectedColor
                            ? tinycolor(selectedColor).setAlpha(0.2).toRgbString()
                            : theme.dark
                              ? "#333"
                              : "#e8e8e8",
                          borderWidth: displayValue === icon.name ? 3 : 0,
                          borderColor: theme.colors.primary,
                          transform: [
                            { scale: displayValue === icon.name ? 1.1 : 1 },
                          ],
                          opacity: isLocked ? 0.5 : 1,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={icon.name}
                        size={22}
                        color={selectedColor || theme.colors.onBackground}
                      />
                      {isLocked && <PremiumBadge size={10} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {displayType === "initial" && (
              <View style={styles.initialRow}>
                <PaperInput
                  label="Your Initial (1 letter)"
                  value={displayValue}
                  onChangeText={(text) => setDisplayValue(text.slice(0, 1))}
                  maxLength={1}
                  style={[styles.initialInput, { backgroundColor: theme.dark ? "#1e1e1e" : "#fff" }]}
                  autoCapitalize="characters"
                />
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
                    Preview
                  </Text>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: selectedColor
                        ? tinycolor(selectedColor).setAlpha(0.3).toRgbString()
                        : theme.dark ? "#333" : "#e8e8e8",
                      borderWidth: 1,
                      borderColor: theme.dark ? "#555" : "#ccc",
                    }}
                  >
                    {selectedColor && displayValue ? (
                      <Text style={{ fontSize: 22, fontWeight: "700", color: selectedColor }}>
                        {displayValue.toUpperCase()}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Game Settings */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.onBackground }]}>
              Game Settings
            </Text>

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

            {/* Price Per Square */}
            {pricePerSquare != null && pricePerSquare > 0 && (
              <View
                style={[
                  styles.settingCard,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <View style={styles.settingCardContent}>
                  <MaterialIcons
                    name="attach-money"
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
                      {blockMode ? "Price Per Block" : "Price Per Square"}
                    </Text>
                    <Text
                      style={[
                        styles.settingValue,
                        { color: theme.colors.primary, fontWeight: "700" },
                      ]}
                    >
                      ${pricePerSquare.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Join Button */}
          <TouchableOpacity
            onPress={joinSquare}
            disabled={!selectedColor || isJoining}
            style={[
              styles.joinButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: !selectedColor || isJoining ? 0.4 : 1,
              },
            ]}
          >
            <Text style={styles.joinButtonText}>
              {isJoining ? "Joining..." : "Join Game"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.cancelButtonContainer}
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

      <NotificationsModal
        visible={notifModalVisible}
        onDismiss={() => setNotifModalVisible(false)}
        settings={notifySettings}
        onSave={(settings) => setNotifySettings(settings)}
      />

      <PremiumUpgradeModal
        visible={showPremiumModal}
        onDismiss={() => setShowPremiumModal(false)}
        feature="premium icons"
      />

      <ColorPickerModal
        visible={showColorPickerModal}
        onDismiss={() => setShowColorPickerModal(false)}
        onColorSelect={(color) => setSelectedColor(color)}
        initialColor={selectedColor || "#5e60ce"}
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
  joinButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#5e60ce",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButtonContainer: {
    alignSelf: "center",
    marginTop: 16,
    padding: 12,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  displayTypeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  displayTypeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  displayTypeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingVertical: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  initialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  initialInput: {
    flex: 3,
  },
});

export default JoinSquareScreen;
