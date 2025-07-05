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

const ProfileModal = ({ visible, onDismiss, userGames, onNameChange }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(800)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [firstName, setFirstName] = useState("");
  const [newName, setNewName] = useState("");
  const [showEditName, setShowEditName] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

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
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 600,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      if (visible) {
        fetchFirstName();
      }
    });
  }, [visible]);

  useEffect(() => animateModal(editAnim, showEditName), [showEditName]);
  useEffect(() => animateModal(logoutAnim, showLogout), [showLogout]);
  useEffect(
    () => animateModal(deleteAnim, showConfirmDelete),
    [showConfirmDelete]
  );

  const fetchFirstName = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("users")
      .select("first_name")
      .eq("id", user.id)
      .maybeSingle();
    if (data) setFirstName(data.first_name || "");
  };

  const updateUserName = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("users")
      .update({ first_name: newName.trim() })
      .eq("id", user.id);
    setFirstName(newName.trim());
  };

  const deleteUserData = async (uid) => {
    try {
      const tables = [
        { table: "players", key: "user_id" },
        { table: "selections", key: "user_id" },
        { table: "users", key: "id" },
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.auth.admin.deleteUser(user.id);
    await deleteUserData(user.id);
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
                Name: {firstName}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setNewName(firstName);
                  onDismiss();
                  setTimeout(() => setShowEditName(true), 300);
                }}
              >
                <Text
                  style={{
                    color: theme.colors.primary,
                    marginBottom: 20,
                    fontFamily: "Sora",
                  }}
                >
                  Edit Name
                </Text>
              </TouchableOpacity>

              <Text style={{ color: onSurfaceColor, fontFamily: "Sora" }}>
                Games Joined: {userGames.length}
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

      {/* Edit Name Modal */}
      <Portal>
        <Modal
          visible={showEditName}
          onDismiss={() => {
            Animated.timing(editAnim, {
              toValue: 0,
              duration: 400, // slow fade out
              useNativeDriver: true,
            }).start(() => {
              setShowEditName(false); // hide after animation completes
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
              Edit Name
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
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter new name"
              style={{
                backgroundColor: theme.colors.background,
                marginBottom: 12,
              }}
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <Button
                textColor={theme.colors.error}
                onPress={() => setShowEditName(false)}
                labelStyle={{ fontFamily: "Sora" }}
              >
                Close
              </Button>
              <Button
                onPress={async () => {
                  if (!newName.trim()) return;
                  await updateUserName();
                  onNameChange?.();
                  setShowEditName(false);
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
