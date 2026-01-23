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
import { Swipeable } from "react-native-gesture-handler";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme, FAB, Badge, Button, Portal, Modal } from "react-native-paper";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import Toast from "react-native-toast-message";
import {
  getFriends,
  getPendingRequests,
  getTop4,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  updateFriendRanking,
} from "../lib/friends";
import { FriendWithProfile, FriendRequest, Top4Slot } from "../types/friends";
import AddFriendModal from "../components/AddFriendModal";

type TabType = "top4" | "all" | "requests";

const FriendsScreen = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>("top4");
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [top4Slots, setTop4Slots] = useState<Top4Slot[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addFriendVisible, setAddFriendVisible] = useState(false);
  const [rankModalVisible, setRankModalVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendWithProfile | null>(null);
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});

  const gradientColors = theme.dark
    ? (["#121212", "#1d1d1d", "#2b2b2d"] as const)
    : (["#fdfcf9", "#e0e7ff"] as const);

  const loadData = useCallback(async () => {
    try {
      const [friendsData, top4Data, requestsData] = await Promise.all([
        getFriends(),
        getTop4(),
        getPendingRequests(),
      ]);
      setFriends(friendsData);
      setTop4Slots(top4Data);
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
    }, [loadData])
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
        text1: `You are now friends with ${request.requester_first_name || "this user"}!`,
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
        text1: `Removed ${friend.friend_first_name || "friend"}`,
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

  const handleSetRanking = async (friend: FriendWithProfile, ranking: number | null) => {
    const result = await updateFriendRanking(friend.id, ranking);
    if (result.success) {
      Toast.show({
        type: "success",
        text1: ranking ? `${friend.friend_first_name} is now #${ranking}!` : "Removed from Top 4",
        position: "bottom",
        bottomOffset: 60,
      });
      loadData();
    } else {
      Toast.show({
        type: "error",
        text1: result.error || "Failed to update ranking",
        position: "bottom",
        bottomOffset: 60,
      });
    }
    setRankModalVisible(false);
    setSelectedFriend(null);
  };

  const openRankModal = (friend: FriendWithProfile) => {
    setSelectedFriend(friend);
    setRankModalVisible(true);
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

  const renderRightActions = (friend: FriendWithProfile) => (
    <TouchableOpacity
      style={[styles.swipeAction, { backgroundColor: "#f44336" }]}
      onPress={() => handleRemoveFriend(friend)}
    >
      <MaterialIcons name="person-remove" size={24} color="#fff" />
      <Text style={styles.swipeActionText}>Remove</Text>
    </TouchableOpacity>
  );

  const renderTop4Tab = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text
        style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
      >
        Your Top 4 Friends
      </Text>
      <Text style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
        Drag friends here to rank them. They can see their position!
      </Text>

      <View style={styles.top4Grid}>
        {top4Slots.map((slot) => (
          <TouchableOpacity
            key={slot.position}
            style={[
              styles.top4Card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: slot.friend
                  ? theme.colors.primary
                  : theme.dark
                  ? "#444"
                  : "#ddd",
              },
            ]}
            onPress={() => {
              if (!slot.friend) {
                // Open add to slot
                setActiveTab("all");
              }
            }}
          >
            <View style={styles.rankBadge}>
              <Text style={styles.rankBadgeText}>#{slot.position}</Text>
            </View>
            {slot.friend ? (
              <>
                <View
                  style={[
                    styles.avatarCircle,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text style={styles.avatarText}>
                    {getInitials(
                      slot.friend.friend_first_name,
                      slot.friend.friend_email
                    )}
                  </Text>
                </View>
                <Text
                  style={[styles.friendName, { color: theme.colors.onSurface }]}
                  numberOfLines={1}
                >
                  {slot.friend.friend_first_name || slot.friend.friend_email?.split("@")[0] || "Friend"}
                </Text>
                <TouchableOpacity
                  style={styles.removeRankBtn}
                  onPress={() => handleSetRanking(slot.friend!, null)}
                >
                  <MaterialIcons
                    name="close"
                    size={16}
                    color={theme.colors.error}
                  />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View
                  style={[
                    styles.avatarCircle,
                    {
                      backgroundColor: theme.dark ? "#333" : "#eee",
                      borderStyle: "dashed",
                      borderWidth: 2,
                      borderColor: theme.dark ? "#555" : "#ccc",
                    },
                  ]}
                >
                  <MaterialIcons
                    name="add"
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                  />
                </View>
                <Text
                  style={[
                    styles.friendName,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Empty Slot
                </Text>
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {friends.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialIcons
            name="group-add"
            size={48}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            style={[styles.emptyStateText, { color: theme.colors.onSurfaceVariant }]}
          >
            Add some friends to build your Top 4!
          </Text>
        </View>
      )}
    </ScrollView>
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
            style={[styles.emptyStateText, { color: theme.colors.onSurfaceVariant }]}
          >
            No friends yet. Tap + to add some!
          </Text>
        </View>
      ) : (
        friends.map((friend) => (
          <Swipeable
            key={friend.id}
            ref={(ref) => {
              swipeableRefs.current[friend.id] = ref;
            }}
            renderRightActions={() => renderRightActions(friend)}
            overshootRight={false}
            friction={2}
          >
            <TouchableOpacity
              style={[
                styles.friendCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderLeftColor: friend.ranking
                    ? theme.colors.primary
                    : "transparent",
                },
              ]}
              onPress={() => openRankModal(friend)}
            >
              <View
                style={[
                  styles.avatarCircle,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Text style={styles.avatarText}>
                  {getInitials(friend.friend_first_name, friend.friend_email)}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={[styles.friendName, { color: theme.colors.onSurface }]}
                >
                  {friend.friend_first_name || friend.friend_email?.split("@")[0] || "Friend"}
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
              {friend.ranking && (
                <View
                  style={[
                    styles.inlineRankBadge,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text style={styles.inlineRankText}>#{friend.ranking}</Text>
                </View>
              )}
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={theme.colors.onSurfaceVariant}
              />
            </TouchableOpacity>
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
            style={[styles.emptyStateText, { color: theme.colors.onSurfaceVariant }]}
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
                {getInitials(request.requester_first_name, request.requester_email)}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={[styles.friendName, { color: theme.colors.onSurface }]}
              >
                {request.requester_first_name || request.requester_email?.split("@")[0] || "Someone"}
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
                style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => handleAcceptRequest(request)}
              >
                <MaterialIcons name="check" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: theme.dark ? "#444" : "#eee", marginLeft: 8 },
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
      case "top4":
        return renderTop4Tab();
      case "all":
        return renderAllFriendsTab();
      case "requests":
        return renderRequestsTab();
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={gradientColors} style={{ flex: 1 }}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.colors.onBackground }}>Loading...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradientColors} style={{ flex: 1 }}>
      <View style={styles.tabBar}>
        {[
          { key: "top4" as TabType, label: "Top 4", icon: "star" },
          { key: "all" as TabType, label: "All Friends", icon: "people" },
          { key: "requests" as TabType, label: "Requests", icon: "mail", badge: pendingRequests.length },
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
            <View style={{ position: "relative" }}>
              <MaterialIcons
                name={tab.icon}
                size={20}
                color={
                  activeTab === tab.key
                    ? theme.colors.primary
                    : theme.colors.onSurfaceVariant
                }
              />
              {tab.badge && tab.badge > 0 && (
                <Badge
                  size={16}
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -10,
                    backgroundColor: theme.colors.error,
                  }}
                >
                  {tab.badge}
                </Badge>
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

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => setAddFriendVisible(true)}
        color="#fff"
      />

      <AddFriendModal
        visible={addFriendVisible}
        onDismiss={() => {
          setAddFriendVisible(false);
          loadData();
        }}
      />

      {/* Rank Selection Modal */}
      <Portal>
        <Modal
          visible={rankModalVisible}
          onDismiss={() => {
            setRankModalVisible(false);
            setSelectedFriend(null);
          }}
          contentContainerStyle={[
            styles.rankModal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
            Set Ranking for {selectedFriend?.friend_first_name || "Friend"}
          </Text>
          <View style={styles.rankOptions}>
            {[1, 2, 3, 4].map((rank) => (
              <TouchableOpacity
                key={rank}
                style={[
                  styles.rankOption,
                  {
                    backgroundColor:
                      selectedFriend?.ranking === rank
                        ? theme.colors.primary
                        : theme.dark
                        ? "#333"
                        : "#f0f0f0",
                  },
                ]}
                onPress={() => selectedFriend && handleSetRanking(selectedFriend, rank)}
              >
                <Text
                  style={[
                    styles.rankOptionText,
                    {
                      color:
                        selectedFriend?.ranking === rank
                          ? "#fff"
                          : theme.colors.onSurface,
                    },
                  ]}
                >
                  #{rank}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {selectedFriend?.ranking && (
            <Button
              mode="text"
              textColor={theme.colors.error}
              onPress={() => selectedFriend && handleSetRanking(selectedFriend, null)}
            >
              Remove from Top 4
            </Button>
          )}
          <Button
            mode="text"
            onPress={() => {
              setRankModalVisible(false);
              setSelectedFriend(null);
            }}
          >
            Cancel
          </Button>
        </Modal>
      </Portal>
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
    gap: 6,
  },
  tabLabel: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "SoraBold",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: "Sora",
    marginBottom: 16,
  },
  top4Grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  top4Card: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 2,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  rankBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#FFD700",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#000",
  },
  removeRankBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 4,
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
    borderLeftWidth: 4,
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
  inlineRankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  inlineRankText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Rubik_600SemiBold",
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
  fab: {
    position: "absolute",
    right: 16,
    bottom: 24,
  },
  rankModal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "SoraBold",
    marginBottom: 16,
    textAlign: "center",
  },
  rankOptions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  rankOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  rankOptionText: {
    fontSize: 18,
    fontFamily: "SoraBold",
  },
});
