import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
  Share,
} from "react-native";
import { Modal, Portal, Button, useTheme } from "react-native-paper";
import * as Clipboard from "expo-clipboard";
import Toast from "react-native-toast-message";
import QRCode from "react-native-qrcode-svg";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import NotificationSettingsModal from "./NotificationsModal";

const SessionOptionsModal = ({
  visible,
  onDismiss,
  gridId,
  isOwner,
  handleLeaveSquare,
  handleDeleteSquare,
  setTempDeadline,
  deadlineValue,
  setShowDeadlineModal,
}) => {
  const theme = useTheme();
  const slideAnim = useRef(new Animated.Value(600)).current;
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [notifySettings, setNotifySettings] = useState(null);
  const [notifModalVisible, setNotifModalVisible] = useState(false);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 600,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  useEffect(() => {
    const loadNotifySettings = async () => {
      try {
        const userId = auth().currentUser?.uid;
        if (!userId || !gridId) return;

        const squareRef = firestore().collection("squares").doc(gridId);
        const snap = await squareRef.get();
        if (snap.exists()) {
          const data = snap.data();
          const player = data.players?.find((p) => p.userId === userId);
          if (player?.notifySettings) {
            setNotifySettings(player.notifySettings);
          }
        }
      } catch (err) {
        console.warn("Failed to load notify settings:", err);
      }
    };

    loadNotifySettings();
  }, [gridId]);

  const surfaceColor = theme.colors.surface;
  const onSurfaceColor = theme.colors.onSurface;
  const dividerColor = theme.dark ? "#333" : "#eee";

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
              elevation: 12,
              shadowColor: theme.colors.backdrop,
              borderTopWidth: 1,
              borderTopColor: dividerColor,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              width: "100%",
              position: "absolute",
              bottom: 0,
              maxHeight: 500,
              paddingHorizontal: 20,
              paddingTop: 24,
              paddingBottom: 32,
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
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
                  }}
                >
                  Session Options
                </Text>
                <TouchableOpacity onPress={onDismiss}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: theme.colors.primary,
                    }}
                  >
                    Cancel
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

              <Button
                icon="share-variant"
                mode="outlined"
                onPress={() => setShowInviteModal(true)}
                style={{ marginBottom: 12 }}
                labelStyle={{ fontWeight: "600", color: onSurfaceColor }}
              >
                Invite Friends
              </Button>
              <Button
                icon="bell-outline"
                mode="outlined"
                onPress={() => setNotifModalVisible(true)}
                style={{ marginBottom: 12 }}
                labelStyle={{ fontWeight: "600", color: onSurfaceColor }}
              >
                Edit Notifications
              </Button>

              {isOwner && (
                <Button
                  icon="calendar"
                  mode="outlined"
                  onPress={() => {
                    onDismiss();
                    setTempDeadline(deadlineValue);
                    setShowDeadlineModal(true);
                  }}
                  style={{
                    marginBottom: 12,
                    borderColor: theme.colors.primary,
                    borderRadius: 20,
                    paddingHorizontal: 12,
                  }}
                  labelStyle={{
                    fontWeight: "600",
                    color: theme.colors.primary,
                    textTransform: "none",
                  }}
                >
                  Change Deadline
                </Button>
              )}

              <Button
                icon="exit-to-app"
                mode="outlined"
                onPress={handleLeaveSquare}
                style={{
                  marginBottom: 12,
                  borderColor: theme.colors.error,
                  borderRadius: 20,
                }}
                labelStyle={{
                  fontWeight: "600",
                  color: theme.colors.error,
                  textTransform: "none",
                }}
              >
                Leave Square
              </Button>

              {isOwner && (
                <Button
                  icon="delete"
                  mode="contained"
                  onPress={handleDeleteSquare}
                  style={{
                    backgroundColor: theme.colors.error,
                    marginBottom: 12,
                    borderRadius: 20,
                  }}
                  labelStyle={{
                    fontWeight: "600",
                    color: theme.colors.onPrimary,
                    textTransform: "none",
                  }}
                >
                  Delete Square
                </Button>
              )}
            </ScrollView>
          </Animated.View>
        </Modal>
      </Portal>

      <Portal>
        <Modal
          visible={showInviteModal}
          onDismiss={() => setShowInviteModal(false)}
          contentContainerStyle={{
            backgroundColor: surfaceColor,
            padding: 24,
            margin: 20,
            borderRadius: 12,
            elevation: 6,
            shadowColor: theme.colors.backdrop,
            borderColor: theme.dark ? "#444" : "#ccc",
            borderWidth: 1,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: onSurfaceColor,
              marginBottom: 16,
            }}
          >
            Invite Friends
          </Text>

          <View
            style={{
              height: 1,
              backgroundColor: dividerColor,
              marginBottom: 20,
            }}
          />

          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <QRCode value={`squaresgame://session/${gridId}`} size={180} />
          </View>

          <TouchableOpacity
            onPress={async () => {
              await Clipboard.setStringAsync(gridId);
              setShowInviteModal(false);
              onDismiss();
              Toast.show({
                type: "success",
                text1: "Session ID copied!",
              });
            }}
            style={{
              marginTop: 20,
              padding: 12,
              borderRadius: 8,
              backgroundColor: theme.colors.primary,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              Copy Session ID
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              await Share.share({
                message: `Join my Squares game! Tap here:\n\nhttps://squares-41599.web.app/session/${gridId}\n\nOr enter this session ID in the app: ${gridId}`,
              });

              setShowInviteModal(false);
              onDismiss();
            }}
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 8,
              backgroundColor: theme.dark ? "#555" : "#ddd",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontWeight: "600",
                color: onSurfaceColor,
              }}
            >
              Share Game Link
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowInviteModal(false)}
            style={{ marginTop: 16, alignItems: "center" }}
          >
            <Text style={{ color: theme.colors.error, fontWeight: "600" }}>
              Close
            </Text>
          </TouchableOpacity>
        </Modal>
      </Portal>
      <NotificationSettingsModal
        visible={notifModalVisible}
        onDismiss={() => setNotifModalVisible(false)}
        settings={notifySettings}
        onSave={async (newSettings) => {
          try {
            const squareRef = firestore().collection("squares").doc(gridId);
            const snap = await squareRef.get();
            const userId = auth().currentUser?.uid;
            if (!snap.exists() || !userId) return;

            const data = snap.data();
            const updatedPlayers = data.players.map((p) =>
              p.userId === userId ? { ...p, notifySettings: newSettings } : p
            );

            await squareRef.update({ players: updatedPlayers });
            setNotifySettings(newSettings);
          } catch (err) {
            console.error("Failed to save notify settings:", err);
          }
        }}
      />
    </>
  );
};

export default SessionOptionsModal;
