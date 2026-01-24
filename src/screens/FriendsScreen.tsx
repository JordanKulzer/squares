import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  RefreshControl,
} from "react-native";
import Swipeable, { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "react-native-paper";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import Toast from "react-native-toast-message";
import {
  getFriends,
  getPendingRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from "../lib/friends";
import { FriendWithProfile, FriendRequest } from "../types/friends";
import SkeletonLoader from "../components/SkeletonLoader";

type TabType = "all" | "requests";

const FriendsScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const swipeableRefs = useRef<Record<string, SwipeableMethods | null>>({});

  const gradientColors = theme.dark
    ? (["#121212", "#1d1d1d", "#2b2b2d"] as const)
    : (["#fdfcf9", "#e0e7ff"] as const);

  const loadData = useCallback(async () => {
    try {
      const [friendsData, requestsData] = await Promise.all([
        getFriends(),
        getPendingRequests(),
      ]);
      setFriends(friendsData);
      setPendingRequests(requestsData);
    } catch (err) {
      console.error("Error loading friends data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const closeAllSwipeables = () => {
    Object.values(swipeableRefs.current).forEach((ref) => ref?.close());
  };

  const handleAcceptRequest = async (request: FriendRequest) => {
    const result = await acceptFriendRequest(request.id);
    if (result.success) {
      Toast.show({
        type: "success",
        text1: `You are now friends with ${request.requester_username || "this user"}!`,
        position: "bottom",
        bottomOffset: 60,
      });
      loadData();
    } else {
      Toast.show({
        type: "error",
        text1: result.error || "Failed to accept request",
        position: "bottom",
        bottomOffset: 60,
      });
    }
  };

  const handleRejectRequest = async (request: FriendRequest) => {
    const result = await rejectFriendRequest(request.id);
    if (result.success) {
      Toast.show({
        type: "info",
        text1: "Request declined",
        position: "bottom",
        bottomOffset: 60,
      });
      loadData();
    }
  };

  const handleRemoveFriend = async (friend: FriendWithProfile) => {
    closeAllSwipeables();
    const result = await removeFriend(friend.id);
    if (result.success) {
      Toast.show({
        type: "info",
        text1: `Removed ${friend.friend_username || "friend"}`,
        position: "bottom",
        bottomOffset: 60,
      });
      loadData();
    } else {
      Toast.show({
        type: "error",
        text1: result.error || "Failed to remove friend",
        position: "bottom",
        bottomOffset: 60,
      });
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "?";
  };

  const renderRightActions = (friend: FriendWithProfile) => (
    <TouchableOpacity
      style={[styles.swipeAction, { backgroundColor: "#f44336" }]}
      onPress={() => handleRemoveFriend(friend)}
    >
      <MaterialIcons name="person-remove" size={24} color="#fff" />
      <Text style={styles.swipeActionText}>Remove</Text>
    </TouchableOpacity>
  );

  const renderAllFriendsTab = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {friends.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons
            name="people-outline"
            size={48}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            style={[
              styles.emptyStateText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            No friends yet. Add some to get started!
          </Text>
        </View>
      ) : (
        friends.map((friend) => (
          <Swipeable
            key={friend.id}
            ref={((ref: SwipeableMethods | null) => {
              if (ref) {
                swipeableRefs.current[friend.id] = ref;
              } else {
                delete swipeableRefs.current[friend.id];
              }
            }) as any}
            renderRightActions={() => renderRightActions(friend)}
            overshootRight={false}
            friction={2}
          >
            <View
              style={[
                styles.friendCard,
                {
                  backgroundColor: theme.colors.surface,
                },
              ]}
            >
              <View
                style={[
                  styles.avatarCircle,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Text style={styles.avatarText}>
                  {getInitials(friend.friend_username, friend.friend_email)}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={[styles.friendName, { color: theme.colors.onSurface }]}
                >
                  {friend.friend_username ||
                    friend.friend_email?.split("@")[0] ||
                    "Friend"}
                </Text>
                <Text
                  style={[
                    styles.friendSubtext,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {friend.accepted_at
                    ? `Friends since ${new Date(friend.accepted_at).toLocaleDateString()}`
                    : "Friend"}
                </Text>
              </View>
            </View>
          </Swipeable>
        ))
      )}
    </ScrollView>
  );

  const renderRequestsTab = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {pendingRequests.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons
            name="mail-outline"
            size={48}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            style={[
              styles.emptyStateText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            No pending friend requests
          </Text>
        </View>
      ) : (
        pendingRequests.map((request) => (
          <View
            key={request.id}
            style={[
              styles.requestCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: theme.colors.secondary },
              ]}
            >
              <Text style={styles.avatarText}>
                {getInitials(
                  request.requester_username,
                  request.requester_email,
                )}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={[styles.friendName, { color: theme.colors.onSurface }]}
              >
                {request.requester_username ||
                  request.requester_email?.split("@")[0] ||
                  "Someone"}
              </Text>
              <Text
                style={[
                  styles.friendSubtext,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Wants to be your friend
              </Text>
            </View>
            <View style={styles.requestActions}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => handleAcceptRequest(request)}
              >
                <MaterialIcons name="check" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: theme.dark ? "#444" : "#eee",
                    marginLeft: 8,
                  },
                ]}
                onPress={() => handleRejectRequest(request)}
              >
                <MaterialIcons
                  name="close"
                  size={20}
                  color={theme.colors.onSurface}
                />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "all":
        return renderAllFriendsTab();
      case "requests":
        return renderRequestsTab();
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={gradientColors} style={{ flex: 1 }}>
        <SkeletonLoader variant="friendsList" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradientColors} style={{ flex: 1 }}>
      <View style={styles.tabBar}>
        {[
          { key: "all" as TabType, label: "All Friends", icon: "people" },
          {
            key: "requests" as TabType,
            label: "Requests",
            icon: "mail",
            badge: pendingRequests.length,
          },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && {
                borderBottomColor: theme.colors.primary,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <View style={{ position: "relative", marginRight: 6 }}>
              <MaterialIcons
                name={tab.icon}
                size={20}
                color={
                  activeTab === tab.key
                    ? theme.colors.primary
                    : theme.colors.onSurfaceVariant
                }
              />
              {(tab.badge ?? 0) > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -10,
                    backgroundColor: theme.colors.error,
                    borderRadius: 8,
                    minWidth: 16,
                    height: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 10,
                      fontFamily: "Rubik_600SemiBold",
                    }}
                  >
                    {tab.badge}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                {
                  color:
                    activeTab === tab.key
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant,
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {renderTabContent()}
    </LinearGradient>
  );
};

export default FriendsScreen;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabBar: {
    flexDirection: "row",
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabLabel: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "SoraBold",
  },
  friendName: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
    textAlign: "center",
  },
  friendSubtext: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  requestActions: {
    flexDirection: "row",
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  swipeAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
    borderRadius: 12,
    marginLeft: 8,
  },
  swipeActionText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Rubik_500Medium",
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 15,
    fontFamily: "Rubik_400Regular",
    textAlign: "center",
  },
});
