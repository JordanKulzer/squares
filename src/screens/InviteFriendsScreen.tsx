import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Share,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useTheme, Checkbox, Button } from "react-native-paper";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import Toast from "react-native-toast-message";
import * as Clipboard from "expo-clipboard";
import * as Sentry from "@sentry/react-native";
import { supabase } from "../lib/supabase";
import { getFriends, searchUsers, sendFriendRequest } from "../lib/friends";
import { FriendWithProfile } from "../types/friends";
import { UserSearchResult } from "../types/friends";
import { sendGameInviteNotification } from "../utils/notifications";
import {
  sendGameInvites,
  getSentInvitesForGame,
  cancelGameInvite,
} from "../lib/gameInvites";
import { RootStackParamList } from "../utils/types";
import SkeletonLoader from "../components/SkeletonLoader";

type InviteFriendsScreenParams = {
  gridId: string;
  sessionTitle: string;
};

const InviteFriendsScreen = () => {
  const theme = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<{ params: InviteFriendsScreenParams }, "params">>();
  const { gridId, sessionTitle } = route.params;

  const [activeTab, setActiveTab] = useState<"friends" | "search">("friends");
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [sendingFriendRequest, setSendingFriendRequest] = useState<string | null>(null);

  // Track already-sent invites: Map<recipientId, inviteId>
  const [sentInvites, setSentInvites] = useState<Map<string, string>>(new Map());
  const [cancelingInvite, setCancelingInvite] = useState<string | null>(null);

  const gradientColors = theme.dark
    ? (["#121212", "#1d1d1d", "#2b2b2d"] as const)
    : (["#fdfcf9", "#e0e7ff"] as const);

  // Fetch player_ids for this game to filter out existing players
  const fetchPlayerIds = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("squares")
        .select("player_ids")
        .eq("id", gridId)
        .single();

      if (!error && data?.player_ids) {
        setPlayerIds(data.player_ids);
      }
    } catch (err) {
      console.error("Error fetching player_ids:", err);
    }
  }, [gridId]);

  const loadFriends = useCallback(async () => {
    setLoading(true);
    try {
      await fetchPlayerIds();
      const [friendsData, existingInvites] = await Promise.all([
        getFriends(),
        getSentInvitesForGame(gridId),
      ]);
      setFriends(friendsData);
      // Build map of recipientId -> inviteId
      const inviteMap = new Map<string, string>();
      existingInvites.forEach((inv) => {
        inviteMap.set(inv.recipientId, inv.inviteId);
      });
      setSentInvites(inviteMap);
    } catch (err) {
      console.error("Error loading friends:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchPlayerIds, gridId]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  // Filter out friends who are already in the game
  const availableFriends = friends.filter(
    (f) => !playerIds.includes(f.friend_id),
  );

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
    // Only select friends who don't already have a pending invite
    const uninvitedFriends = availableFriends.filter(
      (f) => !sentInvites.has(f.friend_id)
    );
    setSelectedIds(new Set(uninvitedFriends.map((f) => f.friend_id)));
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
      const selectedFriends = availableFriends.filter((f) =>
        selectedIds.has(f.friend_id),
      );

      // Store invites in database
      const result = await sendGameInvites(
        gridId,
        sessionTitle || "Game",
        selectedFriends.map((f) => f.friend_id),
      );

      if (!result.success) {
        Toast.show({
          type: "error",
          text1: result.error || "Failed to send invites",
          position: "bottom",
          bottomOffset: 60,
        });
        return;
      }

      // Send push notifications
      await sendGameInviteNotification(
        gridId,
        sessionTitle || "Game",
        selectedFriends.map((f) => ({
          id: f.friend_id,
          push_token: f.friend_push_token,
          username: f.friend_username,
        })),
      );

      // Refresh sent invites to update UI
      const newInvites = await getSentInvitesForGame(gridId);
      const inviteMap = new Map<string, string>();
      newInvites.forEach((inv) => {
        inviteMap.set(inv.recipientId, inv.inviteId);
      });
      setSentInvites(inviteMap);
      setSelectedIds(new Set());

      Toast.show({
        type: "success",
        text1: `Invites sent to ${selectedIds.size} friend${selectedIds.size > 1 ? "s" : ""}!`,
        position: "bottom",
        bottomOffset: 60,
      });
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

  // Search functionality
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);

      if (query.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const results = await searchUsers(query);
        // Filter out users already in the game
        const filteredResults = results.filter(
          (u) => !playerIds.includes(u.id),
        );
        setSearchResults(filteredResults);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearching(false);
      }
    },
    [playerIds],
  );

  const handleInviteUser = async (user: UserSearchResult) => {
    setInvitingUserId(user.id);
    try {
      // Store invite in database
      const result = await sendGameInvites(gridId, sessionTitle || "Game", [user.id]);

      if (!result.success) {
        Toast.show({
          type: "error",
          text1: result.error || "Failed to send invite",
          position: "bottom",
          bottomOffset: 60,
        });
        return;
      }

      // Fetch the new invite ID
      const newInvites = await getSentInvitesForGame(gridId);
      const newInvite = newInvites.find((inv) => inv.recipientId === user.id);
      if (newInvite) {
        setSentInvites((prev) => new Map(prev).set(user.id, newInvite.inviteId));
      }

      Toast.show({
        type: "success",
        text1: `Invite sent to ${user.username || "user"}!`,
        position: "bottom",
        bottomOffset: 60,
      });
    } catch (err) {
      console.error("Error inviting user:", err);
      Toast.show({
        type: "error",
        text1: "Failed to send invite",
        position: "bottom",
        bottomOffset: 60,
      });
    } finally {
      setInvitingUserId(null);
    }
  };

  const handleCancelInvite = async (userId: string, inviteId: string) => {
    setCancelingInvite(userId);
    try {
      const result = await cancelGameInvite(inviteId);
      if (result.success) {
        setSentInvites((prev) => {
          const newMap = new Map(prev);
          newMap.delete(userId);
          return newMap;
        });
        Toast.show({
          type: "info",
          text1: "Invite canceled",
          position: "bottom",
          bottomOffset: 60,
          visibilityTime: 1500,
        });
      } else {
        Toast.show({
          type: "error",
          text1: result.error || "Failed to cancel invite",
          position: "bottom",
          bottomOffset: 60,
        });
      }
    } catch (err) {
      console.error("Error canceling invite:", err);
      Toast.show({
        type: "error",
        text1: "Failed to cancel invite",
        position: "bottom",
        bottomOffset: 60,
      });
    } finally {
      setCancelingInvite(null);
    }
  };

  const handleSendFriendRequest = async (user: UserSearchResult) => {
    setSendingFriendRequest(user.id);
    try {
      const result = await sendFriendRequest(user.id);
      if (result.success) {
        // Update friendship status in search results
        setSearchResults((prev) =>
          prev.map((r) =>
            r.id === user.id ? { ...r, friendship_status: "pending" } : r,
          ),
        );
        Toast.show({
          type: "success",
          text1: `Friend request sent to ${user.username || "user"}!`,
          position: "bottom",
          bottomOffset: 60,
        });
      } else {
        Toast.show({
          type: "error",
          text1: result.error || "Failed to send friend request",
          position: "bottom",
          bottomOffset: 60,
        });
      }
    } catch (err) {
      console.error("Error sending friend request:", err);
      Toast.show({
        type: "error",
        text1: "Failed to send friend request",
        position: "bottom",
        bottomOffset: 60,
      });
    } finally {
      setSendingFriendRequest(null);
    }
  };

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(gridId);
      Toast.show({
        type: "info",
        text1: "Session ID copied!",
        position: "bottom",
        bottomOffset: 60,
        visibilityTime: 1500,
      });
    } catch (err) {
      Sentry.captureException(err);
      Toast.show({
        type: "error",
        text1: "Copy failed",
        position: "bottom",
        bottomOffset: 60,
      });
    }
  };

  const handleShare = async () => {
    try {
      const joinUrl = `https://squares-41599.web.app/session/${gridId}`;
      await Share.share({
        message: `Join my Squares game "${sessionTitle}": ${joinUrl}`,
      });
    } catch (err) {
      Sentry.captureException(err);
      Toast.show({
        type: "error",
        text1: "Sharing failed",
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

  const renderFriend = ({ item }: { item: FriendWithProfile }) => {
    const isSelected = selectedIds.has(item.friend_id);
    const existingInviteId = sentInvites.get(item.friend_id);
    const hasExistingInvite = !!existingInviteId;
    const isCanceling = cancelingInvite === item.friend_id;

    // If already invited, show a different UI
    if (hasExistingInvite) {
      return (
        <View
          style={[
            styles.friendCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: "transparent",
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
              {getInitials(item.friend_username, item.friend_email)}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.friendName, { color: theme.colors.onSurface }]}>
              {item.friend_username ||
                item.friend_email?.split("@")[0] ||
                "Friend"}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.statusBadge,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => handleCancelInvite(item.friend_id, existingInviteId)}
            disabled={isCanceling}
          >
            {isCanceling ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="check" size={16} color="#fff" />
                <Text style={styles.statusText}>Invited</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      );
    }

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
          style={[
            styles.avatarCircle,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <Text style={styles.avatarText}>
            {getInitials(item.friend_username, item.friend_email)}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.friendName, { color: theme.colors.onSurface }]}>
            {item.friend_username ||
              item.friend_email?.split("@")[0] ||
              "Friend"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSearchResult = ({ item }: { item: UserSearchResult }) => {
    const existingInviteId = sentInvites.get(item.id);
    const hasExistingInvite = !!existingInviteId;
    const isLoading = invitingUserId === item.id;
    const isCanceling = cancelingInvite === item.id;
    const isSendingFriendReq = sendingFriendRequest === item.id;
    const isFriend = item.friendship_status === "accepted";
    const hasPendingFriendRequest = item.friendship_status === "pending";
    const hasIncomingFriendRequest = item.friendship_status === "incoming_request";

    return (
      <View
        style={[styles.userCard, { backgroundColor: theme.colors.surface }]}
      >
        <View
          style={[
            styles.avatarCircle,
            { backgroundColor: theme.colors.secondary },
          ]}
        >
          <Text style={styles.avatarText}>
            {getInitials(item.username, item.email)}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.userName, { color: theme.colors.onSurface }]}>
            {item.username || "User"}
          </Text>
          {isFriend && (
            <Text style={[styles.friendLabel, { color: theme.colors.primary }]}>
              Friend
            </Text>
          )}
        </View>
        <View style={styles.actionButtons}>
          {/* Friend request button for non-friends */}
          {!isFriend && !hasPendingFriendRequest && !hasIncomingFriendRequest && (
            <TouchableOpacity
              style={[
                styles.smallButton,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
              onPress={() => handleSendFriendRequest(item)}
              disabled={isSendingFriendReq}
            >
              {isSendingFriendReq ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <MaterialIcons
                  name="person-add"
                  size={18}
                  color={theme.colors.primary}
                />
              )}
            </TouchableOpacity>
          )}
          {hasPendingFriendRequest && (
            <View
              style={[
                styles.smallBadge,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <Text style={[styles.smallBadgeText, { color: theme.colors.onSurfaceVariant }]}>
                Pending
              </Text>
            </View>
          )}
          {/* Game invite button */}
          {hasExistingInvite ? (
            <TouchableOpacity
              style={[
                styles.statusBadge,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => handleCancelInvite(item.id, existingInviteId)}
              disabled={isCanceling}
            >
              {isCanceling ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="check" size={16} color="#fff" />
                  <Text style={styles.statusText}>Invited</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.inviteButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => handleInviteUser(item)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="mail" size={16} color="#fff" />
                  <Text style={styles.inviteButtonText}>Invite</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={gradientColors} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Share Options */}
        <View style={styles.shareSection}>
          <Text
            style={[
              styles.sectionLabel,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            Share this game
          </Text>
          <View style={styles.shareRow}>
            <TouchableOpacity
              onPress={handleCopy}
              style={[
                styles.shareButton,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <MaterialIcons
                name="content-copy"
                size={20}
                color={theme.colors.primary}
              />
              <Text
                style={[
                  styles.shareButtonText,
                  { color: theme.colors.primary },
                ]}
              >
                Copy ID
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShare}
              style={[
                styles.shareButton,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <MaterialIcons
                name="share"
                size={20}
                color={theme.colors.primary}
              />
              <Text
                style={[
                  styles.shareButtonText,
                  { color: theme.colors.primary },
                ]}
              >
                Share Link
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "friends" && {
                borderBottomColor: theme.colors.primary,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab("friends")}
          >
            <MaterialIcons
              name="people"
              size={20}
              color={
                activeTab === "friends"
                  ? theme.colors.primary
                  : theme.colors.onSurfaceVariant
              }
            />
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === "friends"
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant,
                },
              ]}
            >
              Friends
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "search" && {
                borderBottomColor: theme.colors.primary,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab("search")}
          >
            <MaterialIcons
              name="search"
              size={20}
              color={
                activeTab === "search"
                  ? theme.colors.primary
                  : theme.colors.onSurfaceVariant
              }
            />
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === "search"
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant,
                },
              ]}
            >
              Search
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "friends" ? (
          <>
            {/* Quick Select Buttons */}
            {availableFriends.length > 0 && (
              <View style={styles.quickSelectRow}>
                <TouchableOpacity
                  style={[
                    styles.quickSelectBtn,
                    { backgroundColor: theme.colors.surface },
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
                      { backgroundColor: theme.colors.surface },
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
            ) : availableFriends.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons
                  name="people-outline"
                  size={48}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {friends.length === 0
                    ? "No friends yet"
                    : "All your friends are already in this game"}
                </Text>
                <Text
                  style={[
                    styles.emptySubtext,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {friends.length === 0
                    ? "Add friends or search for users to invite"
                    : "Use the Search tab to invite other users"}
                </Text>
              </View>
            ) : (
              <FlatList
                data={availableFriends}
                renderItem={renderFriend}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}

            {/* Send Invites Button */}
            {availableFriends.length > 0 && (
              <View
                style={[
                  styles.bottomSection,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
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
          </>
        ) : (
          <>
            {/* Search Input */}
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
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChangeText={handleSearch}
                  style={[
                    styles.searchInput,
                    { color: theme.colors.onSurface },
                  ]}
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Search Results */}
            {searching ? (
              <View style={styles.loadingContainer}>
                <SkeletonLoader variant="friendsList" />
              </View>
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
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
                  Search for users by username
                </Text>
              </View>
            )}
          </>
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default InviteFriendsScreen;

const styles = StyleSheet.create({
  shareSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Rubik_500Medium",
    marginBottom: 10,
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
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
  },
  quickSelectRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
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
    fontSize: 15,
    fontFamily: "Rubik_500Medium",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  userName: {
    fontSize: 15,
    fontFamily: "Rubik_500Medium",
  },
  friendLabel: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  smallButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  smallBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  smallBadgeText: {
    fontSize: 11,
    fontFamily: "Rubik_500Medium",
  },
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  inviteButtonText: {
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
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
    textAlign: "center",
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  bottomSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  selectedCount: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
});
