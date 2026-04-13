import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Animated,
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
import { RouteProp, useFocusEffect, useRoute } from "@react-navigation/native";
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
import { usePremiumGate } from "../hooks/usePremiumGate";
import AnimatedColorDot from "../components/AnimatedColorDot";
import AnimatedIconButton from "../components/AnimatedIconButton";
import PremiumBadge from "../components/PremiumBadge";
import ColorPickerModal from "../components/ColorPickerModal";
import {
  getActiveSquareCount,
  getAvailableCredits,
  consumeCredit,
  refundCredit,
  recordGameJoin,
  awardBadgeIfNew,
  FREE_MAX_ACTIVE,
} from "../utils/squareLimits";
import {
  ColorOwnership,
  getColorOwnership,
  isColorSelectable,
} from "../utils/colorOwnership";
import { useFreeCredits } from "../hooks/useFreeCredits";

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
  const [dataLoading, setDataLoading] = useState(true);
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

  // Advanced section collapsed state — collapsed by default to reduce noise
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  // Premium and ad state
  const { isPremium } = usePremium();
  const premiumGate = usePremiumGate();
  const [showColorPickerModal, setShowColorPickerModal] = useState(false);
  const [adLoading, setAdLoading] = useState(false);
  const [hasWatchedAd, setHasWatchedAd] = useState(false);

  // Free square credits
  const freeCredits = useFreeCredits();
  const userIdRef = useRef<string | null>(null);

  // Field-level validation errors (shown inline, cleared on change)
  const [titleError, setTitleError] = useState(false);
  const [gameError, setGameError] = useState(false);
  const [colorError, setColorError] = useState(false);

  // Shake animation values for each required section
  const titleShakeAnim = useRef(new Animated.Value(0)).current;
  const gameShakeAnim = useRef(new Animated.Value(0)).current;
  const colorShakeAnim = useRef(new Animated.Value(0)).current;

  const runShake = (anim: Animated.Value) => {
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, { toValue: 7, duration: 55, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -7, duration: 55, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 5, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -5, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();
  };

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
    if (params.team1) { setTeam1(params.team1); setGameError(false); }
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
    const fetchUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        userIdRef.current = user.id;
        freeCredits.fetch(user.id);
        const { data: profile } = await supabase
          .from("users")
          .select("username, active_badge")
          .eq("id", user.id)
          .single();
        if (profile?.username) setUsername(profile.username);
        if (profile?.active_badge && BADGE_EMOJI_MAP[profile.active_badge]) {
          setDisplayType("icon");
          setDisplayValue(
            `emoji:${BADGE_EMOJI_MAP[profile.active_badge].emoji}`,
          );
        }
        const { data: badgeData } = await supabase
          .from("badges")
          .select("badge_type")
          .eq("user_id", user.id);
        if (badgeData) {
          setEarnedBadges(badgeData.map((b) => b.badge_type));
        }
      }
    };
    if (!params.username) {
      fetchUserData().finally(() => setDataLoading(false));
    } else {
      setUsername(params.username);
      setDataLoading(false);
    }
    setMaxSelections(
      params.maxSelections !== undefined ? String(params.maxSelections) : "100",
    );
    if (params.selectedColor) setSelectedColor(params.selectedColor);
    if (params.eventId) setEventId(params.eventId);
    if (params.pricePerSquare) setPricePerSquare(params.pricePerSquare);
  }, [route.params]);

  useEffect(() => {
    if (!isPremium) {
      adService.loadRewardedAd().catch(console.error);
      adService.loadInterstitialAd().catch(console.error);
    }
  }, [isPremium]);

  useFocusEffect(
    useCallback(() => {
      if (userIdRef.current) {
        freeCredits.fetch(userIdRef.current);
        console.log("[freeCredits] free_credit_balance_refreshed screen=CreateSquareScreen");
      }
    }, []),
  );

  const generateShuffledArray = () => {
    const arr = [...Array(10).keys()];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const createSquareSession = async () => {
    // Validate all required fields, collect errors, shake all invalid sections at once
    const missingTitle = !inputTitle.trim();
    const missingGame = isCustomGame ? (!team1 || !team2) : !team1;
    const missingColor = !selectedColor;

    if (missingTitle || missingGame || missingColor) {
      if (missingTitle) { setTitleError(true); runShake(titleShakeAnim); }
      if (missingGame) { setGameError(true); runShake(gameShakeAnim); }
      if (missingColor) { setColorError(true); runShake(colorShakeAnim); }
      return;
    }

    if (!username.trim()) {
      Alert.alert(
        "Missing Info",
        "Could not load your username. Please try again.",
      );
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
          return;
        }
      } catch (err) {
        console.error("Ad error:", err);
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

    let consumedCreditId: string | null = null;
    if (!isPremium) {
      const activeCount = await getActiveSquareCount(user.id);
      if (activeCount >= FREE_MAX_ACTIVE) {
        const credits = await getAvailableCredits(user.id);
        if (credits > 0) {
          console.log(`[freeCredits] free_credit_prompt_shown screen=CreateSquareScreen balance=${credits}`);
          const confirmed = await new Promise<boolean>((resolve) => {
            Alert.alert(
              "Use Free Square Credit?",
              `You have ${credits} free credit${credits !== 1 ? "s" : ""}. 1 will be used to create this game.`,
              [
                { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                { text: "Use Credit", onPress: () => resolve(true) },
              ],
            );
          });
          if (!confirmed) {
            setLoading(false);
            return;
          }
          consumedCreditId = await consumeCredit(user.id);
          if (!consumedCreditId) {
            setLoading(false);
            freeCredits.fetch(user.id);
            Alert.alert(
              "Credit Unavailable",
              "Your free credit could not be applied. It may have already been used. Please try again or upgrade to Premium.",
            );
            return;
          }
        } else {
          setLoading(false);
          premiumGate.open("square_limit");
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

      if (error || !data) {
        if (consumedCreditId) {
          await refundCredit(consumedCreditId, user.id);
          freeCredits.fetch(user.id);
        }
        console.error("Error inserting into Supabase:", error);
        Alert.alert("Error", "Failed to create game. Please try again.");
        setLoading(false);
        return;
      }

      if (consumedCreditId) {
        console.log(`[freeCredits] free_credit_used screen=CreateSquareScreen squareId=${data.id}`);
        freeCredits.fetch(user.id);
      }
      recordGameJoin(user.id).catch(console.error);
      awardBadgeIfNew(user.id, "first_public_create").catch(console.error);

      if (notifySettings.deadlineReminders) {
        await scheduleNotifications(deadline, data.id, notifySettings);
      }

      if (!isPremium) {
        try {
          if (!adService.isInterstitialReady()) {
            await adService.loadInterstitialAd();
          }
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

  // Build advanced settings summary for collapsed state
  const advancedParts: string[] = [];
  if (hideAxisUntilDeadline) advancedParts.push("Numbers hidden");
  if (randomizeAxis) advancedParts.push("Randomized");
  if (blockMode) advancedParts.push("Block mode");
  const activeNotifCount = Object.values(notifySettings).filter(Boolean).length;
  if (activeNotifCount > 0) advancedParts.push(`${activeNotifCount} alert${activeNotifCount !== 1 ? "s" : ""}`);
  const advancedSummary = advancedParts.length > 0
    ? advancedParts.join(" · ")
    : "All defaults";

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
              size={44}
              color={theme.colors.primary}
            />
            <Text
              style={[styles.headerTitle, { color: theme.colors.onBackground }]}
            >
              Create Your Square
            </Text>
          </View>

          {/* ── 1. Game Title ─────────────────────────────────────── */}
          <Animated.View
            style={[styles.section, { transform: [{ translateX: titleShakeAnim }] }]}
          >
            <Text style={[styles.label, { color: theme.colors.onBackground }]}>
              Game Title *
            </Text>
            <PaperInput
              mode="outlined"
              value={inputTitle}
              onChangeText={(text) => {
                setInputTitle(text);
                if (titleError) setTitleError(false);
              }}
              placeholder="e.g., Super Bowl 2026, Office Pool…"
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
              maxLength={50}
              error={titleError}
            />
            {titleError ? (
              <Text style={styles.fieldError}>Please enter a game title</Text>
            ) : (
              <Text style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>
                {inputTitle.length}/50
              </Text>
            )}
          </Animated.View>

          {/* ── 2. Game Selection ─────────────────────────────────── */}
          <Animated.View
            style={[styles.section, { transform: [{ translateX: gameShakeAnim }] }]}
          >
            <Text style={[styles.label, { color: theme.colors.onBackground }]}>
              Game *
            </Text>

            {/* Game type toggle */}
            <View style={styles.gameTypeRow}>
              <TouchableOpacity
                onPress={() => {
                  setIsCustomGame(false);
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
                      : theme.dark ? "#333" : "#e8e8e8",
                  },
                ]}
              >
                <MaterialIcons
                  name="event"
                  size={16}
                  color={!isCustomGame ? "#fff" : theme.colors.onBackground}
                />
                <Text
                  style={[
                    styles.gameTypeText,
                    { color: !isCustomGame ? "#fff" : theme.colors.onBackground },
                  ]}
                >
                  Scheduled
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setIsCustomGame(true);
                  setEventId("");
                  setLeague("");
                }}
                style={[
                  styles.gameTypeButton,
                  {
                    backgroundColor: isCustomGame
                      ? theme.colors.primary
                      : theme.dark ? "#333" : "#e8e8e8",
                  },
                ]}
              >
                <MaterialIcons
                  name="edit"
                  size={16}
                  color={isCustomGame ? "#fff" : theme.colors.onBackground}
                />
                <Text
                  style={[
                    styles.gameTypeText,
                    { color: isCustomGame ? "#fff" : theme.colors.onBackground },
                  ]}
                >
                  Custom
                </Text>
              </TouchableOpacity>
            </View>

            {/* Scheduled game picker / selected matchup card */}
            {!isCustomGame && (
              <TouchableOpacity
                onPress={() =>
                  !dataLoading && navigation.navigate("GamePickerScreen", {
                    team1,
                    team2,
                    deadline: deadline.toISOString(),
                    inputTitle,
                    username,
                    maxSelections,
                    selectedColor,
                  })
                }
                activeOpacity={0.75}
                style={[
                  team1 && team2 ? styles.matchupCard : styles.selectButton,
                  {
                    backgroundColor: team1 && team2
                      ? theme.colors.primary + "18"
                      : theme.colors.surface,
                    borderColor: team1 && team2
                      ? theme.colors.primary
                      : theme.dark ? "#444" : "#ddd",
                    borderWidth: team1 && team2 ? 2 : 1,
                    marginTop: 10,
                  },
                ]}
              >
                {dataLoading ? (
                  <View style={{ gap: 8, paddingVertical: 4 }}>
                    <View style={{ width: "55%", height: 16, borderRadius: 5, backgroundColor: theme.dark ? "#2b2b2d" : "#e8e8f0" }} />
                    <View style={{ width: "40%", height: 12, borderRadius: 4, backgroundColor: theme.dark ? "#2b2b2d" : "#e8e8f0" }} />
                  </View>
                ) : team1 && team2 ? (
                  // Confirmed matchup card
                  <View style={styles.matchupCardInner}>
                    {league ? (
                      <View style={[styles.leagueTag, { backgroundColor: theme.colors.primary + "1A" }]}>
                        <Text style={[styles.leagueTagText, { color: theme.colors.primary }]}>
                          {league.toUpperCase()}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={[styles.matchupTeams, { color: theme.colors.onBackground }]} numberOfLines={1}>
                      {team1FullName || team1}
                      <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: "Rubik_400Regular" }}> vs </Text>
                      {team2FullName || team2}
                    </Text>
                    <Text style={[styles.matchupMeta, { color: theme.colors.onSurfaceVariant }]}>
                      {deadline.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                      {" · "}
                      {deadline.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                    <Text style={[styles.matchupChange, { color: theme.colors.primary }]}>
                      Change game
                    </Text>
                  </View>
                ) : (
                  // Empty state prompt
                  <View style={styles.selectButtonContent}>
                    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                      <MaterialIcons name="sports-football" size={26} color={theme.colors.primary} />
                      <MaterialIcons name="sports-basketball" size={26} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.selectButtonText, { color: theme.colors.onBackground }]}>
                      Choose a Game
                    </Text>
                    <Text style={[styles.selectButtonSubtext, { color: theme.colors.onSurfaceVariant }]}>
                      Browse upcoming matchups
                    </Text>
                  </View>
                )}
                {!(team1 && team2) && (
                  <MaterialIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
                )}
              </TouchableOpacity>
            )}

            {/* Custom game inputs */}
            {isCustomGame && (
              <View style={styles.customGameInputs}>
                <PaperInput
                  mode="outlined"
                  label="Team 1 Name"
                  value={team1FullName}
                  onChangeText={(text) => {
                    setTeam1FullName(text);
                    setTeam1(text);
                    if (gameError) setGameError(false);
                  }}
                  placeholder="e.g., Kansas City Chiefs"
                  style={[styles.input, { backgroundColor: theme.colors.surface }]}
                  maxLength={50}
                />
                <PaperInput
                  mode="outlined"
                  label="Team 2 Name"
                  value={team2FullName}
                  onChangeText={(text) => {
                    setTeam2FullName(text);
                    setTeam2(text);
                  }}
                  placeholder="e.g., Philadelphia Eagles"
                  style={[styles.input, { backgroundColor: theme.colors.surface, marginTop: 8 }]}
                  maxLength={50}
                />
                <Text style={[styles.helperText, { color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: "left" }]}>
                  You'll enter scores manually.
                </Text>
              </View>
            )}
            {gameError && (
              <Text style={styles.fieldError}>
                {isCustomGame ? "Please enter both team names" : "Please select a game"}
              </Text>
            )}
          </Animated.View>

          {/* ── 3. Appearance (Color + Display Style merged) ──────── */}
          <Animated.View
            style={[styles.section, { transform: [{ translateX: colorShakeAnim }] }]}
          >
            <Text style={[styles.label, { color: theme.colors.onBackground }]}>
              Your Appearance *
            </Text>

            {/* Color picker */}
            <View style={styles.colorGrid}>
              {dataLoading ? (
                [...colors.colorOptions, "__custom__"].map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: theme.dark ? "#2b2b2d" : "#e8e8f0",
                    }}
                  />
                ))
              ) : (
                <>
                  {colors.colorOptions.map((color) => {
                    const ownership = getColorOwnership(color, null, [], colors.colorOptions);
                    return (
                      <AnimatedColorDot
                        key={color}
                        color={color}
                        isSelected={selectedColor === color}
                        onPress={() => {
                          if (isColorSelectable(ownership)) {
                            setSelectedColor(color);
                            if (colorError) setColorError(false);
                          }
                        }}
                        size={42}
                        ringColor={theme.colors.primary}
                        checkIconSize={17}
                      />
                    );
                  })}
                  <TouchableOpacity
                    onPress={() => {
                      if (isPremium) {
                        setShowColorPickerModal(true);
                      } else {
                        premiumGate.open("custom_color");
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
                    <MaterialIcons name="colorize" size={18} color={theme.colors.primary} />
                    {!isPremium && <PremiumBadge size={10} />}
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Display style — visually secondary, below color */}
            <View style={[styles.displayStyleRow, { marginTop: 22 }]}>
              <Text style={[styles.displayStyleLabel, { color: theme.colors.onSurfaceVariant }]}>
                Display style
              </Text>
              <View style={styles.displayTypeRow}>
                {dataLoading ? (
                  ["Color", "Icon", "Initial"].map((label) => (
                    <View
                      key={label}
                      style={{
                        flex: 1,
                        height: 40,
                        borderRadius: 8,
                        backgroundColor: theme.dark ? "#2b2b2d" : "#e8e8f0",
                      }}
                    />
                  ))
                ) : (
                  (["color", "icon", "initial"] as const).map((type) => {
                    const isLocked = type !== "color" && !isPremium;
                    const isActive = displayType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        onPress={() => {
                          if (isLocked) {
                            premiumGate.open(type);
                            return;
                          }
                          setDisplayType(type);
                          if (type === "icon") setDisplayValue("sports-football");
                          else setDisplayValue("");
                        }}
                        style={[
                          styles.displayTypeButton,
                          {
                            backgroundColor: isActive
                              ? theme.colors.primary
                              : theme.dark ? "#2a2a2a" : "#efefef",
                            borderWidth: isLocked && !isActive ? 1 : 0,
                            borderColor: theme.colors.primary + "40",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.displayTypeText,
                            { color: isActive ? "#fff" : theme.colors.onSurfaceVariant },
                          ]}
                        >
                          {type === "color" ? "Color" : type === "icon" ? "Icon" : "Initial"}
                        </Text>
                        {isLocked && !isActive && (
                          <Text style={[styles.displayTypePro, { color: theme.colors.primary }]}>
                            PRO
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            </View>

            {/* Icon picker */}
            {displayType === "icon" && (
              <View style={{ marginTop: 10 }}>
                {earnedBadges.length > 0 && (
                  <>
                    <Text style={[styles.iconSectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                      Earned Badges
                    </Text>
                    <View style={styles.iconGrid}>
                      {earnedBadges.map((badgeType) => {
                        const badge = BADGE_EMOJI_MAP[badgeType];
                        if (!badge) return null;
                        const val = `emoji:${badge.emoji}`;
                        return (
                          <AnimatedIconButton
                            key={badgeType}
                            isSelected={displayValue === val}
                            onPress={() => setDisplayValue(val)}
                            size={40}
                            ringColor={theme.colors.primary}
                            backgroundColor={
                              selectedColor
                                ? tinycolor(selectedColor).setAlpha(0.2).toRgbString()
                                : theme.dark ? "#333" : "#e8e8e8"
                            }
                          >
                            <Text style={{ fontSize: 18 }}>{badge.emoji}</Text>
                          </AnimatedIconButton>
                        );
                      })}
                    </View>
                  </>
                )}
                <Text style={[styles.iconSectionLabel, { color: theme.colors.onSurfaceVariant, marginTop: earnedBadges.length > 0 ? 10 : 4 }]}>
                  {isPremium ? "Icons" : "Premium Icons"}
                </Text>
                <View style={styles.iconGrid}>
                  {iconOptions.map((icon) => {
                    const isLocked = icon.isPremium && !isPremium;
                    return (
                      <AnimatedIconButton
                        key={icon.name}
                        isSelected={displayValue === icon.name}
                        onPress={() => {
                          if (isLocked) {
                            premiumGate.open("icon");
                          } else {
                            setDisplayValue(icon.name);
                          }
                        }}
                        size={40}
                        ringColor={theme.colors.primary}
                        backgroundColor={
                          selectedColor
                            ? tinycolor(selectedColor).setAlpha(0.2).toRgbString()
                            : theme.dark ? "#333" : "#e8e8e8"
                        }
                        containerStyle={isLocked ? { opacity: 0.5 } : undefined}
                      >
                        <MaterialIcons
                          name={icon.name}
                          size={20}
                          color={selectedColor || theme.colors.onBackground}
                        />
                        {isLocked && <PremiumBadge size={10} />}
                      </AnimatedIconButton>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Initial input */}
            {displayType === "initial" && (
              <View style={[styles.initialRow, { marginTop: 10 }]}>
                <PaperInput
                  label="Your Initial (1 letter)"
                  value={displayValue}
                  onChangeText={(text) => setDisplayValue(text.slice(0, 1).toUpperCase())}
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
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: selectedColor || (theme.dark ? "#444" : "#ccc"),
                    }}
                  >
                    {displayValue ? (
                      <Text style={{ fontSize: 20, fontWeight: "700", color: "#fff", textAlign: "center" }}>
                        {displayValue}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            )}
            {colorError && (
              <Text style={[styles.fieldError, { marginTop: 6 }]}>Please choose your color</Text>
            )}
          </Animated.View>

          {/* ── 4. Settings (core decisions) ──────────────────────── */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.onBackground }]}>
              Settings
            </Text>

            {dataLoading ? (
              ["Visibility", "Square Limits & Pricing", "Deadline"].map((title) => (
                <View
                  key={title}
                  style={[styles.settingCard, { backgroundColor: theme.colors.surface }]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 5, backgroundColor: theme.dark ? "#2b2b2d" : "#e8e8f0" }} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={{ width: "50%", height: 13, borderRadius: 4, backgroundColor: theme.dark ? "#2b2b2d" : "#e8e8f0" }} />
                      <View style={{ width: "70%", height: 11, borderRadius: 4, backgroundColor: theme.dark ? "#2b2b2d" : "#e8e8f0" }} />
                    </View>
                    <View style={{ width: 34, height: 26, borderRadius: 8, backgroundColor: theme.dark ? "#2b2b2d" : "#e8e8f0" }} />
                  </View>
                </View>
              ))
            ) : (
              <>
                {/* Visibility */}
                <View style={[styles.settingCard, { backgroundColor: theme.colors.surface }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                    <MaterialIcons name="public" size={22} color={theme.colors.primary} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.settingTitle, { color: theme.colors.onBackground }]}>Visibility</Text>
                      <Text style={[styles.settingValue, { color: theme.colors.onSurfaceVariant }]}>
                        {isPublic ? "Listed — anyone can join" : "Private — invite only"}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => setIsPublic(false)}
                      style={[styles.visibilityButton, { backgroundColor: isPublic === false ? theme.colors.primary : theme.dark ? "#333" : "#eee" }]}
                    >
                      <MaterialIcons name="lock" size={16} color={isPublic === false ? "#fff" : theme.colors.onSurfaceVariant} />
                      <Text style={[styles.visibilityButtonText, { color: isPublic === false ? "#fff" : theme.colors.onSurfaceVariant }]}>
                        Private
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setIsPublic(true)}
                      style={[styles.visibilityButton, { backgroundColor: isPublic === true ? theme.colors.primary : theme.dark ? "#333" : "#eee" }]}
                    >
                      <MaterialIcons name="public" size={16} color={isPublic === true ? "#fff" : theme.colors.onSurfaceVariant} />
                      <Text style={[styles.visibilityButtonText, { color: isPublic === true ? "#fff" : theme.colors.onSurfaceVariant }]}>
                        Public
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Square Limits & Pricing */}
                <TouchableOpacity
                  onPress={() => setPerSquareModalVisible(true)}
                  style={[styles.settingCard, { backgroundColor: theme.colors.surface }]}
                >
                  <View style={styles.settingCardContent}>
                    <MaterialIcons name="settings" size={22} color={theme.colors.primary} />
                    <View style={styles.settingInfo}>
                      <Text style={[styles.settingTitle, { color: theme.colors.onBackground }]}>
                        {blockMode ? "Block Limits & Pricing" : "Square Limits & Pricing"}
                      </Text>
                      <Text style={[styles.settingValue, { color: theme.colors.onSurfaceVariant }]}>
                        Max {maxSelections} {blockMode ? "blocks" : "squares"}
                        {pricePerSquare > 0 ? ` · $${pricePerSquare.toFixed(2)} each` : ""}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
                  </View>
                </TouchableOpacity>

                {/* Deadline */}
                <TouchableOpacity
                  onPress={() => setShowPicker(true)}
                  style={[styles.settingCard, { backgroundColor: theme.colors.surface }]}
                >
                  <View style={styles.settingCardContent}>
                    <MaterialIcons name="schedule" size={22} color={theme.colors.primary} />
                    <View style={styles.settingInfo}>
                      <Text style={[styles.settingTitle, { color: theme.colors.onBackground }]}>Deadline</Text>
                      <Text style={[styles.settingValue, { color: theme.colors.onSurfaceVariant }]}>
                        {deadline.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                        {" at "}
                        {deadline.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
                  </View>
                </TouchableOpacity>

                {/* ── Advanced (collapsible) ────────────────────── */}
                <TouchableOpacity
                  onPress={() => setAdvancedExpanded((v) => !v)}
                  activeOpacity={0.7}
                  style={[
                    styles.advancedToggle,
                    {
                      backgroundColor: theme.dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                      borderColor: theme.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.advancedToggleTitle, { color: theme.colors.onBackground }]}>
                      Advanced
                    </Text>
                    {!advancedExpanded && (
                      <Text style={[styles.advancedToggleSummary, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                        {advancedSummary}
                      </Text>
                    )}
                  </View>
                  <MaterialIcons
                    name={advancedExpanded ? "expand-less" : "expand-more"}
                    size={22}
                    color={theme.colors.onSurfaceVariant}
                  />
                </TouchableOpacity>

                {advancedExpanded && (
                  <View style={styles.advancedContent}>
                    {/* 2x2 Block Mode */}
                    <View style={[styles.settingCard, { backgroundColor: theme.colors.surface }]}>
                      <View style={styles.settingCardContent}>
                        <MaterialIcons name="view-module" size={22} color={theme.colors.primary} />
                        <View style={styles.settingInfo}>
                          <Text style={[styles.settingTitle, { color: theme.colors.onBackground }]}>
                            2×2 Block Mode
                          </Text>
                          <Text style={[styles.settingValue, { color: theme.colors.onSurfaceVariant }]}>
                            {blockMode ? "Select 2×2 blocks" : "Select individual squares"}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            const next = !blockMode;
                            setBlockMode(next);
                            setMaxSelections(next ? "25" : "100");
                          }}
                          style={[styles.toggleButton, { backgroundColor: blockMode ? theme.colors.primary : theme.dark ? "#444" : "#ddd" }]}
                        >
                          <Text style={[styles.toggleText, { color: blockMode ? "#fff" : theme.colors.onSurface }]}>
                            {blockMode ? "ON" : "OFF"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Randomize Numbers */}
                    <View style={[styles.settingCard, { backgroundColor: theme.colors.surface }]}>
                      <View style={styles.settingCardContent}>
                        <MaterialIcons name="grid-on" size={22} color={theme.colors.primary} />
                        <View style={styles.settingInfo}>
                          <Text style={[styles.settingTitle, { color: theme.colors.onBackground }]}>
                            Randomize Numbers
                          </Text>
                          <Text style={[styles.settingValue, { color: theme.colors.onSurfaceVariant }]}>
                            {randomizeAxis ? "Random order" : "Sequential (0–9)"}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setRandomizeAxis(!randomizeAxis)}
                          style={[styles.toggleButton, { backgroundColor: randomizeAxis ? theme.colors.primary : theme.dark ? "#444" : "#ddd" }]}
                        >
                          <Text style={[styles.toggleText, { color: randomizeAxis ? "#fff" : theme.colors.onSurface }]}>
                            {randomizeAxis ? "ON" : "OFF"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Hide Numbers */}
                    <View style={[styles.settingCard, { backgroundColor: theme.colors.surface }]}>
                      <View style={styles.settingCardContent}>
                        <MaterialIcons name="visibility-off" size={22} color={theme.colors.primary} />
                        <View style={styles.settingInfo}>
                          <Text style={[styles.settingTitle, { color: theme.colors.onBackground }]}>
                            Hide Numbers Until Deadline
                          </Text>
                          <Text style={[styles.settingValue, { color: theme.colors.onSurfaceVariant }]}>
                            {hideAxisUntilDeadline ? "Hidden" : "Visible"}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setHideAxisUntilDeadline(!hideAxisUntilDeadline)}
                          style={[styles.toggleButton, { backgroundColor: hideAxisUntilDeadline ? theme.colors.primary : theme.dark ? "#444" : "#ddd" }]}
                        >
                          <Text style={[styles.toggleText, { color: hideAxisUntilDeadline ? "#fff" : theme.colors.onSurface }]}>
                            {hideAxisUntilDeadline ? "ON" : "OFF"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Notifications */}
                    <TouchableOpacity
                      onPress={() => setNotifModalVisible(true)}
                      style={[styles.settingCard, { backgroundColor: theme.colors.surface }]}
                    >
                      <View style={styles.settingCardContent}>
                        <MaterialIcons name="notifications" size={22} color={theme.colors.primary} />
                        <View style={styles.settingInfo}>
                          <Text style={[styles.settingTitle, { color: theme.colors.onBackground }]}>
                            Notifications
                          </Text>
                          <Text style={[styles.settingValue, { color: theme.colors.onSurfaceVariant }]}>
                            {activeNotifCount > 0 ? `${activeNotifCount} active` : "None"}
                          </Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>

          {/* ── 5. Summary + CTA ──────────────────────────────────── */}
          {!dataLoading && (
            <View
              style={[
                styles.summaryStrip,
                {
                  backgroundColor: theme.dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                  borderColor: theme.dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
                },
              ]}
            >
              {/* Metadata row — slightly dimmed since it's confirmatory, not actionable */}
              <View style={[styles.summaryRow, { opacity: 0.7 }]}>
                <View style={styles.summaryItem}>
                  <MaterialIcons name={isPublic ? "public" : "lock"} size={11} color={theme.colors.onSurfaceVariant} />
                  <Text style={[styles.summaryText, { color: theme.colors.onSurfaceVariant }]}>
                    {isPublic ? "Public" : "Private"}
                  </Text>
                </View>
                <Text style={[styles.summaryDot, { color: theme.colors.onSurfaceVariant }]}>·</Text>
                <View style={styles.summaryItem}>
                  <MaterialIcons name="grid-on" size={11} color={theme.colors.onSurfaceVariant} />
                  <Text style={[styles.summaryText, { color: theme.colors.onSurfaceVariant }]}>
                    Max {maxSelections}
                  </Text>
                </View>
                <Text style={[styles.summaryDot, { color: theme.colors.onSurfaceVariant }]}>·</Text>
                <View style={styles.summaryItem}>
                  <MaterialIcons name="schedule" size={11} color={theme.colors.onSurfaceVariant} />
                  <Text style={[styles.summaryText, { color: theme.colors.onSurfaceVariant }]}>
                    {deadline.toLocaleDateString([], { month: "short", day: "numeric" })}
                  </Text>
                </View>
              </View>
              {!isPremium && freeCredits.credits > 0 && (
                <View style={styles.summaryCredits}>
                  <Text style={{ fontSize: 12 }}>🎁</Text>
                  <Text style={[styles.summaryCreditsText, { color: theme.colors.primary }]}>
                    Free square available
                  </Text>
                </View>
              )}
            </View>
          )}

          <Button
            mode="contained"
            onPress={createSquareSession}
            loading={loading || adLoading}
            disabled={loading || adLoading}
            style={styles.createButton}
            contentStyle={styles.createButtonContent}
            labelStyle={styles.createButtonLabel}
          >
            {adLoading ? "Loading Ad…" : loading ? "Creating…" : "Create Game"}
          </Button>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
          >
            <Text style={[styles.cancelButtonText, { color: theme.colors.onSurfaceVariant }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

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
        visible={premiumGate.visible}
        onDismiss={premiumGate.close}
        feature="premium icons"
        context="square_limit"
        source={premiumGate.source ?? undefined}
      />

      <ColorPickerModal
        visible={showColorPickerModal}
        onDismiss={() => setShowColorPickerModal(false)}
        onColorSelect={(color) => { setSelectedColor(color); setColorError(false); }}
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
    marginBottom: 20,
    paddingTop: 4,
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Rubik_600SemiBold",
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 8,
  },
  input: {
    marginBottom: 2,
  },
  helperText: {
    fontSize: 11,
    fontFamily: "Rubik_400Regular",
    textAlign: "right",
  },

  // Game type toggle
  gameTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 0,
  },
  gameTypeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  gameTypeText: {
    fontSize: 13,
    fontFamily: "Rubik_600SemiBold",
  },
  customGameInputs: {
    marginTop: 10,
  },

  // Select button (no game chosen)
  selectButton: {
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
  },
  selectButtonContent: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    gap: 6,
  },
  selectButtonText: {
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
  },
  selectButtonSubtext: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
  },

  // Confirmed matchup card
  matchupCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
  },
  matchupCardInner: {
    gap: 4,
  },
  leagueTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  leagueTagText: {
    fontSize: 10,
    fontFamily: "Rubik_600SemiBold",
    letterSpacing: 0.5,
  },
  matchupTeams: {
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
    lineHeight: 22,
  },
  matchupMeta: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
  },
  matchupChange: {
    fontSize: 12,
    fontFamily: "Rubik_500Medium",
    marginTop: 6,
  },

  // Color
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    paddingVertical: 4,
  },
  colorButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },

  // Display style
  displayStyleRow: {
    gap: 6,
  },
  displayStyleLabel: {
    fontSize: 12,
    fontFamily: "Rubik_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  displayTypeRow: {
    flexDirection: "row",
    gap: 8,
  },
  displayTypeButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  displayTypeText: {
    fontSize: 13,
    fontFamily: "Rubik_600SemiBold",
  },
  displayTypePro: {
    fontSize: 9,
    fontFamily: "Rubik_500Medium",
    letterSpacing: 0.3,
  },
  iconSectionLabel: {
    fontSize: 11,
    fontFamily: "Rubik_500Medium",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingVertical: 4,
  },
  initialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  initialInput: {
    flex: 3,
  },

  // Settings cards
  settingCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  settingCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
  },
  visibilityButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  visibilityButtonText: {
    fontSize: 13,
    fontFamily: "Rubik_500Medium",
  },
  toggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    minWidth: 46,
    alignItems: "center",
  },
  toggleText: {
    fontSize: 11,
    fontFamily: "Rubik_600SemiBold",
  },

  // Advanced collapsible
  advancedToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 0,
    gap: 8,
  },
  advancedToggleTitle: {
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 1,
  },
  advancedToggleSummary: {
    fontSize: 11,
    fontFamily: "Rubik_400Regular",
  },
  advancedContent: {
    marginTop: 4,
  },

  // Summary strip
  summaryStrip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 5,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  summaryText: {
    fontSize: 11,
    fontFamily: "Rubik_400Regular",
  },
  summaryDot: {
    fontSize: 11,
    opacity: 0.35,
  },
  summaryCredits: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  summaryCreditsText: {
    fontSize: 12,
    fontFamily: "Rubik_600SemiBold",
  },

  // Inline field errors
  fieldError: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    color: "#ef5350",
    marginTop: 4,
  },

  // CTA
  createButton: {
    marginTop: 4,
    borderRadius: 12,
  },
  createButtonContent: {
    paddingVertical: 6,
  },
  createButtonLabel: {
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
  },
  cancelButton: {
    alignSelf: "center",
    marginTop: 14,
    padding: 10,
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
  },
});

export default CreateSquareScreen;
