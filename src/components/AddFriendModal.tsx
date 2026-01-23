import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Modal, Portal, TextInput, useTheme, Button } from "react-native-paper";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Toast from "react-native-toast-message";
import { searchUsers, sendFriendRequest, acceptFriendRequest } from "../lib/friends";
import { UserSearchResult } from "../types/friends";

interface AddFriendModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const AddFriendModal: React.FC<AddFriendModalProps> = ({ visible, onDismiss }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const searchResults = await searchUsers(query);
      setResults(searchResults);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSendRequest = async (user: UserSearchResult) => {
    setSendingTo(user.id);
    try {
      const result = await sendFriendRequest(user.id);
      if (result.success) {
        Toast.show({
          type: "success",
          text1: `Friend request sent to ${user.first_name || user.email?.split("@")[0]}!`,
          position: "bottom",
          bottomOffset: 60,
        });
        // Update local state to show pending
        setResults(prev =>
          prev.map(r =>
            r.id === user.id ? { ...r, friendship_status: "pending" } : r
          )
        );
      } else {
        Toast.show({
          type: "error",
          text1: result.error || "Failed to send request",
          position: "bottom",
          bottomOffset: 60,
        });
      }
    } finally {
      setSendingTo(null);
    }
  };

  const handleAcceptRequest = async (user: UserSearchResult) => {
    if (!user.friendship_id) return;

    setSendingTo(user.id);
    try {
      const result = await acceptFriendRequest(user.friendship_id);
      if (result.success) {
        Toast.show({
          type: "success",
          text1: `You are now friends with ${user.first_name || user.email?.split("@")[0]}!`,
          position: "bottom",
          bottomOffset: 60,
        });
        // Update local state to show accepted
        setResults(prev =>
          prev.map(r =>
            r.id === user.id ? { ...r, friendship_status: "accepted" } : r
          )
        );
      }
    } finally {
      setSendingTo(null);
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

  const getStatusButton = (user: UserSearchResult) => {
    const isLoading = sendingTo === user.id;

    switch (user.friendship_status) {
      case "accepted":
        return (
          <View style={[styles.statusBadge, { backgroundColor: theme.colors.primary }]}>
            <MaterialIcons name="check" size={16} color="#fff" />
            <Text style={styles.statusText}>Friends</Text>
          </View>
        );
      case "pending":
        return (
          <View style={[styles.statusBadge, { backgroundColor: theme.dark ? "#444" : "#e0e0e0" }]}>
            <MaterialIcons name="schedule" size={16} color={theme.colors.onSurface} />
            <Text style={[styles.statusText, { color: theme.colors.onSurface }]}>Pending</Text>
          </View>
        );
      case "incoming_request":
        return (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => handleAcceptRequest(user)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="check" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        );
      case "blocked":
        return (
          <View style={[styles.statusBadge, { backgroundColor: theme.colors.error }]}>
            <MaterialIcons name="block" size={16} color="#fff" />
          </View>
        );
      default:
        return (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => handleSendRequest(user)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="person-add" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Add</Text>
              </>
            )}
          </TouchableOpacity>
        );
    }
  };

  const renderUser = ({ item }: { item: UserSearchResult }) => (
    <View style={[styles.userCard, { backgroundColor: theme.colors.surface }]}>
      <View
        style={[styles.avatarCircle, { backgroundColor: theme.colors.secondary }]}
      >
        <Text style={styles.avatarText}>
          {getInitials(item.first_name, item.email)}
        </Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.userName, { color: theme.colors.onSurface }]}>
          {item.first_name || "User"}
        </Text>
        <Text style={[styles.userEmail, { color: theme.colors.onSurfaceVariant }]}>
          {item.email}
        </Text>
      </View>
      {getStatusButton(item)}
    </View>
  );

  const handleClose = () => {
    setSearchQuery("");
    setResults([]);
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleClose}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            Add Friends
          </Text>
          <TouchableOpacity onPress={handleClose}>
            <MaterialIcons name="close" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.dark ? "#333" : "#eee" }]} />

        <TextInput
          mode="outlined"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChangeText={handleSearch}
          left={<TextInput.Icon icon="magnify" />}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {searching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : results.length > 0 ? (
          <FlatList
            data={results}
            renderItem={renderUser}
            keyExtractor={(item) => item.id}
            style={styles.resultsList}
            showsVerticalScrollIndicator={false}
          />
        ) : searchQuery.length >= 2 ? (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="search-off"
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              No users found
            </Text>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="search"
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              Search for friends by name or email
            </Text>
          </View>
        )}

        <Button mode="text" onPress={handleClose} style={styles.closeButton}>
          Close
        </Button>
      </Modal>
    </Portal>
  );
};

export default AddFriendModal;

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
    marginBottom: 16,
  },
  searchInput: {
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  resultsList: {
    maxHeight: 300,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "SoraBold",
  },
  userName: {
    fontSize: 15,
    fontFamily: "Rubik_500Medium",
  },
  userEmail: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Rubik_500Medium",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
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
  closeButton: {
    marginTop: 8,
  },
});
