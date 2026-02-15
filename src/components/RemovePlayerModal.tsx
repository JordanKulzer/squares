import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  Animated,
} from "react-native";
import { Portal, Button, useTheme, Checkbox } from "react-native-paper";
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
  const translateY = useRef(new Animated.Value(600)).current;
  const [players, setPlayers] = useState([]);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingKick, setPendingKick] = useState<{
    userId: string;
    username: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmMultipleVisible, setConfirmMultipleVisible] = useState(false);

  // Animate in/out
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

  const confirmKick = (userId: string, username: string) => {
    setPendingKick({ userId, username });
    setConfirmVisible(true);
  };

  const toggleSelection = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(players.map((p) => p.userId)));
  const clearSelection = () => setSelectedIds(new Set());

  const handleKickMultiple = async (idsToKick: string[]) => {
    try {
      const { data, error } = await supabase
        .from("squares")
        .select("players, player_ids, selections")
        .eq("id", gridId)
        .single();

      if (error || !data) return;

      const idSet = new Set(idsToKick);
      const updatedPlayers = (data.players || []).filter(
        (p) => !idSet.has(p.userId),
      );
      const updatedPlayerIds = (data.player_ids || []).filter(
        (id) => !idSet.has(id),
      );
      const updatedSelections = (data.selections || []).filter(
        (sel) => !idSet.has(sel.userId),
      );

      const { error: updateError } = await supabase
        .from("squares")
        .update({
          players: updatedPlayers,
          player_ids: updatedPlayerIds,
          selections: updatedSelections,
        })
        .eq("id", gridId)
        .single();

      if (updateError) {
        console.error("Error updating players:", updateError);
        return;
      }

      Toast.show({
        type: "info",
        text1: "Players removed",
        position: "bottom",
        bottomOffset: 60,
      });
      if (triggerRefresh) triggerRefresh();
      clearSelection();

      const refetch = await supabase
        .from("squares")
        .select("players")
        .eq("id", gridId)
        .single();
      if (!refetch.error && refetch.data?.players) {
        setPlayers(
          refetch.data.players.filter((p) => p.userId !== currentUserId),
        );
      }
    } catch (err) {
      console.error("Error kicking players:", err);
    }
  };

  const handleKick = async (uidToKick) => {
    try {
      const { data, error } = await supabase
        .from("squares")
        .select("players, player_ids, selections")
        .eq("id", gridId)
        .single();

      if (error || !data) return;

      const updatedPlayers = data.players.filter((p) => p.userId !== uidToKick);
      const updatedPlayerIds = (data.player_ids || []).filter(
        (id) => id !== uidToKick,
      );
      const updatedSelections = (data.selections || []).filter(
        (sel) => sel.userId !== uidToKick,
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
      if (triggerRefresh) triggerRefresh();

      const refetch = await supabase
        .from("squares")
        .select("players")
        .eq("id", gridId)
        .single();

      if (!refetch.error && refetch.data?.players) {
        setPlayers(
          refetch.data.players.filter((p) => p.userId !== currentUserId),
        );
      }
    } catch (err) {
      console.error("Error kicking player:", err);
    }
  };

  const confirmRemoveSelected = async () => {
    setConfirmMultipleVisible(false);
    if (selectedIds.size === 0) return;
    await handleKickMultiple(Array.from(selectedIds));
    onDismiss && onDismiss();
  };

  const surfaceColor = theme.colors.surface;
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
            maxHeight: "75%",
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
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                fontFamily: "SoraBold",
                color: theme.colors.onSurface,
              }}
            >
              Remove Players
            </Text>
            <TouchableOpacity onPress={onDismiss}>
              <Text style={{ color: theme.colors.error, fontFamily: "Sora" }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              height: 1,
              marginBottom: 16,
              backgroundColor: dividerColor,
            }}
          />

          {players.length > 0 && (
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                  gap: 4,
                  backgroundColor: theme.dark ? "#333" : "#f0f0f0",
                }}
                onPress={selectAll}
              >
                <Icon name="select-all" size={16} color={theme.colors.primary} />
                <Text style={{ marginLeft: 6, color: theme.colors.onSurface }}>
                  Select All
                </Text>
              </TouchableOpacity>
              {selectedIds.size > 0 && (
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                    gap: 4,
                    backgroundColor: theme.dark ? "#333" : "#f0f0f0",
                  }}
                  onPress={clearSelection}
                >
                  <Icon name="clear" size={16} color={theme.colors.error} />
                  <Text style={{ marginLeft: 6, color: theme.colors.onSurface }}>
                    Clear
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {players.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <Icon
                name="people-outline"
                size={36}
                color={theme.colors.onSurfaceVariant}
              />
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 8,
                  fontFamily: "Sora",
                }}
              >
                No players to remove
              </Text>
            </View>
          ) : (
            <FlatList
              data={players}
              keyExtractor={(item) => item.userId}
              style={{ maxHeight: 300 }}
              showsVerticalScrollIndicator={true}
              renderItem={({ item: p }) => {
                const isSelected = selectedIds.has(p.userId);
                return (
                  <TouchableOpacity
                    onPress={() => toggleSelection(p.userId)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 8,
                      borderRadius: 12,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: isSelected
                        ? theme.colors.primary
                        : "transparent",
                      backgroundColor: isSelected
                        ? theme.dark
                          ? "rgba(94,96,206,0.2)"
                          : "rgba(94,96,206,0.1)"
                        : theme.colors.surface,
                    }}
                  >
                    <Checkbox
                      status={isSelected ? "checked" : "unchecked"}
                      onPress={() => toggleSelection(p.userId)}
                      color={theme.colors.primary}
                    />
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: theme.colors.primary,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 13,
                          fontFamily: "SoraBold",
                        }}
                      >
                        {(p.username || "")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text
                        style={{
                          color: theme.colors.onSurface,
                          fontFamily: "Rubik_500Medium",
                        }}
                      >
                        {p.username || p.userId || "Player"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {players.length > 0 && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 12,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: "rgba(0,0,0,0.05)",
              }}
            >
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                {selectedIds.size} selected
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button
                  mode="contained"
                  onPress={() => setConfirmMultipleVisible(true)}
                  disabled={selectedIds.size === 0}
                  labelStyle={{ fontFamily: "Sora", fontWeight: "600" }}
                  style={{ minWidth: 140, backgroundColor: theme.colors.error }}
                >
                  Remove Selected
                </Button>
              </View>
            </View>
          )}
        </Animated.View>
      </Portal>

      {/* Confirmation modals - kept as small centered dialogs */}
      <Portal>
        {confirmVisible && (
          <TouchableWithoutFeedback onPress={() => setConfirmVisible(false)}>
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.4)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <TouchableWithoutFeedback>
                <View
                  style={{
                    backgroundColor: theme.colors.surface,
                    marginHorizontal: 32,
                    padding: 24,
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: "rgba(94, 96, 206, 0.4)",
                    borderLeftWidth: 5,
                    borderLeftColor: theme.colors.primary,
                    width: "85%",
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
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        )}

        {confirmMultipleVisible && (
          <TouchableWithoutFeedback onPress={() => setConfirmMultipleVisible(false)}>
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.4)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <TouchableWithoutFeedback>
                <View
                  style={{
                    backgroundColor: theme.colors.surface,
                    marginHorizontal: 32,
                    padding: 24,
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: "rgba(94, 96, 206, 0.4)",
                    borderLeftWidth: 5,
                    borderLeftColor: theme.colors.primary,
                    width: "85%",
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
                      {selectedIds.size} player{selectedIds.size !== 1 ? "s" : ""}
                    </Text>{" "}
                    from the session?
                  </Text>

                  <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                    <Button
                      onPress={() => setConfirmMultipleVisible(false)}
                      textColor={theme.colors.onSurface}
                      labelStyle={{ fontFamily: "Sora", fontWeight: "600" }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onPress={async () => {
                        await confirmRemoveSelected();
                      }}
                      textColor={theme.colors.error}
                      labelStyle={{ fontFamily: "Sora", fontWeight: "600" }}
                    >
                      Remove
                    </Button>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        )}
      </Portal>
    </>
  );
};

export default RemovePlayerModal;
