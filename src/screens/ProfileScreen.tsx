import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Keyboard,
  RefreshControl,
  Alert,
} from "react-native";
import { Button, TextInput, useTheme, Portal, Modal } from "react-native-paper";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import Toast from "react-native-toast-message";
import { getToastConfig } from "../components/ToastConfig";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import SkeletonLoader from "../components/SkeletonLoader";
import PendingInvitesSection from "../components/PendingInvitesSection";

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const ProfileScreen = ({ navigation }: Props) => {
  const theme = useTheme();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [totalWinnings, setTotalWinnings] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [quartersWon, setQuartersWon] = useState(0);
  const [rawQuartersWon, setRawQuartersWon] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  const [resetStatsModalVisible, setResetStatsModalVisible] = useState(false);
  const [resetWinnings, setResetWinnings] = useState(false);
  const [resetGames, setResetGames] = useState(false);
  const [resetQuarters, setResetQuarters] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

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
      fetchUserData();
    }, []),
  );

  const fetchUserData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setEmail(user.email || "");

      // Fetch user profile data
      const { data, error: profileError } = await supabase
        .from("users")
        .select("username, total_winnings, is_private, quarters_won_offset")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      const currentUsername = data?.username || "";

      if (data) {
        setUsername(currentUsername);
        setNewUsername(currentUsername);
        setTotalWinnings(data.total_winnings || 0);
        setIsPrivate(!!data.is_private);
      }

      // Fetch user's games directly from database
      const { data: gamesData, error: gamesError } = await supabase
        .from("squares")
        .select("id, selections, game_completed, quarter_winners, players")
        .contains("player_ids", [user.id]);

      if (gamesError) {
        throw gamesError;
      }

      if (gamesData) {
        setGamesPlayed(gamesData.length);

        // Count quarters won across all games
        // quarter_winners structure: [{ quarter: "1", username: "user1", square: [3, 7] }, ...]
        // Note: Users can have different usernames in each game, so we need to find
        // the user's in-game username from the players array
        let totalQuartersWon = 0;
        gamesData.forEach((game) => {
          if (game.quarter_winners && Array.isArray(game.quarter_winners)) {
            // Find this user's in-game username from the players array
            const playerEntry = game.players?.find(
              (p: any) => p.userId === user.id,
            );
            const inGameUsername = playerEntry?.username;

            if (inGameUsername) {
              const trimmedName = inGameUsername.trim();
              const userWins = game.quarter_winners.filter(
                (qw: any) =>
                  qw.username?.trim() === trimmedName && qw.username !== "No Winner",
              );
              totalQuartersWon += userWins.length;
            }
          }
        });
        setRawQuartersWon(totalQuartersWon);
        const offset = data?.quarters_won_offset || 0;
        setQuartersWon(Math.max(0, totalQuartersWon - offset));
      }

      // Fetch friends count for display (count accepted friendships where user is either party)
      const friendsCountRes = await supabase
        .from("friends")
        .select("id", { count: "exact", head: true })
        .eq("status", "accepted")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
      if (!friendsCountRes.error) {
        setFriendsCount(friendsCountRes.count || 0);
      }
    } catch (err) {
      console.error("Failed to fetch profile data:", err);
      showToast({
        type: "error",
        text1: "Failed to load profile",
        text2: "Pull down to retry",
      });
    } finally {
      setLoading(false);
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

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(/[_\s]/)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <LinearGradient colors={gradientColors} style={{ flex: 1 }}>
        <View style={styles.container}>
          <SkeletonLoader variant="profile" />
        </View>
      </LinearGradient>
    );
  }

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
          <View
            style={[
              styles.avatarCircle,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <Text style={styles.avatarText}>{getInitials(username)}</Text>
          </View>
          <View style={styles.usernameRow}>
            <Text
              style={[styles.usernameText, { color: theme.colors.onSurface }]}
            >
              @{username || "username"}
            </Text>
            <TouchableOpacity
              onPress={() => setEditModalVisible(true)}
              style={styles.editButton}
            >
              <MaterialIcons
                name="edit"
                size={18}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>
          {email ? (
            <Text
              style={[styles.emailText, { color: theme.colors.onSurfaceVariant }]}
            >
              {email}
            </Text>
          ) : null}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {gamesPlayed}
            </Text>
            <Text
              style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}
            >
              Played
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {quartersWon}
            </Text>
            <Text
              style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}
            >
              Won
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              ${totalWinnings.toFixed(2)}
            </Text>
            <Text
              style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}
            >
              Winnings
            </Text>
          </View>
        </View>

        {/* Pending Game Invites */}
        <PendingInvitesSection />

        {/* Settings Card */}
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
              <Text
                style={[
                  styles.settingsBadge,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {friendsCount}
              </Text>
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
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

          {/* Private Account */}
          <View style={styles.settingsRow}>
            <View style={styles.settingsLeft}>
              <MaterialIcons
                name="visibility-off"
                size={22}
                color={theme.colors.primary}
              />
              <View style={{ marginLeft: 12 }}>
                <Text
                  style={[styles.settingsText, { color: theme.colors.onSurface, marginLeft: 0 }]}
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
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;
                  const { error: privacyError } = await supabase
                    .from("users")
                    .update({ is_private: newValue })
                    .eq("id", user.id);
                  if (privacyError) throw privacyError;
                  showToast({
                    type: "success",
                    text1: newValue ? "Account set to private" : "Account set to public",
                  });
                } catch {
                  setIsPrivate(!newValue);
                  showToast({ type: "error", text1: "Failed to update privacy setting" });
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

          <View
            style={[
              styles.settingsDivider,
              { backgroundColor: theme.dark ? "#333" : "#eee" },
            ]}
          />

          {/* Reset Stats */}
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => {
              setResetWinnings(false);
              setResetGames(false);
              setResetQuarters(false);
              setResetStatsModalVisible(true);
            }}
          >
            <View style={styles.settingsLeft}>
              <MaterialIcons
                name="restart-alt"
                size={22}
                color={theme.colors.error}
              />
              <Text
                style={[styles.settingsText, { color: theme.colors.error }]}
              >
                Reset Stats
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>

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
        <Portal>
          <Modal
            visible={editModalVisible}
            onDismiss={() => setEditModalVisible(false)}
            contentContainerStyle={{
              marginHorizontal: 32,
              padding: 20,
              borderRadius: 12,
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
                marginBottom: 12,
                color: theme.colors.onSurface,
              }}
            >
              Edit Username
            </Text>
            <TextInput
              mode="outlined"
              placeholder="Username"
              value={newUsername}
              onChangeText={setNewUsername}
              style={[
                styles.input,
                { backgroundColor: theme.colors.background },
              ]}
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
          </Modal>

          <Modal
            visible={pwModalVisible}
            onDismiss={() => setPwModalVisible(false)}
            contentContainerStyle={{
              marginHorizontal: 32,
              padding: 20,
              borderRadius: 12,
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
                marginBottom: 12,
                color: theme.colors.onSurface,
              }}
            >
              Change Password
            </Text>
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
                { backgroundColor: theme.colors.background },
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
          </Modal>

          <Modal
            visible={deleteModalVisible}
            onDismiss={() => setDeleteModalVisible(false)}
            contentContainerStyle={{
              marginHorizontal: 32,
              padding: 20,
              borderRadius: 12,
              backgroundColor: theme.colors.surface,
              borderWidth: 1.5,
              borderColor: theme.colors.error,
              borderLeftWidth: 5,
              borderLeftColor: theme.colors.error,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <MaterialIcons name="warning" size={24} color={theme.colors.error} />
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: "SoraBold",
                  marginLeft: 8,
                  color: theme.colors.onSurface,
                }}
              >
                Delete Account
              </Text>
            </View>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Rubik_400Regular",
                color: theme.colors.onSurfaceVariant,
                marginBottom: 20,
              }}
            >
              Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.
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
          </Modal>
          {/* Reset Stats Modal */}
          <Modal
            visible={resetStatsModalVisible}
            onDismiss={() => setResetStatsModalVisible(false)}
            contentContainerStyle={{
              margin: 20,
              padding: 20,
              borderRadius: 16,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontFamily: "SoraBold",
                color: theme.colors.onSurface,
                marginBottom: 4,
              }}
            >
              Reset Stats
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Sora",
                color: theme.colors.onSurfaceVariant,
                marginBottom: 16,
              }}
            >
              Select which stats to reset. This cannot be undone.
            </Text>

            <TouchableOpacity
              onPress={() => setResetWinnings(!resetWinnings)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.dark ? "#333" : "#eee",
              }}
            >
              <MaterialIcons
                name={resetWinnings ? "check-box" : "check-box-outline-blank"}
                size={24}
                color={resetWinnings ? theme.colors.error : theme.colors.onSurfaceVariant}
              />
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontFamily: "SoraBold", color: theme.colors.onSurface }}>
                  Total Winnings
                </Text>
                <Text style={{ fontFamily: "Sora", fontSize: 12, color: theme.colors.onSurfaceVariant }}>
                  Currently: ${totalWinnings.toFixed(2)}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setResetQuarters(!resetQuarters)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.dark ? "#333" : "#eee",
              }}
            >
              <MaterialIcons
                name={resetQuarters ? "check-box" : "check-box-outline-blank"}
                size={24}
                color={resetQuarters ? theme.colors.error : theme.colors.onSurfaceVariant}
              />
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontFamily: "SoraBold", color: theme.colors.onSurface }}>
                  Quarters Won
                </Text>
                <Text style={{ fontFamily: "Sora", fontSize: 12, color: theme.colors.onSurfaceVariant }}>
                  Currently: {quartersWon}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 20, gap: 8 }}>
              <Button
                mode="text"
                onPress={() => setResetStatsModalVisible(false)}
                textColor={theme.colors.onSurfaceVariant}
                labelStyle={{ fontFamily: "Sora" }}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                disabled={!resetWinnings && !resetQuarters}
                buttonColor={theme.colors.error}
                labelStyle={{ fontFamily: "Sora" }}
                onPress={async () => {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;

                    if (resetWinnings) {
                      await supabase
                        .from("users")
                        .update({ total_winnings: 0 })
                        .eq("id", user.id);
                      setTotalWinnings(0);
                    }

                    if (resetQuarters) {
                      const { error: qError } = await supabase
                        .from("users")
                        .update({ quarters_won_offset: rawQuartersWon })
                        .eq("id", user.id);
                      if (qError) throw qError;
                      setQuartersWon(0);
                    }

                    setResetStatsModalVisible(false);
                    showToast({
                      type: "success",
                      text1: "Stats have been reset",
                    });
                  } catch {
                    showToast({ type: "error", text1: "Failed to reset stats" });
                  }
                }}
              >
                Reset Selected
              </Button>
            </View>
          </Modal>

          <Toast config={getToastConfig(theme.dark)} />
        </Portal>
      </ScrollView>
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
    gap: 8,
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
