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
import { Modal, Portal, Button, Dialog } from "react-native-paper";
import { auth, db } from "../../firebaseConfig";
import colors from "../../assets/constants/colorOptions";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";

const ProfileModal = ({ visible, onDismiss, userGames }) => {
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [imageUri, setImageUri] = useState(null);

  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 600,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  useEffect(() => {
    const fetchFirstName = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFirstName(data.firstName || "");
          setImageUri(data.profileImage || null);
        }
      } catch (err) {
        console.error("Failed to fetch first name:", err);
      }
    };

    if (visible) {
      fetchFirstName();
    }
  }, [visible]);

  const deleteUserData = async (uid) => {
    try {
      await deleteDoc(doc(db, "users", uid));
      console.log("User Firestore data deleted");
    } catch (err) {
      console.error("Failed to delete Firestore user data:", err);
    }
  };

  const deleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const uid = user.uid;
      await user.delete();
      await deleteUserData(uid);
    } catch (error) {
      if (error.code === "auth/requires-recent-login") {
        alert("Please re-authenticate to delete your account.");
      } else {
        alert(`Error deleting account: ${error.message}`);
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      await uploadProfileImage(uri);
    }
  };

  const uploadProfileImage = async (uri) => {
    const user = auth.currentUser;
    if (!user) return;

    const response = await fetch(uri);
    const blob = await response.blob();
    const storage = getStorage();
    const storageRef = ref(storage, `profileImages/${user.uid}.jpg`);

    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);

    // Save to Firestore
    await updateDoc(doc(db, "users", user.uid), {
      profileImage: downloadURL,
    });
  };

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
              backgroundColor: "#fff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              width: "100%",
              position: "absolute",
              bottom: 0,
              maxHeight: 500,
              paddingHorizontal: 20,
              paddingTop: 24,
              paddingBottom: 32,
              elevation: 12,
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
                    color: colors.primaryText,
                  }}
                >
                  Your Profile
                </Text>
                <TouchableOpacity onPress={onDismiss}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: colors.primary,
                    }}
                  >
                    Close
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={{ height: 1, backgroundColor: "#eee", marginBottom: 20 }}
              />

              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 15, fontWeight: "600" }}>Name</Text>
                <Text style={{ fontSize: 15, color: "#444", marginTop: 4 }}>
                  {firstName}
                </Text>

                <Text
                  style={{ marginTop: 16, fontSize: 15, fontWeight: "600" }}
                >
                  Games Joined
                </Text>
                <Text style={{ fontSize: 15, color: "#444", marginTop: 4 }}>
                  {userGames.length}
                </Text>
              </View>

              <View style={{ alignItems: "center", marginVertical: 16 }}>
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      marginBottom: 12,
                      borderWidth: 2,
                      borderColor: colors.primary,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      marginBottom: 12,
                      backgroundColor: "#ccc",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{ color: "#fff", fontSize: 28, fontWeight: "700" }}
                    >
                      {firstName?.[0]?.toUpperCase() || "?"}
                    </Text>
                  </View>
                )}

                <Button
                  mode="outlined"
                  onPress={pickImage}
                  style={{
                    borderColor: colors.primary,
                    borderRadius: 20,
                    paddingHorizontal: 12,
                  }}
                  labelStyle={{
                    fontWeight: "600",
                    color: colors.primary,
                    textTransform: "none",
                  }}
                >
                  Upload Profile Icon
                </Button>
              </View>

              <Button
                icon="logout"
                mode="outlined"
                onPress={() => setLogoutVisible(true)}
                textColor="red"
                style={{ marginBottom: 12 }}
                labelStyle={{ fontWeight: "600" }}
              >
                Log Out
              </Button>

              <Button
                icon="delete"
                mode="contained"
                onPress={() => setConfirmVisible(true)}
                style={{ backgroundColor: colors.cancel }}
                labelStyle={{ fontWeight: "600", color: "#fff" }}
              >
                Delete Account
              </Button>
            </ScrollView>
          </Animated.View>
        </Modal>
      </Portal>

      {/* Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={confirmVisible}
          onDismiss={() => setConfirmVisible(false)}
          style={{ backgroundColor: "#fff", borderRadius: 12 }}
        >
          <Dialog.Title style={{ fontWeight: "700", color: "#000" }}>
            Delete Account
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 15, color: "#333" }}>
              Are you sure you want to permanently delete your account? This
              action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setConfirmVisible(false)}
              labelStyle={{ fontWeight: "600" }}
            >
              Cancel
            </Button>
            <Button
              onPress={async () => {
                setConfirmVisible(false);
                await deleteAccount();
                onDismiss();
              }}
              textColor="red"
              labelStyle={{ fontWeight: "700" }}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Portal>
        <Dialog
          visible={logoutVisible}
          onDismiss={() => setLogoutVisible(false)}
          style={{ backgroundColor: "#fff", borderRadius: 12 }}
        >
          <Dialog.Title style={{ fontWeight: "700", color: "#000" }}>
            Log Out
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 15, color: "#333" }}>
              Are you sure you want to log out of your account?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setLogoutVisible(false)}
              labelStyle={{ fontWeight: "600" }}
            >
              Cancel
            </Button>
            <Button
              onPress={() => {
                setLogoutVisible(false);
                auth.signOut();
                onDismiss();
              }}
              textColor="red"
              labelStyle={{ fontWeight: "700" }}
            >
              Log Out
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
};

export default ProfileModal;
