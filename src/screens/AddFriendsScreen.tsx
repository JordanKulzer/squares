import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTheme } from "react-native-paper";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import Toast from "react-native-toast-message";
import {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
} from "../lib/friends";
import { UserSearchResult } from "../types/friends";
import UserAvatar from "../components/UserAvatar";
import SkeletonLoader from "../components/SkeletonLoader";

const AddFriendsScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const gradientColors = theme.dark
    ? (["#121212", "#1d1d1d", "#2b2b2d"] as const)
    : (["#fdfcf9", "#e0e7ff"] as const);

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
          text1: `Friend request sent to ${user.username || user.email?.split("@")[0]}!`,
          position: "bottom",
          bottomOffset: 60,
        });
        setResults((prev) =>
          prev.map((r) =>
            r.id === user.id ? { ...r, friendship_status: "pending" } : r,
          ),
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
          text1: `You are now friends with ${user.username || user.email?.split("@")[0]}!`,
          position: "bottom",
          bottomOffset: 60,
        });
        setResults((prev) =>
          prev.map((r) =>
            r.id === user.id ? { ...r, friendship_status: "accepted" } : r,
          ),
        );
      }
    } finally {
      setSendingTo(null);
    }
  };

  const formatEmail = (email: string | null) => {
    if (!email) return "";
    const [username, domain] = email.split("@");
    if (!domain) return email;

    // Show first 3 chars, mask middle, show last char before @
    if (username.length <= 4) {
      return `${username.slice(0, 2)}**@${domain}`;
    }
    const visibleStart = username.slice(0, 3);
    const visibleEnd = username.slice(-1);
    const maskedLength = Math.min(username.length - 4, 3);
    return `${visibleStart}${"*".repeat(maskedLength)}${visibleEnd}@${domain}`;
  };

  const getStatusButton = (user: UserSearchResult) => {
    const isLoading = sendingTo === user.id;

    switch (user.friendship_status) {
      case "accepted":
        return (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <MaterialIcons
              name="check"
              size={16}
              color="#fff"
              style={styles.statusBadgeIcon}
            />
            <Text style={styles.statusText}>Friends</Text>
          </View>
        );
      case "pending":
        return (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: theme.dark ? "#444" : "#e0e0e0" },
            ]}
          >
            <MaterialIcons
              name="schedule"
              size={16}
              color={theme.colors.onSurface}
              style={styles.statusBadgeIcon}
            />
            <Text
              style={[styles.statusText, { color: theme.colors.onSurface }]}
            >
              Pending
            </Text>
          </View>
        );
      case "incoming_request":
        return (
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => handleAcceptRequest(user)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons
                  name="check"
                  size={16}
                  color="#fff"
                  style={styles.actionButtonIcon}
                />
                <Text style={styles.actionButtonText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        );
      case "blocked":
        return (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: theme.colors.error },
            ]}
          >
            <MaterialIcons name="block" size={16} color="#fff" />
          </View>
        );
      default:
        return (
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => handleSendRequest(user)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons
                  name="person-add"
                  size={16}
                  color="#fff"
                  style={styles.actionButtonIcon}
                />
                <Text style={styles.actionButtonText}>Add</Text>
              </>
            )}
          </TouchableOpacity>
        );
    }
  };

  const renderUser = ({ item }: { item: UserSearchResult }) => (
    <View style={[styles.userCard, { backgroundColor: theme.colors.surface }]}>
      <UserAvatar
        username={item.username}
        email={item.email}
        activeBadge={item.active_badge}
        size={44}
        backgroundColor={theme.colors.secondary}
      />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.userName, { color: theme.colors.onSurface }]}>
          {item.username || "User"}
        </Text>
        <Text
          style={[styles.userEmail, { color: theme.colors.onSurfaceVariant }]}
        >
          {formatEmail(item.email)}
        </Text>
      </View>
      {getStatusButton(item)}
    </View>
  );

  return (
    <LinearGradient colors={gradientColors} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.searchSection}>
          <View
            style={[
              styles.searchContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <MaterialIcons
              name="search"
              size={20}
              color={theme.colors.onSurfaceVariant}
              style={styles.searchIcon}
            />
            <TextInput
              placeholder="Search by username or email..."
              value={searchQuery}
              onChangeText={handleSearch}
              style={[
                styles.searchInput,
                {
                  color: theme.colors.onSurface,
                },
              ]}
              placeholderTextColor={theme.colors.onSurfaceVariant}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
          </View>
        </View>

        {searching ? (
          <SkeletonLoader variant="friendsList" />
        ) : results.length > 0 ? (
          <FlatList
            data={results}
            renderItem={renderUser}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.resultsList}
            showsVerticalScrollIndicator={false}
          />
        ) : searchQuery.length >= 2 ? (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="search-off"
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.emptyText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
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
            <Text
              style={[
                styles.emptyText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Search for friends by username or email
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default AddFriendsScreen;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "SoraBold",
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontFamily: "Rubik_400Regular",
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  resultsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  },
  actionButtonIcon: {
    marginRight: 4,
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
  },
  statusBadgeIcon: {
    marginRight: 4,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Rubik_500Medium",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    textAlign: "center",
  },
});
