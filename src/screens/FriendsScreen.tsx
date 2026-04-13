import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import Swipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
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
import UserAvatar from "../components/UserAvatar";
import AddFriendModal from "../components/AddFriendModal";
import ScalePressable from "../components/ScalePressable";
import SkeletonLoader from "../components/SkeletonLoader";

type TabType = "all" | "requests";

const FriendsScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [showAddFriend, setShowAddFriend] = useState(false);
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

  const renderRightActions = (friend: FriendWithProfile) => (
    <View
      style={{ alignItems: "center", justifyContent: "center", marginBottom: 8 }}
    >
      <TouchableOpacity
        style={[
          styles.swipeAction,
          { backgroundColor: "#d32f2f", width: 80 },
        ]}
        onPress={() => handleRemoveFriend(friend)}
      >
        <MaterialIcons name="person-remove" size={20} color="#fff" />
        <Text style={styles.swipeActionText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLeftActions = (friend: FriendWithProfile) => (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
      }}
    >
      <TouchableOpacity
        style={[
          styles.swipeAction,
          { backgroundColor: theme.colors.primary, width: 84, marginRight: 4 },
        ]}
        onPress={() => {
          swipeableRefs.current[friend.id]?.close();
          navigation.navigate("HomeScreen");
        }}
      >
        <MaterialIcons name="sports-football" size={20} color="#fff" />
        <Text style={styles.swipeActionText}>Invite</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAllFriendsTab = () => {
    if (loading) {
      return <SkeletonLoader variant="friendsListScreen" />;
    }

    if (friends.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <View
            style={[
              styles.emptyStateCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <MaterialIcons
              name="people-outline"
              size={48}
              color={theme.colors.primary}
              style={{ opacity: 0.7 }}
            />
            <Text
              style={[
                styles.emptyStateTitle,
                { color: theme.colors.onSurface },
              ]}
            >
              No friends yet
            </Text>
            <Text
              style={[
                styles.emptyStateText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Add friends to start playing squares together
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddFriend(true)}
              style={[
                styles.emptyStateCTA,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <MaterialIcons name="person-add" size={16} color="#fff" />
              <Text style={styles.emptyStateCTAText}>Add Friends</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingTop: 20,
          paddingBottom: 100,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {friends.map((friend) => (
          <Swipeable
            key={friend.id}
            ref={
              ((ref: SwipeableMethods | null) => {
                if (ref) {
                  swipeableRefs.current[friend.id] = ref;
                } else {
                  delete swipeableRefs.current[friend.id];
                }
              }) as any
            }
            renderRightActions={() => renderRightActions(friend)}
            renderLeftActions={() => renderLeftActions(friend)}
            overshootRight={false}
            overshootLeft={false}
            friction={2}
          >
            <ScalePressable
              style={[
                styles.friendCard,
                { backgroundColor: theme.colors.surface },
              ]}
              onPress={() => {}}
            >
              <UserAvatar
                username={friend.friend_username}
                email={friend.friend_email}
                activeBadge={friend.friend_active_badge}
                profileColor={friend.friend_profile_color}
                profileIcon={friend.friend_profile_icon}
                size={46}
                backgroundColor={theme.colors.primary}
              />
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
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={theme.colors.onSurfaceVariant}
                style={{ opacity: 0.55 }}
              />
            </ScalePressable>
          </Swipeable>
        ))}

        {/* {friends.length <= 2 && (
          <TouchableOpacity
            onPress={() => setShowAddFriend(true)}
            style={[
              styles.listFooterHint,
              { borderColor: theme.dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" },
            ]}
            activeOpacity={0.6}
          >
            <MaterialIcons
              name="person-add-alt"
              size={16}
              color={theme.colors.onSurfaceVariant}
              style={{ opacity: 0.5 }}
            />
            <Text style={[styles.listFooterHintText, { color: theme.colors.onSurfaceVariant }]}>
              Invite friends to join your squares
            </Text>
          </TouchableOpacity>
        )} */}
      </ScrollView>
    );
  };

  const renderRequestsTab = () => {
    if (loading) {
      return <SkeletonLoader variant="friendsListScreen" />;
    }

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingTop: 20,
          paddingBottom: 100,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {!loading && pendingRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="mail-outline"
              size={40}
              color={theme.colors.onSurfaceVariant}
              style={{ opacity: 0.4 }}
            />
            <Text
              style={[
                styles.emptyStateTitle,
                { color: theme.colors.onSurface },
              ]}
            >
              No requests right now
            </Text>
            <Text
              style={[
                styles.emptyStateText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              When someone adds you, their request will show up here
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
              <UserAvatar
                username={request.requester_username}
                email={request.requester_email}
                activeBadge={request.requester_active_badge}
                profileColor={request.requester_profile_color}
                profileIcon={request.requester_profile_icon}
                size={56}
                backgroundColor={theme.colors.secondary}
              />
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
                {/* Decline — secondary, outlined */}
                <ScalePressable
                  style={[
                    styles.actionBtnDecline,
                    {
                      backgroundColor: "transparent",
                      borderWidth: 1.5,
                      borderColor: theme.dark
                        ? "rgba(255,255,255,0.15)"
                        : "rgba(0,0,0,0.12)",
                    },
                  ]}
                  onPress={() => handleRejectRequest(request)}
                >
                  <MaterialIcons
                    name="close"
                    size={18}
                    color={theme.colors.onSurfaceVariant}
                  />
                </ScalePressable>
                {/* Accept — primary, filled */}
                <ScalePressable
                  style={[
                    styles.actionBtnAccept,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={() => handleAcceptRequest(request)}
                >
                  <MaterialIcons name="check" size={20} color="#fff" />
                </ScalePressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "all":
        return renderAllFriendsTab();
      case "requests":
        return renderRequestsTab();
    }
  };

  return (
    <LinearGradient colors={gradientColors} style={{ flex: 1 }}>
      {/* Segmented tab control */}
      <View style={styles.tabBarOuter}>
        <View
          style={[
            styles.tabBarPill,
            {
              backgroundColor: theme.dark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.06)",
            },
          ]}
        >
          {(
            [
              { key: "all" as TabType, label: "All Friends", icon: "people" },
              {
                key: "requests" as TabType,
                label: "Requests",
                icon: "mail",
                badge: pendingRequests.length,
              },
            ] as { key: TabType; label: string; icon: string; badge?: number }[]
          ).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabPillButton,
                  isActive
                    ? [
                        styles.tabPillButtonActive,
                        {
                          backgroundColor: theme.dark
                            ? "rgba(94,96,206,0.18)"
                            : "rgba(94,96,206,0.10)",
                          borderWidth: 1,
                          borderColor: theme.dark
                            ? "rgba(94,96,206,0.45)"
                            : "rgba(94,96,206,0.30)",
                        },
                      ]
                    : { borderWidth: 1, borderColor: "transparent" },
                ]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.75}
              >
                <MaterialIcons
                  name={tab.icon}
                  size={16}
                  color={
                    isActive
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant
                  }
                  style={{ opacity: isActive ? 1 : 0.55 }}
                />
                <Text
                  style={[
                    styles.tabPillLabel,
                    {
                      color: isActive
                        ? theme.colors.primary
                        : theme.colors.onSurfaceVariant,
                      fontFamily: isActive
                        ? "Rubik_600SemiBold"
                        : "Rubik_400Regular",
                      opacity: isActive ? 1 : 0.6,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
                {(tab.badge ?? 0) > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {renderTabContent()}

      <AddFriendModal
        visible={showAddFriend}
        onDismiss={() => setShowAddFriend(false)}
      />
    </LinearGradient>
  );
};

export default FriendsScreen;

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.15)",
  },
  tabBarOuter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  tabBarPill: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
  },
  tabPillButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    minHeight: 40,
  },
  tabPillButtonActive: {},
  tabPillLabel: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
  },
  tabBadge: {
    backgroundColor: "#e53935",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Rubik_600SemiBold",
    lineHeight: 13,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 0,
  },
  tabLabel: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
  },
  friendName: {
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
    letterSpacing: 0.1,
  },
  friendSubtext: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    opacity: 0.38,
    marginTop: 3,
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
  actionBtnDecline: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  actionBtnAccept: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
  emptyStateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyStateCard: {
    alignItems: "center",
    padding: 32,
    borderRadius: 16,
    width: "100%",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    marginTop: 14,
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
    textAlign: "center",
  },
  emptyStateText: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    textAlign: "center",
    opacity: 0.55,
    lineHeight: 19,
  },
  emptyStateCTA: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyStateCTAText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Rubik_600SemiBold",
  },
  listFooterHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  listFooterHintText: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    opacity: 0.55,
  },
});
