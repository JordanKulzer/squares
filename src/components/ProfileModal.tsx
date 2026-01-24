import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import { Modal, Portal, Button, TextInput, useTheme } from "react-native-paper";
import { supabase } from "../lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

const ProfileModal = ({ visible, onDismiss, userGames, onNameChange }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(800)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [username, setUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [showEditUsername, setShowEditUsername] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [totalWinnings, setTotalWinnings] = useState(0);

  const editAnim = useRef(new Animated.Value(0)).current;
  const logoutAnim = useRef(new Animated.Value(0)).current;
  const deleteAnim = useRef(new Animated.Value(0)).current;

  const animateModal = (animRef, show) => {
    Animated.parallel([
      Animated.timing(animRef, {
        toValue: show ? 1 : 0,
        duration: show ? 250 : 10000,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        // ✅ Fetch data after animation completes
        fetchFirstName();
      });
    } else {
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [visible]);

  useEffect(() => animateModal(editAnim, showEditUsername), [showEditUsername]);
  useEffect(() => animateModal(logoutAnim, showLogout), [showLogout]);
  useEffect(
    () => animateModal(deleteAnim, showConfirmDelete),
    [showConfirmDelete],
  );

  const fetchFirstName = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("users")
      .select("username, total_winnings")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      setUsername(data.username || "");
      setTotalWinnings(data.total_winnings || 0);
    }
  };

  const updateUserName = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("No user found when updating username");
      return false;
    }

    // Use upsert to create the user row if it doesn't exist
    const { data, error } = await supabase
      .from("users")
      .upsert(
        {
          id: user.id,
          username: newUsername.trim(),
          email: user.email,
        },
        { onConflict: "id" }
      )
      .select();

    if (error) {
      console.error("Failed to update username:", error);
      return false;
    }
    setUsername(newUsername.trim());
    return true;
  };

  const deleteUserData = async (uid) => {
    try {
      // Delete related data but NOT the users table (using soft delete instead)
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

      // Mark account as deleted (soft delete) - prevents re-login
      const { error: updateError } = await supabase
        .from("users")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Delete user data from database
      await deleteUserData(user.id);

      // Sign out user (cannot delete auth user from client without admin privileges)
      // Note: User can technically log back in but will be blocked by deleted_at check
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.error("Error deleting account:", error);
    }
  };

  const surfaceColor = theme.colors.surface;
  const onSurfaceColor = theme.colors.onSurface;
  const dividerColor = theme.dark ? "#333" : "#eee";

  const dialogCardStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.dark ? "#444" : "#ccc",
    borderLeftWidth: 5,
    borderLeftColor: theme.colors.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginHorizontal: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
  };

  const getAnimatedStyle = (animRef) => ({
    opacity: animRef,
    transform: [
      {
        scale: animRef.interpolate({
          inputRange: [0, 1],
          outputRange: [0.95, 1],
        }),
      },
    ],
  });

  return (
    <>
      <Portal>
        <Modal
          visible={visible}
          onDismiss={onDismiss}
          dismissable={false}
          contentContainerStyle={{
            height: "100%",
            backgroundColor: "transparent",
          }}
        >
          <TouchableWithoutFeedback onPress={onDismiss}>
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.4)",
              }}
            />
          </TouchableWithoutFeedback>

          <Animated.View
            style={{
              transform: [{ translateY: slideAnim }],
              backgroundColor: surfaceColor,
              width: "100%",
              position: "absolute",
              bottom: -35,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              overflow: "visible",
              paddingHorizontal: 20,
              paddingTop: 24,
              paddingBottom: 32,
              maxHeight: 500,
              borderWidth: 1.5,
              borderLeftWidth: 5,
              borderColor: "rgba(94, 96, 206, 0.4)",
              borderLeftColor: theme.colors.primary,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 24,
                }}
              >
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: onSurfaceColor,
                    fontFamily: "SoraBold",
                  }}
                >
                  Your Profile
                </Text>
                <TouchableOpacity onPress={onDismiss}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: theme.colors.error,
                      fontFamily: "Sora",
                    }}
                  >
                    Close
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={{
                  height: 1,
                  backgroundColor: dividerColor,
                  marginBottom: 20,
                }}
              />

              <Text
                style={{
                  fontSize: 16,
                  color: onSurfaceColor,
                  fontFamily: "Sora",
                }}
              >
                Username: {username}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setNewUsername(username);
                  onDismiss();
                  setTimeout(() => setShowEditUsername(true), 300);
                }}
              >
                <Text
                  style={{
                    color: theme.colors.primary,
                    marginBottom: 20,
                    fontFamily: "Sora",
                  }}
                >
                  Edit Username
                </Text>
              </TouchableOpacity>

              <Text style={{ color: onSurfaceColor, fontFamily: "Sora" }}>
                Games Joined: {userGames.length}
              </Text>
              <Text
                style={{
                  color: theme.colors.primary,
                  fontFamily: "SoraBold",
                  marginTop: 4,
                }}
              >
                Total Winnings: ${totalWinnings.toFixed(2)}
              </Text>

              <Button
                icon="logout"
                mode="contained"
                onPress={() => {
                  onDismiss();
                  setTimeout(() => setShowLogout(true), 300);
                }}
                style={{ marginTop: 24 }}
                labelStyle={{ fontWeight: "600", fontFamily: "Sora" }}
              >
                Log Out
              </Button>

              <Button
                icon="delete"
                mode="outlined"
                onPress={() => {
                  onDismiss();
                  setTimeout(() => setShowConfirmDelete(true), 300);
                }}
                textColor={theme.colors.error}
                style={{
                  marginTop: 12,
                  backgroundColor: theme.dark ? theme.colors.error : "#ffe5e5",
                  borderColor: theme.colors.error,
                }}
                labelStyle={{
                  fontWeight: "600",
                  fontFamily: "Sora",
                  color: theme.dark
                    ? theme.colors.onPrimary
                    : theme.colors.error,
                }}
              >
                Delete Account
              </Button>
            </ScrollView>
          </Animated.View>
        </Modal>
      </Portal>

      <Portal>
        <Modal
          visible={showEditUsername}
          onDismiss={() => {
            Animated.timing(editAnim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }).start(() => {
              setShowEditUsername(false);
            });
          }}
        >
          <Animated.View style={[dialogCardStyle, getAnimatedStyle(editAnim)]}>
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 18,
                marginBottom: 12,
                color: onSurfaceColor,
                fontFamily: "Sora",
              }}
            >
              Edit Username
            </Text>
            <View
              style={{
                height: 1,
                backgroundColor: dividerColor,
                marginBottom: 20,
              }}
            />
            <TextInput
              mode="outlined"
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="Enter new username"
              style={{
                backgroundColor: theme.colors.background,
                marginBottom: 12,
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <Button
                textColor={theme.colors.error}
                onPress={() => setShowEditUsername(false)}
                labelStyle={{ fontFamily: "Sora" }}
              >
                Close
              </Button>
              <Button
                onPress={async () => {
                  if (!newUsername.trim()) return;
                  const success = await updateUserName();
                  if (success) {
                    onNameChange?.();
                    Toast.show({
                      type: "success",
                      text1: "Username updated",
                      position: "bottom",
                      bottomOffset: 60,
                    });
                  } else {
                    Toast.show({
                      type: "error",
                      text1: "Failed to update username",
                      position: "bottom",
                      bottomOffset: 60,
                    });
                  }
                  setShowEditUsername(false);
                }}
                labelStyle={{ fontFamily: "Sora" }}
              >
                Save
              </Button>
            </View>
          </Animated.View>
        </Modal>
      </Portal>

      <Portal>
        <Modal
          visible={showLogout}
          onDismiss={() => {
            Animated.timing(logoutAnim, {
              toValue: 0,
              duration: 400, // slow fade out
              useNativeDriver: true,
            }).start(() => {
              setShowLogout(false); // hide after animation completes
            });
          }}
        >
          <Animated.View
            style={[dialogCardStyle, getAnimatedStyle(logoutAnim)]}
          >
            <Text
              style={{
                fontSize: 18,
                marginBottom: 12,
                color: onSurfaceColor,
                fontFamily: "SoraBold",
              }}
            >
              Log Out
            </Text>
            <View
              style={{
                height: 1,
                backgroundColor: dividerColor,
                marginBottom: 20,
              }}
            />
            <Text
              style={{
                color: onSurfaceColor,
                marginBottom: 20,
                fontFamily: "Sora",
              }}
            >
              Are you sure you want to log out?
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <Button
                textColor={theme.colors.error}
                labelStyle={{ fontFamily: "Sora" }}
                onPress={() => setShowLogout(false)}
              >
                Close
              </Button>
              <Button
                labelStyle={{ fontFamily: "Sora" }}
                onPress={async () => {
                  setShowLogout(false);
                  await supabase.auth.signOut();
                  onDismiss();
                }}
              >
                Log Out
              </Button>
            </View>
          </Animated.View>
        </Modal>
      </Portal>

      {/* Delete Confirm Modal */}
      <Portal>
        <Modal
          visible={showConfirmDelete}
          onDismiss={() => {
            Animated.timing(deleteAnim, {
              toValue: 0,
              duration: 400, // slow fade out
              useNativeDriver: true,
            }).start(() => {
              setShowConfirmDelete(false); // hide after animation completes
            });
          }}
        >
          <Animated.View
            style={[dialogCardStyle, getAnimatedStyle(deleteAnim)]}
          >
            <Text
              style={{
                fontSize: 18,
                marginBottom: 12,
                color: onSurfaceColor,
                fontFamily: "SoraBold",
              }}
            >
              Delete Account
            </Text>
            <View
              style={{
                height: 1,
                backgroundColor: dividerColor,
                marginBottom: 20,
              }}
            />
            <Text
              style={{
                color: onSurfaceColor,
                marginBottom: 20,
                fontFamily: "Sora",
              }}
            >
              Are you sure you want to permanently delete your account? This
              cannot be undone.
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <Button
                textColor={theme.colors.error}
                labelStyle={{ fontFamily: "Sora" }}
                onPress={() => setShowConfirmDelete(false)}
              >
                Close
              </Button>
              <Button
                labelStyle={{ fontFamily: "Sora" }}
                onPress={async () => {
                  setShowConfirmDelete(false);
                  await deleteAccount();
                  onDismiss();
                }}
              >
                Delete
              </Button>
            </View>
          </Animated.View>
        </Modal>
      </Portal>
    </>
  );
};

export default ProfileModal;
