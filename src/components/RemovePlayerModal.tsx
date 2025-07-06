import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Modal, Portal, Button, useTheme } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialIcons";
import Toast from "react-native-toast-message";
import { supabase } from "../lib/supabase";

const RemovePlayerModal = ({
  visible,
  onDismiss,
  gridId,
  currentUserId,
  triggerRefresh,
}) => {
  const theme = useTheme();
  const [players, setPlayers] = useState([]);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingKick, setPendingKick] = useState<{
    userId: string;
    username: string;
  } | null>(null);

  useEffect(() => {
    if (!visible) return;
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from("squares")
        .select("players")
        .eq("id", gridId)
        .single();

      if (!error && data?.players) {
        setPlayers(data.players.filter((p) => p.userId !== currentUserId));
      }
    };
    fetchPlayers();
  }, [visible]);

  // const confirmKick = (uidToKick, username) => {
  //   Alert.alert(
  //     "Remove Player",
  //     `Are you sure you want to remove ${
  //       username || "this player"
  //     } from the session?`,
  //     [
  //       { text: "Cancel", style: "cancel" },
  //       {
  //         text: "Remove",
  //         style: "destructive",
  //         onPress: () => handleKick(uidToKick),
  //       },
  //     ]
  //   );
  // };
  const confirmKick = (userId: string, username: string) => {
    setPendingKick({ userId, username });
    setConfirmVisible(true);
  };

  const handleKick = async (uidToKick) => {
    try {
      const { data, error } = await supabase
        .from("squares")
        .select("players, player_ids, selections")
        .eq("id", gridId)
        .single();
      console.log("Kicking player:", uidToKick, "from grid:", gridId);
      console.log("data:", data, "error:", error);

      if (error || !data) return;

      const updatedPlayers = data.players.filter((p) => p.userId !== uidToKick);
      const updatedPlayerIds = (data.player_ids || []).filter(
        (id) => id !== uidToKick
      );
      const updatedSelections = (data.selections || []).filter(
        (sel) => sel.userId !== uidToKick
      );

      const { data: updateResult, error: updateError } = await supabase
        .from("squares")
        .update({
          players: updatedPlayers,
          player_ids: updatedPlayerIds,
          selections: updatedSelections,
        })
        .eq("id", gridId)
        .single();

      console.log("updateResult:", updateResult);
      console.log("updateError:", updateError);

      if (updateError) {
        console.error("Error updating players:", updateError);
        return;
      }

      Toast.show({
        type: "info",
        text1: "Player kicked",
        position: "bottom",
        bottomOffset: 60,
      });
      if (triggerRefresh) triggerRefresh(); // ✅ trigger parent refresh

      const refetch = await supabase
        .from("squares")
        .select("players")
        .eq("id", gridId)
        .single();

      if (!refetch.error && refetch.data?.players) {
        setPlayers(
          refetch.data.players.filter((p) => p.userId !== currentUserId)
        );
      }
    } catch (err) {
      console.error("Error kicking player:", err);
    }
  };
  const dividerColor = theme.dark ? "#333" : "#eee";

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={{
          backgroundColor: theme.colors.surface,
          marginHorizontal: 24,
          padding: 20,
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: "rgba(94, 96, 206, 0.4)",
          borderLeftWidth: 5,
          borderLeftColor: theme.colors.primary,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: theme.colors.onSurface,
            marginBottom: 12,
            fontFamily: "SoraBold",
          }}
        >
          Remove a Player
        </Text>
        <View
          style={{
            height: 1,
            backgroundColor: dividerColor,
            marginBottom: 20,
          }}
        />
        <ScrollView>
          {players.map((p) => (
            <View
              key={p.userId}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 12,
                paddingHorizontal: 8,
                marginBottom: 12,
                borderRadius: 12,
                borderBottomWidth: 1,
                borderBottomColor: dividerColor,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: p.color || "#999",
                    marginRight: 12,
                    borderWidth: 1,
                    borderColor: theme.dark ? "#333" : "#ccc",
                  }}
                />
                <Text style={{ color: theme.colors.onSurface }}>
                  {p.username || "Unnamed"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => confirmKick(p.userId, p.username)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  borderRadius: 8,
                  backgroundColor: theme.dark
                    ? "rgba(255, 0, 0, 0.1)"
                    : "rgba(255, 0, 0, 0.05)",
                }}
              >
                <Icon
                  name="person-remove"
                  size={18}
                  color={theme.colors.error}
                />
                <Text
                  style={{
                    color: theme.colors.error,
                    fontSize: 14,
                    marginLeft: 6,
                    fontFamily: "Sora",
                    fontWeight: "600",
                  }}
                >
                  Remove
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <Button mode="text" onPress={onDismiss}>
          Close
        </Button>
      </Modal>
      <Portal>
        <Modal
          visible={confirmVisible}
          onDismiss={() => setConfirmVisible(false)}
          contentContainerStyle={{
            backgroundColor: theme.colors.surface,
            marginHorizontal: 32,
            padding: 24,
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: "rgba(94, 96, 206, 0.4)",
            borderLeftWidth: 5,
            borderLeftColor: theme.colors.primary,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: theme.colors.onSurface,
              marginBottom: 16,
              fontFamily: "SoraBold",
            }}
          >
            Confirm Removal
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
              color: theme.colors.onSurface,
              marginBottom: 24,
              fontFamily: "Sora",
            }}
          >
            Are you sure you want to remove{" "}
            <Text style={{ fontWeight: "bold" }}>
              {pendingKick?.username || "this player"}
            </Text>{" "}
            from the session?
          </Text>

          <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
            <Button
              onPress={() => setConfirmVisible(false)}
              textColor={theme.colors.onSurface}
              labelStyle={{ fontFamily: "Sora", fontWeight: "600" }}
            >
              Cancel
            </Button>
            <Button
              onPress={() => {
                if (pendingKick) {
                  handleKick(pendingKick.userId);
                }
                setConfirmVisible(false);
              }}
              textColor={theme.colors.error}
              labelStyle={{ fontFamily: "Sora", fontWeight: "600" }}
            >
              Remove
            </Button>
          </View>
        </Modal>
      </Portal>
    </Portal>
  );
};

export default RemovePlayerModal;
