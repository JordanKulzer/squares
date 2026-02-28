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
import {
  iconOptions,
  BADGE_EMOJI_MAP,
} from "../../assets/constants/iconOptions";
import tinycolor from "tinycolor2";
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
import { usePremium } from "../contexts/PremiumContext";
import { adService } from "../services/adService";
import PremiumUpgradeModal from "../components/PremiumUpgradeModal";
import PremiumBadge from "../components/PremiumBadge";
import ColorPickerModal from "../components/ColorPickerModal";
import {
  getActiveSquareCount,
  getAvailableCredits,
  consumeCredit,
  recordGameJoin,
  awardBadgeIfNew,
  FREE_MAX_ACTIVE,
} from "../utils/squareLimits";

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
    isCustomGame?: boolean;
    isPublic?: boolean;
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
  const [isCustomGame, setIsCustomGame] = useState(false);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  });
  const [selectedColor, setSelectedColor] = useState(null);
  const [randomizeAxis, setRandomizeAxis] = useState(true);
  const [maxSelections, setMaxSelections] = useState("100");
  const [pricePerSquare, setPricePerSquare] = useState(0);
  const [eventId, setEventId] = useState("");
  const [hideAxisUntilDeadline, setHideAxisUntilDeadline] = useState(true);
  const [blockMode, setBlockMode] = useState(false);
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [showPicker, setShowPicker] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [perSquareModalVisible, setPerSquareModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [displayType, setDisplayType] = useState<"color" | "icon" | "initial">(
    "color",
  );
  const [displayValue, setDisplayValue] = useState("");
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [notifySettings, setNotifySettings] = useState({
    deadlineReminders: false,
    playerJoined: false,
    playerLeft: false,
    squareDeleted: false,
  });

  // Premium and ad state
  const { isPremium } = usePremium();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showColorPickerModal, setShowColorPickerModal] = useState(false);
  const [adLoading, setAdLoading] = useState(false);
  const [hasWatchedAd, setHasWatchedAd] = useState(false);

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
    if (params.isCustomGame) setIsCustomGame(params.isCustomGame);
    if (params.isPublic) setIsPublic(params.isPublic);
    if (params.deadline) setDeadline(new Date(params.deadline));
    if (params.inputTitle) setInputTitle(params.inputTitle);
    // Fetch username, active badge, and earned badges from users table
    const fetchUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("username, active_badge")
          .eq("id", user.id)
          .single();
        if (profile?.username) setUsername(profile.username);
        // Auto-default to active badge emoji if set
        if (profile?.active_badge && BADGE_EMOJI_MAP[profile.active_badge]) {
          setDisplayType("icon");
          setDisplayValue(
            `emoji:${BADGE_EMOJI_MAP[profile.active_badge].emoji}`,
          );
        }
        // Fetch earned badges for icon picker
        const { data: badgeData } = await supabase
          .from("badges")
          .select("badge_type")
          .eq("user_id", user.id);
        if (badgeData) {
          setEarnedBadges(badgeData.map((b) => b.badge_type));
        }
      }
    };
    if (!params.username) fetchUserData();
    else setUsername(params.username);
    setMaxSelections(
      params.maxSelections !== undefined ? String(params.maxSelections) : "100",
    );
    if (params.selectedColor) setSelectedColor(params.selectedColor);
    if (params.eventId) setEventId(params.eventId);
    if (params.pricePerSquare) setPricePerSquare(params.pricePerSquare);
  }, [route.params]);

  // Preload rewarded ad when screen mounts (if not premium)
  useEffect(() => {
    if (!isPremium) {
      adService.loadRewardedAd().catch(console.error);
      adService.loadInterstitialAd().catch(console.error);
    }
  }, [isPremium]);

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
      Alert.alert(
        "Missing Info",
        "Could not load your username. Please try again.",
      );
      return;
    }
    if (!team1 || !team2) {
      Alert.alert(
        "Missing Info",
        isCustomGame ? "Please enter both team names" : "Please select a game",
      );
      return;
    }
    if (!selectedColor) {
      Alert.alert("Missing Info", "Please choose your color");
      return;
    }
    if (displayType === "initial" && !displayValue.trim()) {
      Alert.alert("Missing Info", "Please enter an initial for your display");
      return;
    }
    if (displayType === "icon" && !displayValue) {
      Alert.alert("Missing Info", "Please select an icon for your display");
      return;
    }

    // Gate with rewarded ad if not premium and hasn't watched ad
    if (!isPremium && !hasWatchedAd) {
      setAdLoading(true);
      try {
        if (!adService.isRewardedAdReady()) {
          await adService.loadRewardedAd();
        }
        const earned = await adService.showRewardedAd();
        if (earned) {
          setHasWatchedAd(true);
        } else {
          setAdLoading(false);
          return; // User closed ad without watching
        }
      } catch (err) {
        console.error("Ad error:", err);
        // Allow creation if ad fails (graceful degradation)
        setHasWatchedAd(true);
      }
      setAdLoading(false);
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Check active square limit for free users
    let needsCredit = false;
    if (!isPremium) {
      const activeCount = await getActiveSquareCount(user.id);
      if (activeCount >= FREE_MAX_ACTIVE) {
        const credits = await getAvailableCredits(user.id);
        if (credits > 0) {
          needsCredit = true;
        } else {
          setLoading(false);
          setShowPremiumModal(true);
          return;
        }
      }
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
                displayType,
                displayValue:
                  displayType !== "color" ? displayValue : undefined,
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
            league: league || (isCustomGame ? "Custom" : "NFL"),
            block_mode: blockMode,
            is_custom_game: isCustomGame,
            is_public: isPublic,
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

      // Consume credit if needed, and record the game join
      if (needsCredit) {
        await consumeCredit(user.id, data.id);
      }
      recordGameJoin(user.id).catch(console.error);
      awardBadgeIfNew(user.id, "first_public_create").catch(console.error);

      if (notifySettings.deadlineReminders) {
        await scheduleNotifications(deadline, data.id, notifySettings);
      }

      // Show interstitial (non-blocking fallback) for non-premium users
      if (!isPremium) {
        try {
          if (!adService.isInterstitialReady()) {
            await adService.loadInterstitialAd();
          }
          // showInterstitialAd returns true if shown (or resolves true in Expo Go)
          await adService.showInterstitialAd();
        } catch (e) {
          console.warn("Interstitial ad error", e);
        }
      }

      navigation.navigate("SquareScreen", {
        gridId: data.id,
        inputTitle: inputTitle.trim(),
        username: username.trim(),
        deadline: deadline.toISOString(),
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

  const isFormValid = inputTitle.trim() && team1 && team2 && selectedColor;

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
              placeholder="e.g., Super Bowl 2026, Office Pool, etc."
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

          {/* Game Type Selection */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.onBackground }]}>
              Game Type *
            </Text>
            <View style={styles.gameTypeRow}>
              <TouchableOpacity
                onPress={() => {
                  setIsCustomGame(false);
                  // Clear custom team names when switching to API
                  if (isCustomGame) {
                    setTeam1("");
                    setTeam2("");
                    setTeam1FullName("");
                    setTeam2FullName("");
                  }
                }}
                style={[
                  styles.gameTypeButton,
                  {
                    backgroundColor: !isCustomGame
                      ? theme.colors.primary
                      : theme.dark
                        ? "#333"
                        : "#e8e8e8",
                  },
                ]}
              >
                <MaterialIcons
                  name="event"
                  size={18}
                  color={!isCustomGame ? "#fff" : theme.colors.onBackground}
                />
                <Text
                  style={[
                    styles.gameTypeText,
                    {
                      color: !isCustomGame ? "#fff" : theme.colors.onBackground,
                    },
                  ]}
                >
                  Scheduled Game
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setIsCustomGame(true);
                  setEventId(""); // Clear API event ID
                  setLeague("");
                }}
                style={[
                  styles.gameTypeButton,
                  {
                    backgroundColor: isCustomGame
                      ? theme.colors.primary
                      : theme.dark
                        ? "#333"
                        : "#e8e8e8",
                  },
                ]}
              >
                <MaterialIcons
                  name="edit"
                  size={18}
                  color={isCustomGame ? "#fff" : theme.colors.onBackground}
                />
                <Text
                  style={[
                    styles.gameTypeText,
                    {
                      color: isCustomGame ? "#fff" : theme.colors.onBackground,
                    },
                  ]}
                >
                  Custom Game
                </Text>
              </TouchableOpacity>
            </View>

            {/* Scheduled Game Picker */}
            {!isCustomGame && (
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
                    marginTop: 12,
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
                      style={[
                        styles.changeText,
                        { color: theme.colors.primary },
                      ]}
                    >
                      Change Game
                    </Text>
                  </View>
                ) : (
                  <View style={styles.selectButtonContent}>
                    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                      <MaterialIcons
                        name="sports-football"
                        size={28}
                        color={theme.colors.primary}
                      />
                      <MaterialIcons
                        name="sports-basketball"
                        size={28}
                        color={theme.colors.primary}
                      />
                    </View>
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
            )}

            {/* Custom Game Team Inputs */}
            {isCustomGame && (
              <View style={styles.customGameInputs}>
                <PaperInput
                  mode="outlined"
                  label="Team 1 Name"
                  value={team1FullName}
                  onChangeText={(text) => {
                    setTeam1FullName(text);
                    setTeam1(text); // Also set short name
                  }}
                  placeholder="e.g., Kansas City Chiefs"
                  style={[
                    styles.input,
                    { backgroundColor: theme.colors.surface },
                  ]}
                  maxLength={50}
                />
                <PaperInput
                  mode="outlined"
                  label="Team 2 Name"
                  value={team2FullName}
                  onChangeText={(text) => {
                    setTeam2FullName(text);
                    setTeam2(text); // Also set short name
                  }}
                  placeholder="e.g., Philadelphia Eagles"
                  style={[
                    styles.input,
                    { backgroundColor: theme.colors.surface, marginTop: 8 },
                  ]}
                  maxLength={50}
                />
                <Text
                  style={[
                    styles.helperText,
                    {
                      color: theme.colors.onSurfaceVariant,
                      marginTop: 8,
                      textAlign: "left",
                    },
                  ]}
                >
                  Enter your own team names. You'll be able to enter scores
                  manually.
                </Text>
              </View>
            )}
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
              <View>
                {/* Earned Badge Emojis */}
                {earnedBadges.length > 0 && (
                  <>
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Rubik_500Medium",
                        color: theme.colors.onSurfaceVariant,
                        marginBottom: 6,
                        marginTop: 4,
                      }}
                    >
                      Earned Badges
                    </Text>
                    <View style={styles.iconGrid}>
                      {earnedBadges.map((badgeType) => {
                        const badge = BADGE_EMOJI_MAP[badgeType];
                        if (!badge) return null;
                        const val = `emoji:${badge.emoji}`;
                        return (
                          <TouchableOpacity
                            key={badgeType}
                            onPress={() => setDisplayValue(val)}
                            style={[
                              styles.iconButton,
                              {
                                backgroundColor: selectedColor
                                  ? tinycolor(selectedColor)
                                      .setAlpha(0.2)
                                      .toRgbString()
                                  : theme.dark
                                    ? "#333"
                                    : "#e8e8e8",
                                borderWidth: displayValue === val ? 3 : 0,
                                borderColor: theme.colors.primary,
                                transform: [
                                  { scale: displayValue === val ? 1.1 : 1 },
                                ],
                              },
                            ]}
                          >
                            <Text style={{ fontSize: 20 }}>{badge.emoji}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}
                {/* Premium Icons */}
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Rubik_500Medium",
                    color: theme.colors.onSurfaceVariant,
                    marginBottom: 6,
                    marginTop: earnedBadges.length > 0 ? 12 : 4,
                  }}
                >
                  {isPremium ? "Icons" : "Premium Icons"}
                </Text>
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
                              ? tinycolor(selectedColor)
                                  .setAlpha(0.2)
                                  .toRgbString()
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
              </View>
            )}

            {displayType === "initial" && (
              <View style={styles.initialRow}>
                <PaperInput
                  label="Your Initial (1 letter)"
                  value={displayValue}
                  onChangeText={(text) => setDisplayValue(text.slice(0, 1))}
                  maxLength={1}
                  style={[
                    styles.initialInput,
                    { backgroundColor: theme.dark ? "#1e1e1e" : "#fff" },
                  ]}
                  autoCapitalize="characters"
                />
                <View style={{ alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 11,
                      color: theme.colors.onSurfaceVariant,
                      marginBottom: 4,
                    }}
                  >
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
                        : theme.dark
                          ? "#333"
                          : "#e8e8e8",
                      borderWidth: 1,
                      borderColor: theme.dark ? "#555" : "#ccc",
                    }}
                  >
                    {selectedColor && displayValue ? (
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: "700",
                          color: selectedColor,
                        }}
                      >
                        {displayValue.toUpperCase()}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Settings Card */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.onBackground }]}>
              Game Settings
            </Text>
            {/* Public Square */}
            <View
              style={[
                styles.settingCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderWidth: 0,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <MaterialIcons
                  name="public"
                  size={24}
                  color={theme.colors.primary}
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.settingTitle,
                      { color: theme.colors.onBackground },
                    ]}
                  >
                    Visibility
                  </Text>
                  <Text
                    style={[
                      styles.settingValue,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {isPublic
                      ? "Listed in Browse — anyone can join"
                      : "Private — invite only"}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  onPress={() => setIsPublic(false)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: "center",
                    backgroundColor:
                      isPublic === false
                        ? theme.colors.primary
                        : theme.dark
                          ? "#333"
                          : "#eee",
                  }}
                >
                  <MaterialIcons
                    name="lock"
                    size={18}
                    color={
                      isPublic === false
                        ? "#fff"
                        : theme.colors.onSurfaceVariant
                    }
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "Rubik_500Medium",
                      color:
                        isPublic === false
                          ? "#fff"
                          : theme.colors.onSurfaceVariant,
                      marginTop: 4,
                    }}
                  >
                    Private
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsPublic(true)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: "center",
                    backgroundColor:
                      isPublic === true
                        ? theme.colors.primary
                        : theme.dark
                          ? "#333"
                          : "#eee",
                  }}
                >
                  <MaterialIcons
                    name="public"
                    size={18}
                    color={
                      isPublic === true ? "#fff" : theme.colors.onSurfaceVariant
                    }
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "Rubik_500Medium",
                      color:
                        isPublic === true
                          ? "#fff"
                          : theme.colors.onSurfaceVariant,
                      marginTop: 4,
                    }}
                  >
                    Public
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
                    {blockMode
                      ? "Select 2x2 blocks"
                      : "Select individual squares"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const newBlockMode = !blockMode;
                    setBlockMode(newBlockMode);
                    setMaxSelections(newBlockMode ? "25" : "100");
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
                    {blockMode
                      ? "Block Limits & Pricing"
                      : "Square Limits & Pricing"}
                  </Text>
                  <Text
                    style={[
                      styles.settingValue,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    Max: {maxSelections} {blockMode ? "blocks" : "squares"} • $
                    {pricePerSquare.toFixed(2)} each
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
            loading={loading || adLoading}
            disabled={loading || adLoading || !isFormValid}
            style={styles.createButton}
            contentStyle={styles.createButtonContent}
            labelStyle={styles.createButtonLabel}
          >
            {adLoading
              ? "Loading Ad..."
              : loading
                ? "Creating..."
                : "Create Game"}
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
        blockMode={blockMode}
      />

      <PremiumUpgradeModal
        visible={showPremiumModal}
        onDismiss={() => setShowPremiumModal(false)}
        feature="premium icons"
        context="square_limit"
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
  gameTypeRow: {
    flexDirection: "row",
    gap: 10,
  },
  gameTypeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  gameTypeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  customGameInputs: {
    marginTop: 12,
  },
});

export default CreateSquareScreen;
