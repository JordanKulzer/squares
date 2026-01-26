import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
} from "react-native";
import { Portal, Button, useTheme } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import NotificationSettingsModal from "./NotificationsModal";
import RemovePlayerModal from "./RemovePlayerModal";
import { RootStackParamList } from "../utils/types";

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
  triggerRefresh,
  team1,
  team2,
  quarterScores,
  currentTitle,
}: {
  visible: boolean;
  onDismiss: () => void;
  gridId: string;
  isOwner: boolean;
  handleLeaveSquare: () => void;
  handleDeleteSquare: () => void;
  setTempDeadline: (d: Date | null) => void;
  deadlineValue: Date | null;
  setShowDeadlineModal: (v: boolean) => void;
  triggerRefresh: () => void;
  team1: string; // <--
  team2: string; // <--
  quarterScores: {
    quarter: string;
    home: number | null;
    away: number | null;
  }[]; // <--
  currentTitle: string;
}) => {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [notifySettings, setNotifySettings] = useState(null);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const translateY = useRef(new Animated.Value(600)).current;
  const [showKickModal, setShowKickModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data?.user?.id ?? null);
    };
    fetchUser();
  }, []);

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
                navigation.navigate("InviteFriendsScreen", {
                  gridId,
                  sessionTitle: currentTitle,
                });
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
              <>
                <Button
                  icon="pencil"
                  mode="outlined"
                  onPress={() => {
                    onDismiss();
                    navigation.navigate("EditSquareScreen", { gridId });
                  }}
                  style={{ marginBottom: 12 }}
                  labelStyle={{
                    fontWeight: "600",
                    color: onSurfaceColor,
                    fontFamily: "Sora",
                  }}
                >
                  Edit Game Settings
                </Button>

                <Button
                  icon="account-remove"
                  mode="outlined"
                  onPress={() => {
                    onDismiss();
                    setTimeout(() => setShowKickModal(true), 300);
                  }}
                  style={{ marginBottom: 12, borderColor: theme.colors.error }}
                  labelStyle={{
                    fontWeight: "600",
                    color: theme.colors.error,
                    fontFamily: "Sora",
                  }}
                >
                  Remove Player
                </Button>
              </>
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

      <RemovePlayerModal
        visible={showKickModal}
        onDismiss={() => setShowKickModal(false)}
        gridId={gridId}
        currentUserId={currentUserId}
        triggerRefresh={triggerRefresh}
      />

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
    </>
  );
};

export default SessionOptionsModal;
