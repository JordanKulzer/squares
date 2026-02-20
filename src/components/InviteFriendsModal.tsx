import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Share,
  FlatList,
  StyleSheet,
} from "react-native";
import { Modal, Portal, Button, useTheme, Checkbox } from "react-native-paper";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import Toast from "react-native-toast-message";
import { getToastConfig } from "./ToastConfig";
import * as Clipboard from "expo-clipboard";
import * as Sentry from "@sentry/react-native";
import { getFriends, getTop4 } from "../lib/friends";
import { FriendWithProfile } from "../types/friends";
import { sendGameInviteNotification } from "../utils/notifications";
import { sendGameInvites } from "../lib/gameInvites";
import UserAvatar from "./UserAvatar";
import SkeletonLoader from "./SkeletonLoader";

const InviteFriendsModal = ({
  visible,
  onDismiss,
  gridId,
  sessionTitle,
}: {
  visible: boolean;
  onDismiss: () => void;
  gridId: string;
  sessionTitle?: string;
}) => {
  const theme = useTheme();
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadFriends = useCallback(async () => {
    setLoading(true);
    try {
      const friendsData = await getFriends();
      setFriends(friendsData);
    } catch (err) {
      console.error("Error loading friends:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadFriends();
      setSelectedIds(new Set());

      Sentry.addBreadcrumb({
        category: "modal",
        message: "InviteFriendsModal opened",
        level: "info",
      });

      if (!gridId) {
        Sentry.captureMessage(
          "InviteFriendsModal opened without gridId",
          "warning",
        );
      }
    }
  }, [visible, loadFriends, gridId]);

  const toggleSelection = (friendId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(friendId)) {
        newSet.delete(friendId);
      } else {
        newSet.add(friendId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(friends.map((f) => f.friend_id)));
  };

  const selectTop4 = async () => {
    const top4Slots = await getTop4();
    const top4Ids = top4Slots
      .filter((slot) => slot.friend !== null)
      .map((slot) => slot.friend!.friend_id);
    setSelectedIds(new Set(top4Ids));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleSendInvites = async () => {
    if (selectedIds.size === 0) {
      Toast.show({
        type: "error",
        text1: "Select at least one friend",
        position: "bottom",
        bottomOffset: 60,
      });
      return;
    }

    setSending(true);
    try {
      const selectedFriends = friends.filter((f) =>
        selectedIds.has(f.friend_id),
      );

      // Store invites in database (for in-app display)
      await sendGameInvites(
        gridId,
        sessionTitle || "Game",
        selectedFriends.map((f) => f.friend_id),
      );

      // Send push notifications (existing functionality)
      await sendGameInviteNotification(
        gridId,
        sessionTitle || "Game",
        selectedFriends.map((f) => ({
          id: f.friend_id,
          push_token: f.friend_push_token,
          username: f.friend_username,
        })),
      );

      Toast.show({
        type: "success",
        text1: `Invites sent to ${selectedIds.size} friend${selectedIds.size > 1 ? "s" : ""}!`,
        position: "bottom",
        bottomOffset: 60,
      });
      onDismiss();
    } catch (err) {
      console.error("Error sending invites:", err);
      Toast.show({
        type: "error",
        text1: "Failed to send invites",
        position: "bottom",
        bottomOffset: 60,
      });
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async () => {
    try {
      if (!gridId) {
        throw new Error("Attempted to copy empty gridId");
      }

      await Clipboard.setStringAsync(gridId);
      Toast.show({
        type: "info",
        text1: "Copied to clipboard!",
        position: "bottom",
        visibilityTime: 1500,
        bottomOffset: 60,
      });
    } catch (err) {
      Sentry.captureException(err);
      console.warn("Clipboard error:", err);
      Toast.show({
        type: "error",
        text1: "Copy failed",
      });
    }
  };

  const handleShare = async () => {
    try {
      if (!gridId) {
        throw new Error("Attempted to share without gridId");
      }

      const joinUrl = `https://squares-41599.web.app/session/${gridId}`;
      await Share.share({
        message: `Join my Squares game: ${joinUrl}`,
      });
    } catch (error) {
      Sentry.captureException(error);
      console.warn("Error sharing:", error);
      Toast.show({
        type: "error",
        text1: "Sharing failed",
      });
    }
  };

  const renderFriend = ({ item }: { item: FriendWithProfile }) => {
    const isSelected = selectedIds.has(item.friend_id);

    return (
      <TouchableOpacity
        style={[
          styles.friendCard,
          {
            backgroundColor: isSelected
              ? theme.dark
                ? "rgba(94, 96, 206, 0.2)"
                : "rgba(94, 96, 206, 0.1)"
              : theme.colors.surface,
            borderColor: isSelected ? theme.colors.primary : "transparent",
          },
        ]}
        onPress={() => toggleSelection(item.friend_id)}
      >
        <Checkbox
          status={isSelected ? "checked" : "unchecked"}
          onPress={() => toggleSelection(item.friend_id)}
          color={theme.colors.primary}
        />
        <UserAvatar
          username={item.friend_username}
          email={item.friend_email}
          activeBadge={item.friend_active_badge}
          profileColor={item.friend_profile_color}
          profileIcon={item.friend_profile_icon}
          size={36}
          backgroundColor={theme.colors.primary}
        />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.friendName, { color: theme.colors.onSurface }]}>
            {item.friend_username ||
              item.friend_email?.split("@")[0] ||
              "Friend"}
          </Text>
          {/* ranking removed */}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: "rgba(94, 96, 206, 0.4)",
            borderLeftColor: theme.colors.primary,
            zIndex: 0,
            elevation: 0,
            padding: 0,
            overflow: "hidden",
          },
        ]}
      >
        <LinearGradient
          colors={["#6C63FF", "#4834DF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 20,
            paddingBottom: 16,
          }}
        >
          <MaterialIcons name="people" size={22} color="#fff" style={{ marginRight: 10 }} />
          <Text style={{ flex: 1, fontSize: 20, fontFamily: "SoraBold", color: "#fff" }}>
            Invite Friends
          </Text>
          <TouchableOpacity onPress={onDismiss}>
            <MaterialIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <View style={{ padding: 20, paddingTop: 12 }}>
        {/* Friends List Section */}
        <Text style={[styles.sectionLabel, { color: theme.colors.onSurface }]}>
          Send invites to friends
        </Text>

        {/* Quick Select Buttons */}
        {friends.length > 0 && (
          <View style={styles.quickSelectRow}>
            <TouchableOpacity
              style={[
                styles.quickSelectBtn,
                { backgroundColor: theme.dark ? "#333" : "#f0f0f0" },
              ]}
              onPress={selectAll}
            >
              <MaterialIcons
                name="select-all"
                size={16}
                color={theme.colors.primary}
              />
              <Text
                style={[
                  styles.quickSelectText,
                  { color: theme.colors.onSurface },
                ]}
              >
                Select All
              </Text>
            </TouchableOpacity>
            {selectedIds.size > 0 && (
              <TouchableOpacity
                style={[
                  styles.quickSelectBtn,
                  { backgroundColor: theme.dark ? "#333" : "#f0f0f0" },
                ]}
                onPress={clearSelection}
              >
                <MaterialIcons
                  name="clear"
                  size={16}
                  color={theme.colors.error}
                />
                <Text
                  style={[
                    styles.quickSelectText,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  Clear
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Friends List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <SkeletonLoader variant="friendsList" />
          </View>
        ) : friends.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="people-outline"
              size={40}
              color={theme.colors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.emptyText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              No friends yet
            </Text>
            <Text
              style={[
                styles.emptySubtext,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Add friends to quickly invite them
            </Text>
          </View>
        ) : (
          <FlatList
            data={friends}
            renderItem={renderFriend}
            keyExtractor={(item) => item.id}
            style={styles.friendsList}
            showsVerticalScrollIndicator={true}
          />
        )}

        {/* Send Invites Button */}
        {friends.length > 0 && (
          <View style={styles.sendSection}>
            <Text
              style={[
                styles.selectedCount,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {selectedIds.size} selected
            </Text>
            <Button
              mode="contained"
              onPress={handleSendInvites}
              loading={sending}
              disabled={sending || selectedIds.size === 0}
              icon="send"
              style={{ minWidth: 140 }}
              labelStyle={{ fontFamily: "Sora" }}
            >
              Send Invites
            </Button>
          </View>
        )}

        {/* Divider with "or" */}
        <View style={styles.orDivider}>
          <View
            style={[
              styles.orLine,
              { backgroundColor: theme.dark ? "#333" : "#ddd" },
            ]}
          />
          <Text
            style={[styles.orText, { color: theme.colors.onSurfaceVariant }]}
          >
            or share manually
          </Text>
          <View
            style={[
              styles.orLine,
              { backgroundColor: theme.dark ? "#333" : "#ddd" },
            ]}
          />
        </View>

        {/* Share Options */}
        <View style={styles.shareRow}>
          <TouchableOpacity
            onPress={handleCopy}
            style={[
              styles.shareButton,
              { backgroundColor: theme.dark ? "#333" : "#f4f4f4" },
            ]}
          >
            <MaterialIcons
              name="content-copy"
              size={20}
              color={theme.colors.primary}
            />
            <Text
              style={[styles.shareButtonText, { color: theme.colors.primary }]}
            >
              Copy ID
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShare}
            style={[
              styles.shareButton,
              { backgroundColor: theme.dark ? "#333" : "#f4f4f4" },
            ]}
          >
            <MaterialIcons
              name="share"
              size={20}
              color={theme.colors.primary}
            />
            <Text
              style={[styles.shareButtonText, { color: theme.colors.primary }]}
            >
              Share Link
            </Text>
          </TouchableOpacity>
        </View>
        {/* global Toast will be used and should appear above this modal */}
        </View>
      </Modal>
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          pointerEvents: "box-none",
        }}
      >
        <Toast
          config={getToastConfig(theme.dark)}
          position="bottom"
          bottomOffset={60}
        />
      </View>
    </Portal>
  );
};

export default InviteFriendsModal;

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderLeftWidth: 5,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: "SoraBold",
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
    marginBottom: 12,
  },
  quickSelectRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  quickSelectBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  quickSelectText: {
    fontSize: 13,
    fontFamily: "Rubik_500Medium",
  },
  loadingContainer: {
    paddingVertical: 20,
  },
  friendsList: {
    maxHeight: 300,
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "SoraBold",
  },
  friendName: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
  },
  sendSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  selectedCount: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
  },
  orDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  orLine: {
    flex: 1,
    height: 1,
  },
  orText: {
    paddingHorizontal: 12,
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
  },
  shareRow: {
    flexDirection: "row",
    gap: 12,
  },
  shareButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
  },
});
