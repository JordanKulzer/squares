import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Keyboard,
  RefreshControl,
  FlatList,
} from "react-native";
import colors from "../../assets/constants/colorOptions";
import { iconOptions } from "../../assets/constants/iconOptions";
import { Button, TextInput, useTheme, Portal, Modal } from "react-native-paper";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import Toast from "react-native-toast-message";
import { getToastConfig } from "../components/ToastConfig";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import PendingInvitesSection from "../components/PendingInvitesSection";
import { usePremium } from "../contexts/PremiumContext";
import PremiumUpgradeModal from "../components/PremiumUpgradeModal";
import { usePremiumGate } from "../hooks/usePremiumGate";
import UserAvatar from "../components/UserAvatar";
import ColorPickerModal from "../components/ColorPickerModal";
import { insertDevCredit } from "../utils/squareLimits";

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const ProfileScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { isPremium, isDevMode, toggleDevPremium, premiumType } = usePremium();
  const [devCreditAdding, setDevCreditAdding] = useState(false);

  const [username, setUsername] = useState("");
  const premiumGate = usePremiumGate();
  const [email, setEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [totalWinnings, setTotalWinnings] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [quartersWon, setQuartersWon] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Group loading flags — true once the group has received its first successful data
  const [groupALoaded, setGroupALoaded] = useState(false); // avatar + username + top stats
  const [groupBLoaded, setGroupBLoaded] = useState(false); // quarter-wins progress card
  const [groupCLoaded, setGroupCLoaded] = useState(false); // activity: invites + friends count
  // Groups D and E are static nav rows — render immediately, no async needed

  // Prevents re-triggering skeleton on re-focus when data already exists
  const hasFetchedOnce = useRef(false);
  const [friendsCount, setFriendsCount] = useState(0);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwUpdating, setPwUpdating] = useState(false);
  const [usernameUpdating, setUsernameUpdating] = useState(false);
  const [pwModalVisible, setPwModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [availableCredits, setAvailableCredits] = useState(0);
  const [quarterWinsProgress, setQuarterWinsProgress] = useState(0);
  // Pulse animation — fired when a recent credit reward is detected on refresh
  const progressPulseAnim = useRef(new Animated.Value(1)).current;
  const prevProgressRef = useRef<number | null>(null);
  const [activeBadge, setActiveBadge] = useState<string | null>(null);
  const [profileColor, setProfileColor] = useState<string | null>(null);
  const [profileIcon, setProfileIcon] = useState<string | null>(null);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [draftColor, setDraftColor] = useState<string | null>(null);
  const [draftIcon, setDraftIcon] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const showToast = (opts: any) => {
    const pos = keyboardVisible ? "top" : "bottom";
    if (pos === "top") {
      Toast.show({ ...opts, position: "top", topOffset: 60 });
    } else {
      Toast.show({ ...opts, position: "bottom", bottomOffset: 60 });
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!hasFetchedOnce.current) {
        hasFetchedOnce.current = true;
        fetchUserData(false);
      } else {
        console.log("[profile] background refresh");
        fetchUserData(true);
      }
    }, []),
  );

  const fetchUserData = async (isBackground: boolean) => {
    if (isBackground) {
      setRefreshing(true);
    }
    // Never clear cached data — groups stay rendered during refresh

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setRefreshing(false);
        return;
      }

      setEmail(user.email || "");

      // ── Group A: identity + top stats ──
      const [profileRes, statsRes] = await Promise.all([
        supabase
          .from("users")
          .select("username, total_winnings, is_private, active_badge, profile_color, profile_icon")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("leaderboard_stats")
          .select("quarters_won, games_played")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (profileRes.error) throw profileRes.error;

      const data = profileRes.data;
      const statsData = statsRes.data;

      if (data) {
        const currentUsername = data.username || "";
        setUsername(currentUsername);
        setNewUsername(currentUsername);
        setTotalWinnings(data.total_winnings || 0);
        setIsPrivate(!!data.is_private);
        setActiveBadge(data.active_badge || null);
        setProfileColor(data.profile_color || null);
        setProfileIcon(data.profile_icon || null);
      }
      setQuartersWon(statsData?.quarters_won || 0);
      setGamesPlayed(statsData?.games_played || 0);
      setGroupALoaded(true);
      console.log("[profile/groupA] ready");

      // ── Group B: progress card (quarter wins + credits) ──
      const [lbRes, creditRes] = await Promise.all([
        supabase
          .from("leaderboard_stats")
          .select("quarter_wins_progress, last_reward_at")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("square_credits")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("used_at", null),
      ]);

      const newProgress = lbRes.data?.quarter_wins_progress ?? 0;
      const lastRewardAt = lbRes.data?.last_reward_at ?? null;

      // Pulse the progress card if the server just granted a reward:
      // progress reset to 0 AND last_reward_at within the past 2 minutes.
      const isRecentReward =
        newProgress === 0 &&
        lastRewardAt != null &&
        Date.now() - new Date(lastRewardAt).getTime() < 2 * 60 * 1000;

      const wasNonZero = prevProgressRef.current !== null && prevProgressRef.current > 0;

      if (isRecentReward && wasNonZero) {
        Animated.sequence([
          Animated.spring(progressPulseAnim, {
            toValue: 1.04,
            useNativeDriver: true,
            speed: 14,
            bounciness: 10,
          }),
          Animated.spring(progressPulseAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 14,
            bounciness: 4,
          }),
        ]).start();
      }

      prevProgressRef.current = newProgress;
      setQuarterWinsProgress(newProgress);
      setAvailableCredits(creditRes.count || 0);
      setGroupBLoaded(true);
      console.log("[profile/groupB] ready");

      // ── Group C: activity (friends count) ──
      const friendsCountRes = await supabase
        .from("friends")
        .select("id", { count: "exact", head: true })
        .eq("status", "accepted")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
      if (!friendsCountRes.error) {
        setFriendsCount(friendsCountRes.count || 0);
      }
      setGroupCLoaded(true);
      console.log("[profile/groupC] ready");

      // Groups D + E are static — log immediately
      console.log("[profile/groupD] ready");
      console.log("[profile/groupE] ready");
    } catch (err) {
      console.error("Failed to fetch profile data:", err);
      showToast({
        type: "error",
        text1: "Failed to load profile",
        text2: "Pull down to retry",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const updatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showToast({ type: "error", text1: "Password must be 6+ characters" });
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast({ type: "error", text1: "Passwords do not match" });
      return;
    }

    setPwUpdating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        showToast({ type: "error", text1: "No user found" });
        setPwUpdating(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        showToast({ type: "error", text1: "Failed to update password" });
      } else {
        setNewPassword("");
        setConfirmPassword("");
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setPwModalVisible(false);
        showToast({ type: "success", text1: "Password updated" });
      }
    } catch (err) {
      console.error("Error updating password:", err);
      showToast({ type: "error", text1: "Failed to update password" });
    } finally {
      setPwUpdating(false);
    }
  };

  const validateUsername = (
    username: string,
  ): { valid: boolean; error?: string } => {
    if (!username || username.trim().length === 0) {
      return { valid: false, error: "Username cannot be empty" };
    }
    if (username.length < 3) {
      return { valid: false, error: "Username must be at least 3 characters" };
    }
    if (username.length > 20) {
      return { valid: false, error: "Username must be 20 characters or less" };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return {
        valid: false,
        error: "Username can only contain letters, numbers, and underscores",
      };
    }
    return { valid: true };
  };

  const checkUsernameAvailable = async (username: string): Promise<boolean> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .neq("id", user.id)
      .maybeSingle();

    return !data;
  };

  const saveAvatarSettings = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setSavingAvatar(true);
    const { error } = await supabase
      .from("users")
      .update({ profile_color: draftColor, profile_icon: draftIcon })
      .eq("id", user.id);
    setSavingAvatar(false);
    if (error) {
      showToast({ type: "error", text1: "Failed to save avatar" });
    } else {
      setProfileColor(draftColor);
      setProfileIcon(draftIcon);
      setShowAvatarEditor(false);
      showToast({ type: "success", text1: "Avatar updated!" });
    }
  };

  const updateUsername = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      showToast({ type: "error", text1: "No user found" });
      return;
    }

    // Validate username format
    const validation = validateUsername(newUsername.trim());
    if (!validation.valid) {
      showToast({ type: "error", text1: validation.error });
      return;
    }

    setUsernameUpdating(true);

    try {
      // Check if username is available
      const isAvailable = await checkUsernameAvailable(newUsername.trim());
      if (!isAvailable) {
        showToast({ type: "error", text1: "Username is already taken" });
        return;
      }

      const { error } = await supabase
        .from("users")
        .upsert(
          {
            id: user.id,
            username: newUsername.trim(),
            email: user.email,
          },
          { onConflict: "id" },
        )
        .select();

      if (error) {
        showToast({ type: "error", text1: "Failed to update username" });
        return;
      }

      setUsername(newUsername.trim());
      setEditModalVisible(false);
      showToast({ type: "success", text1: "Username updated" });
    } finally {
      setUsernameUpdating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  };

  const deleteUserData = async (uid: string) => {
    try {
      const tables = [
        { table: "players", key: "user_id" },
        { table: "selections", key: "user_id" },
      ];
      for (const { table, key } of tables) {
        await supabase.from(table).delete().eq(key, uid);
      }
      await supabase.storage
        .from("avatars")
        .remove([`profileImages/${uid}.jpg`]);
    } catch (err: any) {
      console.error("Failed to delete user data:", err.message);
    }
  };

  const confirmDeleteAccount = async () => {
    setDeleteModalVisible(false);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("User not found");

      const { error: updateError } = await supabase
        .from("users")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", user.id);

      if (updateError) throw updateError;

      await deleteUserData(user.id);
      await supabase.auth.signOut({ scope: "global" });
    } catch (error) {
      console.error("Error deleting account:", error);
      showToast({ type: "error", text1: "Failed to delete account" });
    }
  };

  const gradientColors = theme.dark
    ? (["#121212", "#1d1d1d", "#2b2b2d"] as [string, string, ...string[]])
    : (["#fdfcf9", "#e0e7ff"] as [string, string]);

  return (
    <LinearGradient colors={gradientColors} style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchUserData(true)}
          />
        }
      >
        {/* Avatar Header */}
        <View style={styles.avatarSection}>
          {!groupALoaded ? (
            <>
              <View style={{
                width: 88, height: 88, borderRadius: 44,
                backgroundColor: theme.dark ? "#2b2b2d" : "#e8e8f0",
              }} />
              <View style={{
                width: 120, height: 16, borderRadius: 6, marginTop: 18,
                backgroundColor: theme.dark ? "#2b2b2d" : "#e8e8f0",
              }} />
            </>
          ) : (
            <>
              <View style={{ position: "relative" }}>
                <UserAvatar
                  username={username}
                  activeBadge={activeBadge}
                  profileIcon={profileIcon}
                  profileColor={profileColor}
                  showRing
                  size={88}
                  backgroundColor={theme.colors.primary}
                />
                <TouchableOpacity
                  onPress={() => {
                    setDraftColor(profileColor);
                    setDraftIcon(profileIcon);
                    setShowAvatarEditor(true);
                  }}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: theme.colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: theme.dark ? "#1a1a1a" : "#f5f5f5",
                  }}
                >
                  <MaterialIcons name="edit" size={13} color="#fff" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => setEditModalVisible(true)}
                activeOpacity={0.7}
                style={styles.usernameRow}
              >
                <Text
                  style={[styles.usernameText, { color: theme.colors.onSurface }]}
                >
                  @{username || "username"}
                </Text>
                <MaterialIcons
                  name="edit"
                  size={14}
                  color={theme.colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          {[
            { value: !groupALoaded ? null : String(gamesPlayed), label: "Played" },
            { value: !groupALoaded ? null : String(quartersWon), label: "Won" },
            { value: !groupALoaded ? null : `$${totalWinnings.toFixed(2)}`, label: "Winnings" },
          ].map(({ value, label }) => (
            <View key={label} style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              {value === null ? (
                <View style={{ width: 40, height: 22, borderRadius: 5, backgroundColor: theme.dark ? "#2b2b2d" : "#e8e8f0", marginTop: 4 }} />
              ) : (
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>{value}</Text>
              )}
              <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Free Square Credit Progress — Group B */}
        {!groupBLoaded ? (
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: "rgba(94,96,206,0.4)", borderLeftColor: theme.colors.primary, padding: 14 }]}>
            <View style={{ width: "60%", height: 13, borderRadius: 4, backgroundColor: theme.dark ? "#2b2b2d" : "#e8e8f0", marginBottom: 12 }} />
            <View style={{ height: 5, borderRadius: 3, backgroundColor: theme.dark ? "#333" : "#e0e0e0" }} />
          </View>
        ) : (
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: "rgba(94, 96, 206, 0.4)",
              borderLeftColor: theme.colors.primary,
              padding: 14,
              transform: [{ scale: progressPulseAnim }],
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
              name="card-giftcard"
              size={18}
              color={theme.colors.primary}
            />
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Rubik_500Medium",
                color: theme.colors.onBackground,
                marginLeft: 8,
                flex: 1,
              }}
            >
              {quarterWinsProgress}/4 quarter wins to free credit
            </Text>
            {availableCredits > 0 && (
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Rubik_500Medium",
                  color: theme.colors.primary,
                }}
              >
                {availableCredits} credit{availableCredits !== 1 ? "s" : ""}
              </Text>
            )}
          </View>
          <View
            style={{
              height: 5,
              borderRadius: 3,
              backgroundColor: theme.dark ? "#333" : "#e0e0e0",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${(quarterWinsProgress / 4) * 100}%`,
                backgroundColor: theme.colors.primary,
                borderRadius: 3,
              }}
            />
          </View>
        </Animated.View>
        )}

        {/* ─── ACTIVITY ─── Group C */}
        <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
          Activity
        </Text>
        <PendingInvitesSection />
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: "rgba(94, 96, 206, 0.4)",
              borderLeftColor: theme.colors.primary,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => navigation.navigate("FriendsScreen")}
          >
            <View style={styles.settingsLeft}>
              <MaterialIcons
                name="people"
                size={22}
                color={theme.colors.primary}
              />
              <Text
                style={[styles.settingsText, { color: theme.colors.onSurface }]}
              >
                Friends
              </Text>
            </View>
            <View style={styles.settingsRight}>
              {!groupCLoaded ? (
                <View style={{ width: 22, height: 14, borderRadius: 4, backgroundColor: theme.dark ? "#2b2b2d" : "#e8e8f0" }} />
              ) : (
                <Text
                  style={[
                    styles.settingsBadge,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {friendsCount}
                </Text>
              )}
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* ─── ACHIEVEMENTS ─── */}
        <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
          Achievements
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: "rgba(94, 96, 206, 0.4)",
              borderLeftColor: theme.colors.primary,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => navigation.navigate("LeaderboardScreen")}
          >
            <View style={styles.settingsLeft}>
              <MaterialIcons
                name="leaderboard"
                size={22}
                color={theme.colors.primary}
              />
              <Text
                style={[styles.settingsText, { color: theme.colors.onSurface }]}
              >
                Leaderboard
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.settingsDivider,
              { backgroundColor: theme.dark ? "#333" : "#eee" },
            ]}
          />

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => navigation.navigate("BadgesScreen")}
          >
            <View style={styles.settingsLeft}>
              <MaterialIcons
                name="emoji-events"
                size={22}
                color={theme.colors.primary}
              />
              <Text
                style={[styles.settingsText, { color: theme.colors.onSurface }]}
              >
                Badges
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>

        {/* ─── ACCOUNT ─── */}
        <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
          Account
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: "rgba(94, 96, 206, 0.4)",
              borderLeftColor: theme.colors.primary,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => !isPremium && premiumGate.open("premium_row")}
          >
            <View style={styles.settingsLeft}>
              <MaterialIcons
                name="workspace-premium"
                size={22}
                color="#FFD700"
              />
              <Text
                style={[styles.settingsText, { color: theme.colors.onSurface }]}
              >
                Premium
              </Text>
            </View>
            {isPremium ? (
              <View
                style={{
                  backgroundColor: "#FFD700",
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    color: "#000",
                    fontSize: 12,
                    fontWeight: "700",
                    fontFamily: "Sora",
                  }}
                >
                  {premiumType === "legacy_onetime" ? "LIFETIME" : "ACTIVE"}
                </Text>
              </View>
            ) : (
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={theme.colors.onSurfaceVariant}
              />
            )}
          </TouchableOpacity>

          <View
            style={[
              styles.settingsDivider,
              { backgroundColor: theme.dark ? "#333" : "#eee" },
            ]}
          />

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => setPwModalVisible(true)}
          >
            <View style={styles.settingsLeft}>
              <MaterialIcons
                name="lock"
                size={22}
                color={theme.colors.primary}
              />
              <Text
                style={[styles.settingsText, { color: theme.colors.onSurface }]}
              >
                Change Password
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.settingsDivider,
              { backgroundColor: theme.dark ? "#333" : "#eee" },
            ]}
          />

          <View style={styles.settingsRow}>
            <View style={styles.settingsLeft}>
              <MaterialIcons
                name="visibility-off"
                size={22}
                color={theme.colors.primary}
              />
              <View style={{ marginLeft: 12 }}>
                <Text
                  style={[
                    styles.settingsText,
                    { color: theme.colors.onSurface, marginLeft: 0 },
                  ]}
                >
                  Private Account
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Sora",
                    color: theme.colors.onSurfaceVariant,
                    marginTop: 2,
                  }}
                >
                  Hide from search results
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={async () => {
                const newValue = !isPrivate;
                setIsPrivate(newValue);
                try {
                  const {
                    data: { user },
                  } = await supabase.auth.getUser();
                  if (!user) return;
                  const { error: privacyError } = await supabase
                    .from("users")
                    .update({ is_private: newValue })
                    .eq("id", user.id);
                  if (privacyError) throw privacyError;
                  showToast({
                    type: "success",
                    text1: newValue
                      ? "Account set to private"
                      : "Account set to public",
                  });
                } catch {
                  setIsPrivate(!newValue);
                  showToast({
                    type: "error",
                    text1: "Failed to update privacy setting",
                  });
                }
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 6,
                borderRadius: 16,
                minWidth: 50,
                alignItems: "center",
                backgroundColor: isPrivate
                  ? theme.colors.primary
                  : theme.dark
                    ? "#444"
                    : "#ddd",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: isPrivate ? "#fff" : theme.colors.onSurface,
                }}
              >
                {isPrivate ? "ON" : "OFF"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── SYSTEM (dev only) ─── */}
        {__DEV__ && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
              System
            </Text>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: "rgba(255, 152, 0, 0.3)",
                  borderLeftColor: "#FF9800",
                },
              ]}
            >
              <View style={styles.settingsRow}>
                <View style={styles.settingsLeft}>
                  <MaterialIcons name="bug-report" size={22} color="#FF9800" />
                  <View style={{ marginLeft: 12 }}>
                    <Text
                      style={[
                        styles.settingsText,
                        { color: theme.colors.onSurface, marginLeft: 0 },
                      ]}
                    >
                      Dev: Premium Mode
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Sora",
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 2,
                      }}
                    >
                      Simulate premium for testing
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={toggleDevPremium}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 6,
                    borderRadius: 16,
                    minWidth: 50,
                    alignItems: "center",
                    backgroundColor: isDevMode
                      ? "#FF9800"
                      : theme.dark
                        ? "#444"
                        : "#ddd",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: isDevMode ? "#fff" : theme.colors.onSurface,
                    }}
                  >
                    {isDevMode ? "ON" : "OFF"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Dev: Add Free Credit */}
              <View
                style={[
                  styles.settingsRow,
                  { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(255,152,0,0.15)" },
                ]}
              >
                <View style={styles.settingsLeft}>
                  <MaterialIcons name="card-giftcard" size={22} color="#FF9800" />
                  <View style={{ marginLeft: 12 }}>
                    <Text
                      style={[
                        styles.settingsText,
                        { color: theme.colors.onSurface, marginLeft: 0 },
                      ]}
                    >
                      Dev: Add Free Credit
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Sora",
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 2,
                      }}
                    >
                      Current balance: {availableCredits}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  disabled={devCreditAdding}
                  onPress={async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    setDevCreditAdding(true);
                    const ok = await insertDevCredit(user.id);
                    if (ok) {
                      fetchUserData(true);
                    }
                    setDevCreditAdding(false);
                  }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 6,
                    borderRadius: 16,
                    minWidth: 50,
                    alignItems: "center",
                    backgroundColor: devCreditAdding ? "#888" : "#FF9800",
                    opacity: devCreditAdding ? 0.6 : 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: "#fff",
                    }}
                  >
                    {devCreditAdding ? "..." : "+1"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* ─── CRITICAL ACTIONS ─── */}
        <View style={{ marginTop: 8 }}>
          <Button
            icon="logout"
            mode="contained"
            onPress={handleLogout}
            style={styles.logoutButton}
            labelStyle={styles.buttonLabel}
          >
            Log Out
          </Button>

          <Button
            icon="delete"
            mode="outlined"
            onPress={() => setDeleteModalVisible(true)}
            textColor={theme.colors.error}
            style={[
              styles.deleteButton,
              {
                backgroundColor: theme.dark ? theme.colors.error : "#ffe5e5",
                borderColor: theme.colors.error,
              },
            ]}
            labelStyle={[
              styles.buttonLabel,
              {
                color: theme.dark ? theme.colors.onPrimary : theme.colors.error,
              },
            ]}
          >
            Delete Account
          </Button>
        </View>
        <Portal>
          <Modal
            visible={editModalVisible}
            onDismiss={() => setEditModalVisible(false)}
            contentContainerStyle={{
              marginHorizontal: 28,
              borderRadius: 16,
              backgroundColor: theme.colors.surface,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <View
              style={{
                backgroundColor: theme.colors.primary,
                paddingVertical: 20,
                paddingHorizontal: 20,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="alternate-email" size={20} color="#fff" />
              </View>
              <View>
                <Text
                  style={{
                    fontSize: 17,
                    fontFamily: "SoraBold",
                    color: "#fff",
                  }}
                >
                  Edit Username
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.75)",
                    fontFamily: "Rubik_400Regular",
                  }}
                >
                  Current: @{username}
                </Text>
              </View>
            </View>

            {/* Body */}
            <View style={{ padding: 20 }}>
              <TextInput
                mode="outlined"
                placeholder="New username"
                value={newUsername}
                onChangeText={setNewUsername}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                style={[
                  styles.input,
                  { backgroundColor: theme.colors.background },
                ]}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Rubik_400Regular",
                  color: theme.colors.onSurfaceVariant,
                  textAlign: "right",
                  marginTop: 4,
                  marginBottom: 16,
                }}
              >
                {newUsername.length}/20
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 12,
                }}
              >
                <Button
                  mode="text"
                  onPress={() => setEditModalVisible(false)}
                  textColor={theme.colors.onSurface}
                  disabled={usernameUpdating}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={updateUsername}
                  loading={usernameUpdating}
                  disabled={usernameUpdating}
                  labelStyle={{ fontFamily: "Sora" }}
                >
                  Save
                </Button>
              </View>
            </View>
          </Modal>

          <Modal
            visible={pwModalVisible}
            onDismiss={() => setPwModalVisible(false)}
            contentContainerStyle={{
              marginHorizontal: 28,
              borderRadius: 16,
              backgroundColor: theme.colors.surface,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <View
              style={{
                backgroundColor: theme.colors.primary,
                paddingVertical: 20,
                paddingHorizontal: 20,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="lock-outline" size={20} color="#fff" />
              </View>
              <View>
                <Text
                  style={{
                    fontSize: 17,
                    fontFamily: "SoraBold",
                    color: "#fff",
                  }}
                >
                  Change Password
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.75)",
                    fontFamily: "Rubik_400Regular",
                  }}
                >
                  Must be at least 6 characters
                </Text>
              </View>
            </View>

            {/* Body */}
            <View style={{ padding: 20 }}>
              <TextInput
                mode="outlined"
                placeholder="New password"
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                style={[
                  styles.input,
                  { backgroundColor: theme.colors.background },
                ]}
                right={
                  <TextInput.Icon
                    icon={showNewPassword ? "eye-off" : "eye"}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  />
                }
              />
              <TextInput
                mode="outlined"
                placeholder="Confirm new password"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={[
                  styles.input,
                  { backgroundColor: theme.colors.background, marginTop: 10 },
                ]}
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? "eye-off" : "eye"}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                }
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 12,
                  marginTop: 16,
                }}
              >
                <Button
                  mode="text"
                  onPress={() => setPwModalVisible(false)}
                  textColor={theme.colors.onSurface}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={updatePassword}
                  loading={pwUpdating}
                  labelStyle={{ fontFamily: "Sora" }}
                >
                  Change
                </Button>
              </View>
            </View>
          </Modal>

          <Modal
            visible={deleteModalVisible}
            onDismiss={() => setDeleteModalVisible(false)}
            contentContainerStyle={{
              marginHorizontal: 24,
              borderRadius: 16,
              backgroundColor: theme.colors.surface,
              overflow: "hidden",
              padding: 0,
            }}
          >
            <LinearGradient
              colors={[theme.colors.error, "#b71c1c"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 20,
                paddingBottom: 16,
              }}
            >
              <MaterialIcons name="warning" size={22} color="#fff" style={{ marginRight: 10 }} />
              <Text style={{ flex: 1, fontSize: 20, fontFamily: "SoraBold", color: "#fff" }}>
                Delete Account
              </Text>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            <View style={{ padding: 20 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Rubik_400Regular",
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 20,
                }}
              >
                Are you sure you want to delete your account? This action cannot
                be undone and all your data will be permanently removed.
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 12,
                }}
              >
                <Button
                  mode="text"
                  onPress={() => setDeleteModalVisible(false)}
                  textColor={theme.colors.onSurface}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={confirmDeleteAccount}
                  buttonColor={theme.colors.error}
                  labelStyle={{ fontFamily: "Sora" }}
                >
                  Delete
                </Button>
              </View>
            </View>
          </Modal>
          {/* Avatar Editor Modal */}
          <Modal
            visible={showAvatarEditor}
            onDismiss={() => setShowAvatarEditor(false)}
            contentContainerStyle={{
              marginHorizontal: 20,
              padding: 20,
              borderRadius: 16,
              backgroundColor: theme.colors.surface,
              borderWidth: 1.5,
              borderColor: "rgba(94,96,206,0.4)",
              borderLeftWidth: 5,
              borderLeftColor: theme.colors.primary,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontFamily: "SoraBold",
                color: theme.colors.onSurface,
                marginBottom: 16,
              }}
            >
              Customize Avatar
            </Text>

            {/* Live preview */}
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <UserAvatar
                username={username}
                activeBadge={activeBadge}
                profileIcon={draftIcon}
                profileColor={draftColor}
                showRing
                size={72}
                backgroundColor={theme.colors.primary}
              />
            </View>

            {/* Color picker — available to everyone */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 10,
                gap: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Rubik_600SemiBold",
                  color: theme.colors.onSurfaceVariant,
                }}
              >
                BACKGROUND COLOR
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: isPremium ? 8 : 20,
              }}
            >
              {colors.colorOptions.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setDraftColor(c)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: c,
                    borderWidth: draftColor === c ? 3 : 1.5,
                    borderColor: draftColor === c ? "#fff" : "transparent",
                    shadowColor: draftColor === c ? c : "transparent",
                    shadowRadius: draftColor === c ? 6 : 0,
                    shadowOpacity: 0.8,
                    elevation: draftColor === c ? 4 : 0,
                  }}
                />
              ))}
            </View>

            {/* Custom color wheel — premium only */}
            {isPremium ? (
              <TouchableOpacity
                onPress={() => setShowColorPicker(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 20,
                  alignSelf: "flex-start",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: theme.colors.primary,
                }}
              >
                <MaterialIcons
                  name="palette"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Rubik_500Medium",
                    color: theme.colors.primary,
                  }}
                >
                  Custom Color
                </Text>
              </TouchableOpacity>
            ) : null}

            {/* Icon picker — premium only */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 10,
                gap: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Rubik_600SemiBold",
                  color: theme.colors.onSurfaceVariant,
                }}
              >
                ICON
              </Text>
              {!isPremium && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                    backgroundColor: "#FFD700" + "25",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 8,
                  }}
                >
                  <MaterialIcons name="lock" size={11} color="#c8860a" />
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: "Rubik_600SemiBold",
                      color: "#c8860a",
                    }}
                  >
                    Premium
                  </Text>
                </View>
              )}
            </View>
            <FlatList
              data={iconOptions}
              keyExtractor={(item) => item.name}
              numColumns={5}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    if (!isPremium) {
                      setShowAvatarEditor(false);
                      premiumGate.open("icon");
                      return;
                    }
                    setDraftIcon(draftIcon === item.name ? null : item.name);
                  }}
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    margin: 4,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      draftIcon === item.name
                        ? theme.colors.primary + "30"
                        : theme.dark
                          ? "#2a2a2a"
                          : "#f5f5f5",
                    borderWidth: draftIcon === item.name ? 2 : 1,
                    borderColor:
                      draftIcon === item.name
                        ? theme.colors.primary
                        : "transparent",
                    opacity: isPremium ? 1 : 0.4,
                  }}
                >
                  <MaterialIcons
                    name={item.name}
                    size={22}
                    color={
                      draftIcon === item.name
                        ? theme.colors.primary
                        : theme.colors.onSurfaceVariant
                    }
                  />
                </TouchableOpacity>
              )}
              style={{ marginBottom: 16 }}
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 12,
              }}
            >
              <Button
                mode="text"
                onPress={() => setShowAvatarEditor(false)}
                textColor={theme.colors.onSurface}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={saveAvatarSettings}
                loading={savingAvatar}
                labelStyle={{ fontFamily: "Sora" }}
              >
                Save
              </Button>
            </View>
          </Modal>

          <ColorPickerModal
            visible={showColorPicker}
            onDismiss={() => setShowColorPicker(false)}
            onColorSelect={(c) => {
              setDraftColor(c);
              setShowColorPicker(false);
            }}
            initialColor={draftColor || theme.colors.primary}
          />

          <Toast config={getToastConfig(theme.dark)} />
        </Portal>
      </ScrollView>

      <PremiumUpgradeModal
        visible={premiumGate.visible}
        onDismiss={premiumGate.close}
        source={premiumGate.source ?? undefined}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  // Avatar Header
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
    marginTop: 8,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  avatarText: {
    color: "#fff",
    fontSize: 32,
    fontFamily: "SoraBold",
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  usernameText: {
    fontSize: 18,
    fontFamily: "Rubik_500Medium",
  },
  editButton: {
    padding: 4,
  },
  emailText: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    marginTop: 4,
  },
  // Stats Row
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    marginTop: 4,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "SoraBold",
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Rubik_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
    marginLeft: 4,
    opacity: 0.5,
  },
  // Settings Card
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderLeftWidth: 5,
    padding: 4,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  settingsText: {
    fontSize: 16,
    fontFamily: "Rubik_500Medium",
  },
  settingsBadge: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
  },
  settingsDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  // Form
  input: {
    marginBottom: 12,
  },
  // Buttons
  logoutButton: {
    marginBottom: 12,
  },
  deleteButton: {
    marginBottom: 16,
  },
  buttonLabel: {
    fontWeight: "600",
    fontFamily: "Sora",
  },
});

export default ProfileScreen;
