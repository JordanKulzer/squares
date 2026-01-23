import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Modal, Portal, useTheme, Button, Checkbox } from "react-native-paper";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Toast from "react-native-toast-message";
import { getFriends, getTop4 } from "../lib/friends";
import { FriendWithProfile } from "../types/friends";
import { sendGameInviteNotification } from "../utils/notifications";

interface QuickInviteModalProps {
  visible: boolean;
  onDismiss: () => void;
  gridId: string;
  sessionTitle: string;
}

const QuickInviteModal: React.FC<QuickInviteModalProps> = ({
  visible,
  onDismiss,
  gridId,
  sessionTitle,
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
    }
  }, [visible, loadFriends]);

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
      const selectedFriends = friends.filter((f) => selectedIds.has(f.friend_id));

      // Send notifications to selected friends
      await sendGameInviteNotification(
        gridId,
        sessionTitle,
        selectedFriends.map((f) => ({
          id: f.friend_id,
          push_token: f.friend_push_token,
          first_name: f.friend_first_name,
        }))
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

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "?";
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
        <View
          style={[styles.avatarCircle, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={styles.avatarText}>
            {getInitials(item.friend_first_name, item.friend_email)}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.friendName, { color: theme.colors.onSurface }]}>
            {item.friend_first_name || item.friend_email?.split("@")[0] || "Friend"}
          </Text>
          {item.ranking && (
            <View style={styles.rankingTag}>
              <MaterialIcons name="star" size={12} color="#FFD700" />
              <Text style={styles.rankingText}>Top {item.ranking}</Text>
            </View>
          )}
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
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            Invite Friends
          </Text>
          <TouchableOpacity onPress={onDismiss}>
            <MaterialIcons name="close" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.dark ? "#333" : "#eee" }]} />

        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Select friends to invite to "{sessionTitle}"
        </Text>

        {/* Quick Select Buttons */}
        <View style={styles.quickSelectRow}>
          <TouchableOpacity
            style={[styles.quickSelectBtn, { backgroundColor: theme.dark ? "#333" : "#f0f0f0" }]}
            onPress={selectTop4}
          >
            <MaterialIcons name="star" size={16} color="#FFD700" />
            <Text style={[styles.quickSelectText, { color: theme.colors.onSurface }]}>
              Top 4
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickSelectBtn, { backgroundColor: theme.dark ? "#333" : "#f0f0f0" }]}
            onPress={selectAll}
          >
            <MaterialIcons name="select-all" size={16} color={theme.colors.primary} />
            <Text style={[styles.quickSelectText, { color: theme.colors.onSurface }]}>
              Select All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickSelectBtn, { backgroundColor: theme.dark ? "#333" : "#f0f0f0" }]}
            onPress={clearSelection}
          >
            <MaterialIcons name="clear" size={16} color={theme.colors.error} />
            <Text style={[styles.quickSelectText, { color: theme.colors.onSurface }]}>
              Clear
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : friends.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="people-outline"
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              No friends yet. Add some friends first!
            </Text>
          </View>
        ) : (
          <FlatList
            data={friends}
            renderItem={renderFriend}
            keyExtractor={(item) => item.id}
            style={styles.friendsList}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={styles.footer}>
          <Text style={[styles.selectedCount, { color: theme.colors.onSurfaceVariant }]}>
            {selectedIds.size} selected
          </Text>
          <Button
            mode="contained"
            onPress={handleSendInvites}
            loading={sending}
            disabled={sending || selectedIds.size === 0}
            style={{ minWidth: 120 }}
          >
            Send Invites
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

export default QuickInviteModal;

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: "SoraBold",
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    marginBottom: 12,
  },
  quickSelectRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
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
    paddingVertical: 40,
    alignItems: "center",
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "SoraBold",
  },
  friendName: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
  },
  rankingTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  rankingText: {
    fontSize: 11,
    color: "#FFD700",
    fontFamily: "Rubik_500Medium",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  selectedCount: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
  },
});
