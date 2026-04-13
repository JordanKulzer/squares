import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  Alert,
} from "react-native";
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { Card, TextInput as PaperInput, useTheme, Portal, Modal } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import colors from "../../assets/constants/colorOptions";
import {
  iconOptions,
  BADGE_EMOJI_MAP,
} from "../../assets/constants/iconOptions";
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
import { usePremiumGate } from "../hooks/usePremiumGate";
import AnimatedColorDot from "../components/AnimatedColorDot";
import AnimatedIconButton from "../components/AnimatedIconButton";
import PremiumBadge from "../components/PremiumBadge";
import ColorPickerModal from "../components/ColorPickerModal";
import Toast from "react-native-toast-message";
import * as Haptics from "expo-haptics";
import {
  getActiveSquareCount,
  getAvailableCredits,
  consumeCredit,
  refundCredit,
  recordGameJoin,
  FREE_MAX_ACTIVE,
} from "../utils/squareLimits";
import { useFreeCredits } from "../hooks/useFreeCredits";
import {
  ColorOwnership,
  PlayerColorInfo,
  getColorOwnership,
  isColorSelectable,
} from "../utils/colorOwnership";

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
        userIdRef.current = data.user.id;
        freeCredits.fetch(data.user.id);
        // Fetch username and active badge from users table
        const { data: profile } = await supabase
          .from("users")
          .select("username, active_badge")
          .eq("id", data.user.id)
          .single();
        if (profile?.username) {
          setUsername(profile.username);
        }
        // Auto-default to active badge emoji if set
        if (profile?.active_badge && BADGE_EMOJI_MAP[profile.active_badge]) {
          setDisplayType("icon");
          setDisplayValue(
            `emoji:${BADGE_EMOJI_MAP[profile.active_badge].emoji}`,
          );
        }

        // Fetch earned badges
        const { data: badgeData } = await supabase
          .from("badges")
          .select("badge_type")
          .eq("user_id", data.user.id);
        if (badgeData) {
          setEarnedBadges(badgeData.map((b) => b.badge_type));
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
  let paramPlayerColors: { userId: string; color: string }[] = [];
  let inviteId: string | undefined;

  if ("gridId" in params) {
    // normal join path
    gridId = params.gridId;
    paramTitle = params.inputTitle;
    paramDeadline = params.deadline;
    // Accept new playerColors or fall back to legacy usedColors (unknown owner)
    paramPlayerColors =
      params.playerColors ??
      (params.usedColors ?? []).map((c) => ({
        userId: "__unknown__",
        color: c,
      }));
  } else if ("sessionId" in params) {
    // deep link path or invite acceptance
    gridId = params.sessionId;
    inviteId = params.inviteId;
  }

  // Show confirmation modal when arriving via push notification tap
  const fromNotification =
    "sessionId" in params && !!(params as any).fromNotification;
  const [showInviteConfirm, setShowInviteConfirm] = useState(fromNotification);

  const [username, setUsername] = useState("");
  const [selectedColor, setSelectedColor] = useState(null);
  const [pricePerSquare, setPricePerSquare] = useState<number | null>(null);
  const [blockMode, setBlockMode] = useState(false);
  const [inputTitle, setInputTitle] = useState(paramTitle || "");
  const [deadline, setDeadline] = useState(paramDeadline || null);
  const [playerColors, setPlayerColors] =
    useState<PlayerColorInfo[]>(paramPlayerColors);
  const [colorsLoading, setColorsLoading] = useState(
    paramPlayerColors.length === 0,
  );
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
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);

  // Premium state
  const { isPremium } = usePremium();
  const premiumGate = usePremiumGate();
  const [showColorPickerModal, setShowColorPickerModal] = useState(false);

  // Free square credits
  const freeCredits = useFreeCredits();
  const userIdRef = useRef<string | null>(null);

  const gradientColors = theme.dark
    ? (["#121212", "#1d1d1d", "#2b2b2d"] as const)
    : (["#fdfcf9", "#e0e7ff"] as const);

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

      const infos: PlayerColorInfo[] =
        squareWithPlayers?.players
          ?.filter((p: any) => p.userId && p.color)
          .map((p: any) => ({
            userId: p.userId,
            color: p.color,
            username: p.username || undefined,
          })) || [];
      setPlayerColors(infos);
      setColorsLoading(false);

      // Pre-populate selection if current user already joined
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const existing = infos.find((p) => p.userId === authData.user.id);
        if (existing) setSelectedColor(existing.color);
      }
    };

    fetchSession();
  }, [gridId]);

  // Auto-select the first available color once player colors have loaded.
  // This lets users join immediately without manually picking a color.
  // Does not override a color already set (e.g. existing player re-opening the screen).
  useEffect(() => {
    if (colorsLoading || selectedColor || !user) return;
    const firstAvailable = colors.colorOptions.find((color) => {
      const ownership = getColorOwnership(
        color,
        user.id,
        playerColors,
        colors.colorOptions,
      );
      return isColorSelectable(ownership);
    });
    if (firstAvailable) setSelectedColor(firstAvailable);
  }, [colorsLoading, playerColors, user]);

  // Refresh credit balance when navigating back to this screen
  useFocusEffect(
    useCallback(() => {
      if (userIdRef.current) {
        freeCredits.fetch(userIdRef.current);
        console.log(
          "[freeCredits] free_credit_balance_refreshed screen=JoinSquareScreen",
        );
      }
    }, []),
  );

  const joinSquare = async () => {
    Keyboard.dismiss();

    if (!username) {
      alert("Could not load your username. Please try again.");
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

    // Check active square limit for free users.
    // Consume credit BEFORE joining so we can abort cleanly if it's unavailable.
    let consumedCreditId: string | null = null;
    if (!isPremium) {
      const activeCount = await getActiveSquareCount(user.id);
      if (activeCount >= FREE_MAX_ACTIVE) {
        const credits = await getAvailableCredits(user.id);
        if (credits > 0) {
          console.log(
            `[freeCredits] free_credit_prompt_shown screen=JoinSquareScreen balance=${credits}`,
          );
          const confirmed = await new Promise<boolean>((resolve) => {
            Alert.alert(
              "Use Free Square Credit?",
              `You have ${credits} free credit${credits !== 1 ? "s" : ""}. 1 will be used to join this game.`,
              [
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => resolve(false),
                },
                { text: "Use Credit", onPress: () => resolve(true) },
              ],
            );
          });
          if (!confirmed) {
            setIsJoining(false);
            return;
          }
          // Atomically consume before any irreversible DB writes
          consumedCreditId = await consumeCredit(user.id);
          if (!consumedCreditId) {
            setIsJoining(false);
            freeCredits.fetch(user.id);
            Alert.alert(
              "Credit Unavailable",
              "Your free credit could not be applied. It may have already been used. Please try again or upgrade to Premium.",
            );
            return;
          }
        } else {
          setIsJoining(false);
          premiumGate.open("square_limit");
          return;
        }
      }
    }

    try {
      const { data: square, error: fetchError } = await supabase
        .from("squares")
        .select("players")
        .eq("id", gridId)
        .single();

      if (fetchError || !square) {
        if (consumedCreditId) await refundCredit(consumedCreditId, user.id);
        console.error("Failed to fetch existing players:", fetchError);
        alert("Failed to join. Could not fetch session.");
        setIsJoining(false);
        return;
      }

      const existingPlayers = square.players || [];

      if (existingPlayers.some((p) => p.userId === user.id)) {
        if (consumedCreditId) await refundCredit(consumedCreditId, user.id);
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
        if (consumedCreditId) await refundCredit(consumedCreditId, user.id);
        console.error("Update failed:", updateError);
        alert("Failed to join square.");
        setIsJoining(false);
        return;
      }

      if (!updatedSquare || updatedSquare.length === 0) {
        if (consumedCreditId) await refundCredit(consumedCreditId, user.id);
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
        // player_ids failed but players array succeeded — credit is earned, don't refund
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

      if (consumedCreditId) {
        console.log(
          `[freeCredits] free_credit_used screen=JoinSquareScreen squareId=${gridId}`,
        );
        freeCredits.fetch(user.id);
      }
      recordGameJoin(user.id).catch(console.error);

      // Success feedback — haptic + toast, then navigate after a short delay
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      Toast.show({
        type: "success",
        text1: `You joined ${inputTitle || "the game"}!`,
        position: "bottom",
        bottomOffset: 80,
        visibilityTime: 1800,
      });

      await new Promise((resolve) => setTimeout(resolve, 1600));

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
      if (consumedCreditId) await refundCredit(consumedCreditId, user.id);
      console.error("Unexpected error:", err);
      alert("Something went wrong when trying to join.");
      setIsJoining(false);
    }
  };

  // Game is full when every color option is taken by another player.
  // This is the only condition that disables the join button.
  const allColorsTaken =
    !colorsLoading &&
    user !== null &&
    colors.colorOptions.every((color) => {
      const ownership = getColorOwnership(
        color,
        user.id,
        playerColors,
        colors.colorOptions,
      );
      return !isColorSelectable(ownership);
    });
  const joinIsValid = !allColorsTaken;

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
              size={44}
              color={theme.colors.primary}
            />
            <Text
              style={[styles.headerTitle, { color: theme.colors.onBackground }]}
            >
              Join Game
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Rubik_400Regular",
                color: theme.colors.onSurfaceVariant,
                textAlign: "center",
                marginTop: 4,
                opacity: 0.75,
              }}
            >
              Join a game and claim squares before the deadline
            </Text>
          </View>

          {/* Game context card — gives user a clear read of what they're joining */}
          <View
            style={[
              styles.gameCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.dark ? "#333" : "#e0e0e0",
              },
            ]}
          >
            {league ? (
              <View
                style={[
                  styles.leagueTag,
                  { backgroundColor: theme.colors.primary + "1A" },
                ]}
              >
                <Text
                  style={[
                    styles.leagueTagText,
                    { color: theme.colors.primary },
                  ]}
                >
                  {league.toUpperCase()}
                </Text>
              </View>
            ) : null}
            <Text
              style={[
                styles.gameCardTitle,
                { color: theme.colors.onBackground },
              ]}
              numberOfLines={2}
            >
              {inputTitle || "Loading…"}
            </Text>
            {deadline ? (
              <Text
                style={[
                  styles.gameCardMeta,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {"Deadline: "}
                {new Date(deadline).toLocaleDateString([], {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
                {" · "}
                {new Date(deadline).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            ) : null}
          </View>

          {/* ── Appearance ── */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.onBackground }]}>
              Customize your appearance{" "}
              {/* <Text style={{ fontWeight: "400", opacity: 0.5 }}>(optional)</Text> */}
            </Text>

            {/* Taken-color hint — shown above the grid when any colors are claimed */}
            {!colorsLoading && playerColors.length > 0 && (
              <Text
                style={[
                  styles.colorHelperText,
                  { color: theme.colors.onSurfaceVariant, marginBottom: 8 },
                ]}
              >
                Some colors are already taken
              </Text>
            )}

            {/* Color grid */}
            <View style={styles.colorGrid}>
              {colorsLoading ? (
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
                    const ownership = getColorOwnership(
                      color,
                      user?.id ?? null,
                      playerColors,
                      colors.colorOptions,
                    );
                    const taken = ownership === ColorOwnership.TAKEN_BY_OTHER;
                    const owned = ownership === ColorOwnership.OWNED_BY_USER;
                    const owner = taken
                      ? playerColors.find((p) => p.color === color)
                      : null;
                    return (
                      <AnimatedColorDot
                        key={color}
                        color={color}
                        isSelected={selectedColor === color || owned}
                        onPress={() => {
                          if (isColorSelectable(ownership))
                            setSelectedColor(color);
                        }}
                        onPressDisabled={() => {
                          Toast.show({
                            type: "info",
                            text1: `Taken by ${owner?.username || "another player"}`,
                            position: "bottom",
                            bottomOffset: 60,
                            visibilityTime: 2000,
                          });
                        }}
                        size={42}
                        ringColor={theme.colors.primary}
                        checkIconSize={17}
                        disabled={taken}
                      />
                    );
                  })}
                  {/* Custom Color (Premium) */}
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
                    <MaterialIcons
                      name="colorize"
                      size={18}
                      color={theme.colors.primary}
                    />
                    {!isPremium && <PremiumBadge size={10} />}
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Display style — secondary, below color */}
            <View style={[styles.displayStyleRow, { marginTop: 22 }]}>
              <Text
                style={[
                  styles.displayStyleLabel,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Display style
              </Text>
              <View style={styles.displayTypeRow}>
                {(["color", "icon", "initial"] as const).map((type) => {
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
                            : theme.dark
                              ? "#2a2a2a"
                              : "#efefef",
                          borderWidth: isLocked && !isActive ? 1 : 0,
                          borderColor: theme.colors.primary + "40",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.displayTypeText,
                          {
                            color: isActive
                              ? "#fff"
                              : theme.colors.onSurfaceVariant,
                          },
                        ]}
                      >
                        {type === "color"
                          ? "Color"
                          : type === "icon"
                            ? "Icon"
                            : "Initial"}
                      </Text>
                      {isLocked && !isActive && (
                        <Text
                          style={[
                            styles.displayTypePro,
                            { color: theme.colors.primary },
                          ]}
                        >
                          PRO
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Icon picker */}
            {displayType === "icon" && (
              <View style={{ marginTop: 10 }}>
                {earnedBadges.length > 0 && (
                  <>
                    <Text
                      style={[
                        styles.iconSectionLabel,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
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
                                ? tinycolor(selectedColor)
                                    .setAlpha(0.2)
                                    .toRgbString()
                                : theme.dark
                                  ? "#333"
                                  : "#e8e8e8"
                            }
                          >
                            <Text style={{ fontSize: 18 }}>{badge.emoji}</Text>
                          </AnimatedIconButton>
                        );
                      })}
                    </View>
                  </>
                )}
                <Text
                  style={[
                    styles.iconSectionLabel,
                    {
                      color: theme.colors.onSurfaceVariant,
                      marginTop: earnedBadges.length > 0 ? 10 : 4,
                    },
                  ]}
                >
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
                            ? tinycolor(selectedColor)
                                .setAlpha(0.2)
                                .toRgbString()
                            : theme.dark
                              ? "#333"
                              : "#e8e8e8"
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
                  onChangeText={(text) =>
                    setDisplayValue(text.slice(0, 1).toUpperCase())
                  }
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
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor:
                        selectedColor || (theme.dark ? "#444" : "#ccc"),
                    }}
                  >
                    {displayValue ? (
                      <Text
                        style={{
                          fontSize: 20,
                          fontWeight: "700",
                          color: "#fff",
                          textAlign: "center",
                        }}
                      >
                        {displayValue}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* ── Settings ── */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.onBackground }]}>
              Settings
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
                  size={22}
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
                    {Object.values(notifySettings).filter(Boolean).length > 0
                      ? `${Object.values(notifySettings).filter(Boolean).length} active`
                      : "None"}
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={22}
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
                    size={22}
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
                        {
                          color: theme.colors.primary,
                          fontFamily: "Rubik_600SemiBold",
                        },
                      ]}
                    >
                      ${pricePerSquare.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Summary strip — credit only */}
          {!isPremium && freeCredits.credits > 0 && (
            <View
              style={[
                styles.summaryStrip,
                {
                  backgroundColor: theme.dark
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,0,0,0.03)",
                  borderColor: theme.dark
                    ? "rgba(255,255,255,0.07)"
                    : "rgba(0,0,0,0.07)",
                },
              ]}
            >
              <View style={styles.summaryCredits}>
                <Text style={{ fontSize: 12 }}>🎁</Text>
                <Text
                  style={[
                    styles.summaryCreditsText,
                    { color: theme.colors.primary },
                  ]}
                >
                  Free square available
                </Text>
              </View>
            </View>
          )}

          {/* Full-game message — only shown when every color is taken */}
          {allColorsTaken && (
            <View style={styles.validationHints}>
              <View style={styles.validationHintRow}>
                <MaterialIcons
                  name="block"
                  size={13}
                  color={theme.colors.error}
                />
                <Text
                  style={[
                    styles.validationHintText,
                    { color: theme.colors.error },
                  ]}
                >
                  This game is full
                </Text>
              </View>
            </View>
          )}

          {/* Join Button */}
          <TouchableOpacity
            onPress={joinSquare}
            disabled={!joinIsValid || isJoining}
            style={[
              styles.joinButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: !joinIsValid || isJoining ? 0.4 : 1,
              },
            ]}
          >
            <Text style={styles.joinButtonText}>
              {isJoining ? "Joining…" : "Join Game"}
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
        visible={premiumGate.visible}
        onDismiss={premiumGate.close}
        feature="premium icons"
        context="square_limit"
        source={premiumGate.source ?? undefined}
      />

      <ColorPickerModal
        visible={showColorPickerModal}
        onDismiss={() => setShowColorPickerModal(false)}
        onColorSelect={(color) => setSelectedColor(color)}
        initialColor={selectedColor || "#5e60ce"}
      />

      {/* Invite confirmation modal — shown when arriving via push notification */}
      <Portal>
        <Modal
          visible={showInviteConfirm}
          onDismiss={() => navigation.goBack()}
          contentContainerStyle={[
            styles.inviteConfirmModal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <View style={styles.inviteConfirmIconRow}>
            <View
              style={[
                styles.inviteConfirmIconBg,
                { backgroundColor: theme.colors.primary + "18" },
              ]}
            >
              <MaterialIcons name="mail" size={26} color={theme.colors.primary} />
            </View>
          </View>

          <Text style={[styles.inviteConfirmTitle, { color: theme.colors.onSurface }]}>
            You were invited to join
          </Text>
          <Text
            style={[styles.inviteConfirmGame, { color: theme.colors.primary }]}
            numberOfLines={2}
          >
            {inputTitle || "…"}
          </Text>

          <View style={styles.inviteConfirmButtons}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[
                styles.inviteConfirmDecline,
                {
                  borderColor: theme.dark
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(0,0,0,0.12)",
                },
              ]}
            >
              <Text
                style={[
                  styles.inviteConfirmDeclineText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Decline
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowInviteConfirm(false)}
              style={[
                styles.inviteConfirmAccept,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Text style={styles.inviteConfirmAcceptText}>Accept</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>
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

  // Header
  header: {
    alignItems: "center",
    marginBottom: 16,
    paddingTop: 4,
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Rubik_600SemiBold",
  },

  // Game context card
  gameCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    gap: 4,
  },
  leagueTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 2,
  },
  leagueTagText: {
    fontSize: 10,
    fontFamily: "Rubik_600SemiBold",
    letterSpacing: 0.5,
  },
  gameCardTitle: {
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
    lineHeight: 22,
  },
  gameCardMeta: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
  },

  // Section
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 8,
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
  colorHelperText: {
    fontSize: 11,
    fontFamily: "Rubik_400Regular",
    marginTop: 8,
    opacity: 0.65,
  },

  // Display style (matches create flow)
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

  // Icon / initial pickers
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

  // Summary strip (credit)
  summaryStrip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 8,
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

  // Validation checklist
  validationHints: {
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  validationHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  validationHintText: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
  },

  // CTA
  joinButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
  },
  cancelButtonContainer: {
    alignSelf: "center",
    marginTop: 14,
    padding: 10,
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
  },

  // Invite confirm modal
  inviteConfirmModal: {
    marginHorizontal: 28,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  inviteConfirmIconRow: {
    marginBottom: 16,
  },
  inviteConfirmIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteConfirmTitle: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    textAlign: "center",
    marginBottom: 6,
    opacity: 0.7,
  },
  inviteConfirmGame: {
    fontSize: 18,
    fontFamily: "Rubik_600SemiBold",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  inviteConfirmButtons: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  inviteConfirmDecline: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteConfirmDeclineText: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
  },
  inviteConfirmAccept: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  inviteConfirmAcceptText: {
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
    color: "#fff",
  },
});

export default JoinSquareScreen;
