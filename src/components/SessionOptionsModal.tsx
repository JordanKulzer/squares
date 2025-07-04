import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
  Share,
  useColorScheme,
} from "react-native";
import { Portal, Button, useTheme, Modal } from "react-native-paper";
import * as Clipboard from "expo-clipboard";
import Toast from "react-native-toast-message";
import { getToastConfig } from "../components/ToastConfig";
import QRCode from "react-native-qrcode-svg";
import { supabase } from "../lib/supabase";
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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [notifySettings, setNotifySettings] = useState(null);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const translateY = useRef(new Animated.Value(600)).current;
  const isDarkMode = useColorScheme() === "dark";

  <Toast config={getToastConfig(isDarkMode)} />;

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 600,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    const loadNotifySettings = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const userId = user?.id;

        if (!userId || !gridId) return;

        const { data, error } = await supabase
          .from("squares")
          .select("players")
          .eq("id", gridId)
          .single();

        if (error || !data) return;

        const player = data.players?.find((p) => p.userId === userId);
        if (player?.notifySettings) {
          setNotifySettings(player.notifySettings);
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
        {visible && (
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
        )}

        <Animated.View
          pointerEvents={visible ? "auto" : "none"}
          style={{
            transform: [{ translateY }],
            backgroundColor: surfaceColor,
            position: "absolute",
            bottom: -35,
            left: 0,
            right: 0,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 75,
            maxHeight: 500,
            borderWidth: 1.5,
            borderLeftWidth: 5,
            borderBottomWidth: 0,
            borderColor: "rgba(94, 96, 206, 0.4)",
            borderLeftColor: theme.colors.primary,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 10,
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
                Session Options
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

            <Button
              icon="share-variant"
              mode="outlined"
              onPress={() => {
                onDismiss();
                setTimeout(() => {
                  setShowInviteModal(true);
                }, 300);
              }}
              style={{ marginBottom: 12 }}
              labelStyle={{
                fontWeight: "600",
                color: onSurfaceColor,
                fontFamily: "Sora",
              }}
            >
              Invite Friends
            </Button>
            <Button
              icon="bell-outline"
              mode="outlined"
              onPress={() => setNotifModalVisible(true)}
              style={{ marginBottom: 12 }}
              labelStyle={{
                fontWeight: "600",
                color: onSurfaceColor,
                fontFamily: "Sora",
              }}
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
                  fontFamily: "Sora",
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
                fontFamily: "Sora",
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
                  fontFamily: "Sora",
                }}
              >
                Delete Square
              </Button>
            )}
          </ScrollView>
        </Animated.View>
      </Portal>

      <NotificationSettingsModal
        visible={notifModalVisible}
        onDismiss={() => setNotifModalVisible(false)}
        settings={notifySettings}
        onSave={async (newSettings) => {
          try {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            const userId = user?.id;

            if (!userId) return;

            const { data, error } = await supabase
              .from("squares")
              .select("players")
              .eq("id", gridId)
              .single();

            if (error || !data) return;

            const updatedPlayers = data.players.map((p) =>
              p.userId === userId ? { ...p, notifySettings: newSettings } : p
            );

            await supabase
              .from("squares")
              .update({ players: updatedPlayers })
              .eq("id", gridId);

            setNotifySettings(newSettings);
          } catch (err) {
            console.error("Failed to save notify settings:", err);
          }
        }}
      />
      <Portal>
        <Modal
          visible={showInviteModal}
          onDismiss={() => setShowInviteModal(false)}
          contentContainerStyle={{
            backgroundColor: theme.colors.surface,
            marginHorizontal: 24,
            padding: 20,
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: "rgba(94, 96, 206, 0.4)",
            borderLeftWidth: 5,
            borderLeftColor: theme.colors.primary,
            elevation: 5,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 12,
              color: theme.colors.onSurface,
              fontFamily: "SoraBold",
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
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <QRCode value={gridId} size={150} />
          </View>
          <Text
            style={{
              marginBottom: 8,
              color: theme.colors.onSurface,
              fontFamily: "Sora",
            }}
          >
            Copy and share this session ID:
          </Text>
          <TouchableOpacity
            onPress={async () => {
              await Clipboard.setStringAsync(gridId);
              Toast.show({
                type: "info",
                text1: "Copied to clipboard!",
                position: "bottom",
                visibilityTime: 1500,
                bottomOffset: 60,
              });
            }}
            style={{
              padding: 10,
              backgroundColor: theme.dark ? "#333" : "#f4f4f4",
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                textAlign: "center",
                fontWeight: "600",
                color: theme.colors.primary,
                fontFamily: "Sora",
              }}
            >
              {gridId}
            </Text>
          </TouchableOpacity>

          <Text
            style={{
              marginBottom: 8,
              color: theme.colors.onSurface,
              fontFamily: "Sora",
            }}
          >
            Or share via:
          </Text>
          <Button
            icon="share-variant"
            mode="contained"
            onPress={async () => {
              try {
                await Share.share({
                  message: `Join my Squares game using this code: ${gridId}`,
                });
              } catch (error) {
                console.warn("Error sharing:", error);
              }
            }}
            style={{ marginBottom: 16 }}
            labelStyle={{ fontFamily: "Sora" }}
          >
            Share
          </Button>

          <Button
            mode="text"
            textColor={theme.colors.error}
            onPress={() => setShowInviteModal(false)}
            labelStyle={{ fontFamily: "Sora" }}
          >
            Close
          </Button>
        </Modal>
      </Portal>
    </>
  );
};

export default SessionOptionsModal;
