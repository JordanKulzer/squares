import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import {
  Modal,
  Portal,
  Button,
  Dialog,
  useTheme,
  TextInput,
} from "react-native-paper";
import { supabase } from "../lib/supabase";
import firestore from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";
import * as ImagePicker from "expo-image-picker";

const ProfileModal = ({ visible, onDismiss, userGames }) => {
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const slideAnim = useRef(new Animated.Value(600)).current;
  const theme = useTheme();

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 600,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  useEffect(() => {
    const fetchFirstName = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("users")
          .select("first_name, profile_image")
          .eq("id", user.id)
          .single();

        if (error || !data) return;
        setFirstName(data.first_name || "");
        setImageUri(data.profile_image || null);
      } catch (err) {
        console.error("Failed to fetch user data:", err);
      }
    };

    if (visible) {
      fetchFirstName();
    }
  }, [visible]);

  const updateUserName = async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return;

    try {
      const { error } = await supabase
        .from("users")
        .update({ first_name: newName.trim() })
        .eq("id", user.id);

      if (error) throw error;

      setFirstName(newName.trim());
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating name:", error);
      alert("Failed to update your name.");
    }
  };

  const getWinCount = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const uid = user?.id;
    return userGames.reduce((count, game) => {
      const winners = game.winners || [];
      return winners.includes(uid) ? count + 1 : count;
    }, 0);
  };

  const deleteUserData = async (uid) => {
    try {
      const { error } = await supabase.from("users").delete().eq("id", uid);
      if (error) throw error;
    } catch (err) {
      console.error("Failed to delete user data:", err);
    }
  };

  const deleteAccount = async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return;

    try {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(
        user.id
      ); // OR:
      // const { error: deleteError } = await supabase.auth.signOut(); // if not using admin API
      if (deleteError) throw deleteError;

      await deleteUserData(user.id);
    } catch (error) {
      if (error.message.includes("recent-login")) {
        alert("Please re-authenticate to delete your account.");
      } else {
        alert(`Error deleting account: ${error.message}`);
      }
    }
  };

  // const pickImage = async () => {
  //   const result = await ImagePicker.launchImageLibraryAsync({
  //     mediaTypes: ImagePicker.MediaTypeOptions.Images,
  //     allowsEditing: true,
  //     quality: 0.7,
  //   });

  //   if (!result.canceled && result.assets.length > 0) {
  //     const uri = result.assets[0].uri;
  //     setImageUri(uri);
  //     await uploadProfileImage(uri);
  //   }
  // };

  // const uploadProfileImage = async (uri) => {
  //   const {
  //     data: { user },
  //     error: authError,
  //   } = await supabase.auth.getUser();
  //   if (authError || !user) return;

  //   try {
  //     const response = await fetch(uri);
  //     const blob = await response.blob();

  //     const filePath = `profileImages/${user.id}.jpg`;

  //     const { error: uploadError } = await supabase.storage
  //       .from("avatars") // 🔁 use your actual bucket name here
  //       .upload(filePath, blob, {
  //         cacheControl: "3600",
  //         upsert: true,
  //         contentType: "image/jpeg",
  //       });

  //     if (uploadError) throw uploadError;

  //     const { data: publicUrlData, error: urlError } = supabase.storage
  //       .from("avatars")
  //       .getPublicUrl(filePath);

  //     if (urlError || !publicUrlData?.publicUrl) {
  //       throw urlError || new Error("Failed to get public URL.");
  //     }

  //     const downloadURL = publicUrlData.publicUrl;

  //     const { error: updateError } = await supabase
  //       .from("users")
  //       .update({ profile_image: downloadURL })
  //       .eq("id", user.id);

  //     if (updateError) throw updateError;

  //     setImageUri(downloadURL);
  //   } catch (err) {
  //     console.error("Error uploading profile image:", err);
  //     alert("Failed to upload profile image.");
  //   }
  // };

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
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              width: "100%",
              position: "absolute",
              bottom: 0,
              maxHeight: "50%", //68 when reintroduces profile pic
              paddingHorizontal: 20,
              paddingTop: 24,
              paddingBottom: 32,
              elevation: 12,
            }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
            >
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
                    color: theme.colors.onSurface,
                  }}
                >
                  Your Profile
                </Text>
                <TouchableOpacity onPress={onDismiss}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: theme.colors.primary,
                    }}
                  >
                    Close
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={{
                  height: 1,
                  backgroundColor: theme.colors.outlineVariant,
                  marginBottom: 20,
                }}
              />

              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: theme.colors.onSurface,
                  }}
                >
                  Name
                </Text>
                <View style={{ marginTop: 4 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      color: theme.colors.onSurface,
                    }}
                  >
                    {firstName}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setNewName(firstName);
                      setEditNameVisible(true);
                    }}
                    style={{ marginTop: 4 }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: theme.colors.primary,
                      }}
                    >
                      Edit Name
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 16,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: theme.colors.onSurface,
                      }}
                    >
                      Games Joined
                    </Text>
                    <Text
                      style={{
                        fontSize: 15,
                        color: theme.colors.onSurface,
                        marginTop: 4,
                      }}
                    >
                      {userGames.length}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: theme.colors.onSurface,
                      }}
                    >
                      Squares Won
                    </Text>
                    <Text
                      style={{
                        fontSize: 15,
                        color: theme.colors.onSurface,
                        marginTop: 4,
                      }}
                    >
                      {getWinCount()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Need Firebase storage!  */}
              {/* <View style={{ alignItems: "center", marginVertical: 24 }}>
                <TouchableOpacity
                  onPress={pickImage}
                  style={{ alignItems: "center" }}
                >
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        borderWidth: 2,
                        borderColor: theme.colors.primary,
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        backgroundColor: theme.colors.backdrop,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 2,
                        borderColor: theme.colors.onSurface,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 28,
                          fontWeight: "700",
                        }}
                      >
                        {firstName?.[0]?.toUpperCase() || "?"}
                      </Text>
                    </View>
                  )}
                  <Text
                    style={{
                      color: theme.colors.primary,
                      marginTop: 8,
                      fontWeight: "600",
                      fontSize: 14,
                    }}
                  >
                    Edit Profile Icon
                  </Text>
                </TouchableOpacity>
              </View> */}

              <Button
                icon="logout"
                mode="contained"
                onPress={() => setLogoutVisible(true)}
                buttonColor={theme.colors.primary}
                style={{
                  marginBottom: 12,
                }}
                labelStyle={{
                  fontWeight: "600",
                  color: "#fff",
                }}
              >
                Log Out
              </Button>

              <Button
                icon="delete"
                mode="outlined"
                onPress={() => setConfirmVisible(true)}
                textColor={theme.colors.error}
                style={{
                  backgroundColor: theme.dark ? theme.colors.error : "#ffe5e5",
                  marginBottom: 12,
                  borderColor: theme.colors.error,
                }}
                labelStyle={{
                  fontWeight: "600",
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

      {/* Dialogs */}
      <Portal>
        <Dialog
          visible={confirmVisible}
          onDismiss={() => setConfirmVisible(false)}
          style={{ backgroundColor: theme.colors.surface, borderRadius: 12 }}
        >
          <Dialog.Title
            style={{ fontWeight: "700", color: theme.colors.onSurface }}
          >
            Delete Account
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 15, color: theme.colors.onSurface }}>
              Are you sure you want to permanently delete your account? This
              action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmVisible(false)}>Cancel</Button>
            <Button
              onPress={async () => {
                setConfirmVisible(false);
                await deleteAccount();
                onDismiss();
              }}
              textColor={theme.colors.error}
              labelStyle={{ fontWeight: "700" }}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={logoutVisible}
          onDismiss={() => setLogoutVisible(false)}
          style={{ backgroundColor: theme.colors.surface, borderRadius: 12 }}
        >
          <Dialog.Title
            style={{ fontWeight: "700", color: theme.colors.onSurface }}
          >
            Log Out
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 15, color: theme.colors.onSurface }}>
              Are you sure you want to log out of your account?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutVisible(false)}>Cancel</Button>
            <Button
              onPress={async () => {
                setLogoutVisible(false);
                await supabase.auth.signOut();
                onDismiss();
              }}
              textColor={theme.colors.error}
              labelStyle={{ fontWeight: "700" }}
            >
              Log Out
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      {/* Edit Name Modal - show above everything */}
      <Portal>
        <Dialog
          visible={editNameVisible}
          onDismiss={() => setEditNameVisible(false)}
          style={{ backgroundColor: theme.colors.surface, borderRadius: 12 }}
        >
          <Dialog.Title
            style={{ fontWeight: "700", color: theme.colors.onSurface }}
          >
            Edit Name
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              dense
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter your name"
              style={{ backgroundColor: theme.colors.background }}
              theme={{ colors: { primary: theme.colors.primary } }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditNameVisible(false)}>Cancel</Button>
            <Button
              onPress={async () => {
                if (!newName.trim()) {
                  alert("Name cannot be empty.");
                  return;
                }
                await updateUserName();
                setEditNameVisible(false);
              }}
              labelStyle={{ fontWeight: "700" }}
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
};

export default ProfileModal;
