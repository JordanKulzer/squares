import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Animated,
  TouchableWithoutFeedback,
  TextInput as RNTextInput,
} from "react-native";
import { Portal, useTheme } from "react-native-paper";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import Toast from "react-native-toast-message";
import { searchUsers, sendFriendRequest, acceptFriendRequest } from "../lib/friends";
import { UserSearchResult } from "../types/friends";
import UserAvatar from "./UserAvatar";
import SkeletonLoader from "./SkeletonLoader";

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
  const translateY = useRef(new Animated.Value(600)).current;

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
          text1: `You are now friends with ${user.username || user.email?.split("@")[0]}!`,
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

  const getStatusButton = (user: UserSearchResult) => {
    const isLoading = sendingTo === user.id;

    switch (user.friendship_status) {
      case "accepted":
        return (
          <View style={[styles.statusBadge, { backgroundColor: theme.colors.primary }]}>
            <MaterialIcons name="check" size={16} color="#fff" style={styles.statusBadgeIcon} />
            <Text style={styles.statusText}>Friends</Text>
          </View>
        );
      case "pending":
        return (
          <View style={[styles.statusBadge, { backgroundColor: theme.dark ? "#444" : "#e0e0e0" }]}>
            <MaterialIcons name="schedule" size={16} color={theme.colors.onSurface} style={styles.statusBadgeIcon} />
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
                <MaterialIcons name="check" size={16} color="#fff" style={styles.actionButtonIcon} />
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
                <MaterialIcons name="person-add" size={16} color="#fff" style={styles.actionButtonIcon} />
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
        profileColor={item.profile_color}
        profileIcon={item.profile_icon}
        size={44}
        backgroundColor={theme.colors.secondary}
      />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.userName, { color: theme.colors.onSurface }]}>
          {item.username || "User"}
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

  const surfaceColor = theme.colors.surface;

  return (
    <Portal>
      {visible && (
        <TouchableWithoutFeedback onPress={handleClose}>
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
          maxHeight: "80%",
          overflow: "hidden",
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
        <LinearGradient
          colors={["#6C63FF", "#4834DF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 16,
          }}
        >
          <MaterialIcons name="person-add" size={22} color="#fff" style={{ marginRight: 10 }} />
          <Text style={{ flex: 1, fontSize: 20, fontFamily: "SoraBold", color: "#fff" }}>
            Add Friends
          </Text>
          <TouchableOpacity onPress={handleClose}>
            <MaterialIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20, paddingBottom: 75 }}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color={theme.colors.onSurfaceVariant} style={styles.searchIcon} />
          <RNTextInput
            placeholder="Search by username or email..."
            value={searchQuery}
            onChangeText={handleSearch}
            style={[
              styles.searchInput,
              {
                color: theme.colors.onSurface,
                borderColor: theme.dark ? "#444" : "#ddd",
              },
            ]}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {searching ? (
          <SkeletonLoader variant="friendsList" />
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
              Search for friends by username or email
            </Text>
          </View>
        )}
        </View>
      </Animated.View>
    </Portal>
  );
};

export default AddFriendModal;

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontFamily: "Rubik_400Regular",
    fontSize: 15,
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
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    textAlign: "center",
  },
});
