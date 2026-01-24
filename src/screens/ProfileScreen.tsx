import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Keyboard,
} from "react-native";
import { Button, TextInput, useTheme, Portal, Modal } from "react-native-paper";
import { supabase } from "../lib/supabase";
import Toast from "react-native-toast-message";
import { getToastConfig } from "../components/ToastConfig";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import SkeletonLoader from "../components/SkeletonLoader";

const ProfileScreen = ({ navigation }) => {
  const theme = useTheme();

  const [username, setUsername] = useState("");
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [totalWinnings, setTotalWinnings] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [quartersWon, setQuartersWon] = useState(0);
  const [loading, setLoading] = useState(true);
  const [friendsCount, setFriendsCount] = useState(0);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwUpdating, setPwUpdating] = useState(false);
  const [pwModalVisible, setPwModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
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

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch user profile data
    const { data } = await supabase
      .from("users")
      .select("username, total_winnings")
      .eq("id", user.id)
      .maybeSingle();

    const currentUsername = data?.username || "";

    if (data) {
      setUsername(currentUsername);
      setNewUsername(currentUsername);
      setTotalWinnings(data.total_winnings || 0);
    }

    // Fetch user's games directly from database
    const { data: gamesData, error: gamesError } = await supabase
      .from("squares")
      .select("id, selections, game_completed, quarter_winners, players")
      .contains("player_ids", [user.id]);

    if (!gamesError && gamesData) {
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
            const userWins = game.quarter_winners.filter(
              (qw: any) =>
                qw.username === inGameUsername && qw.username !== "No Winner",
            );
            totalQuartersWon += userWins.length;
          }
        }
      });
      setQuartersWon(totalQuartersWon);
    }

    // Fetch friends count for display
    try {
      const friendsCountRes = await supabase
        .from("friends")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (!friendsCountRes.error) {
        setFriendsCount(friendsCountRes.count || 0);
      }
    } catch (err) {
      console.warn("Failed to fetch friends count", err);
    }

    setLoading(false);
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
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
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
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  };

  const deleteUserData = async (uid) => {
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
    } catch (err) {
      console.error("Failed to delete user data:", err.message);
    }
  };

  const deleteAccount = async () => {
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
      >
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
          <View style={styles.section}>
            <Text
              style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
            >
              Profile Information
            </Text>

            <View style={styles.infoRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.label,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Username
                </Text>
                <Text style={[styles.value, { color: theme.colors.onSurface }]}>
                  {username || "Not set"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(true)}>
                <MaterialIcons
                  name="edit"
                  size={24}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            </View>
            {/* Change Password and Friends rows */}
            <View style={{ marginTop: 12 }}>
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => setPwModalVisible(true)}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.label,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    Password
                  </Text>
                </View>
                <MaterialIcons
                  name="edit"
                  size={24}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.infoRow, { marginTop: 12 }]}
                onPress={() => navigation.navigate("FriendsScreen")}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.label,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    Friends
                  </Text>
                  <Text
                    style={[styles.value, { color: theme.colors.onSurface }]}
                  >
                    {friendsCount} friend{friendsCount !== 1 ? "s" : ""}
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={28}
                  color={theme.colors.onSurface}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: theme.dark ? "#333" : "#eee" },
            ]}
          />

          <View style={styles.section}>
            <Text
              style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
            >
              Statistics
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Squares Played
                </Text>
                <Text
                  style={[styles.statValue, { color: theme.colors.primary }]}
                >
                  {gamesPlayed}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Won
                </Text>
                <Text
                  style={[styles.statValue, { color: theme.colors.primary }]}
                >
                  {quartersWon}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Total Winnings
                </Text>
                <Text
                  style={[styles.statValue, { color: theme.colors.primary }]}
                >
                  {"$" + totalWinnings.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
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
          onPress={deleteAccount}
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
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={updateUsername}
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
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              style={[
                styles.input,
                { backgroundColor: theme.colors.background },
              ]}
            />
            <TextInput
              mode="outlined"
              placeholder="Confirm new password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
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
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderLeftWidth: 5,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "SoraBold",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontFamily: "Rubik_500Medium",
  },
  editContainer: {
    gap: 12,
  },
  input: {
    marginBottom: 12,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  button: {
    minWidth: 80,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: "30%",
  },
  statLabel: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "SoraBold",
  },
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
