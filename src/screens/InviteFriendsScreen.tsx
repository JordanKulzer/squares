import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  Share,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "react-native-paper";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import Toast from "react-native-toast-message";
import * as Clipboard from "expo-clipboard";
import * as Sentry from "@sentry/react-native";
import { supabase } from "../lib/supabase";
import { getFriends, searchUsers, sendFriendRequest } from "../lib/friends";
import { FriendWithProfile, UserSearchResult } from "../types/friends";
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

// Unified type for both friends and search results in the list
type ListUser = {
  id: string;
  username: string | null;
  email?: string | null;
  push_token?: string | null;
  isFriend: boolean;
  friendshipStatus?: string | null;
};

type SectionData = {
  title: string;
  key: "suggested" | "friends" | "search";
  data: ListUser[];
};

const InviteFriendsScreen = () => {
  const theme = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<{ params: InviteFriendsScreenParams }, "params">>();
  const { gridId, sessionTitle } = route.params;

  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [suggestedIds, setSuggestedIds] = useState<Set<string>>(new Set());
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingFriendRequest, setSendingFriendRequestId] = useState<string | null>(null);

  // Map<recipientId, inviteId>
  const [sentInvites, setSentInvites] = useState<Map<string, string>>(new Map());
  const [cancelingInvite, setCancelingInvite] = useState<string | null>(null);

  const gradientColors = theme.dark
    ? (["#121212", "#1d1d1d", "#2b2b2d"] as const)
    : (["#fdfcf9", "#e0e7ff"] as const);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: authData }, { data: squareData }, friendsData, existingInvites] =
        await Promise.all([
          supabase.auth.getUser(),
          supabase.from("squares").select("player_ids").eq("id", gridId).single(),
          getFriends(),
          getSentInvitesForGame(gridId),
        ]);

      const currentUserId = authData.user?.id;
      const ids: string[] = squareData?.player_ids ?? [];
      setPlayerIds(ids);
      setFriends(friendsData);

      const inviteMap = new Map<string, string>();
      existingInvites.forEach((inv) => inviteMap.set(inv.recipientId, inv.inviteId));
      setSentInvites(inviteMap);

      // Derive suggested: friends who appear as co-players in recent games
      if (currentUserId && friendsData.length > 0) {
        const { data: recentGames } = await supabase
          .from("squares")
          .select("player_ids")
          .contains("player_ids", [currentUserId])
          .order("created_at", { ascending: false })
          .limit(15);

        if (recentGames) {
          const coPlayerIds = new Set<string>();
          recentGames.forEach((sq) => {
            (sq.player_ids as string[])?.forEach((pid) => {
              if (pid !== currentUserId) coPlayerIds.add(pid);
            });
          });
          const friendIdSet = new Set(friendsData.map((f) => f.friend_id));
          setSuggestedIds(new Set([...coPlayerIds].filter((id) => friendIdSet.has(id))));
        }
      }
    } catch (err) {
      console.error("Error loading invite data:", err);
    } finally {
      setLoading(false);
    }
  }, [gridId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const availableFriends = friends.filter((f) => !playerIds.includes(f.friend_id));

  const friendToListUser = (f: FriendWithProfile): ListUser => ({
    id: f.friend_id,
    username: f.friend_username,
    email: f.friend_email,
    push_token: f.friend_push_token,
    isFriend: true,
  });

  const sections: SectionData[] = useMemo(() => {
    const isSearching = searchQuery.length >= 2;

    if (isSearching) {
      // Friends matching query + non-friend search results
      const friendMatches = availableFriends
        .filter((f) => {
          const name = (f.friend_username || f.friend_email || "").toLowerCase();
          return name.includes(searchQuery.toLowerCase());
        })
        .map(friendToListUser);

      const friendIds = new Set(availableFriends.map((f) => f.friend_id));
      const nonFriendResults: ListUser[] = searchResults
        .filter((u) => !friendIds.has(u.id))
        .map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          push_token: null,
          isFriend: u.friendship_status === "accepted",
          friendshipStatus: u.friendship_status,
        }));

      const combined = [...friendMatches, ...nonFriendResults];
      return combined.length > 0
        ? [{ title: "Results", key: "search" as const, data: combined }]
        : [];
    }

    const result: SectionData[] = [];

    const suggested = availableFriends
      .filter((f) => suggestedIds.has(f.friend_id))
      .map(friendToListUser);
    if (suggested.length > 0) {
      result.push({ title: "Suggested", key: "suggested", data: suggested });
    }

    const remaining = availableFriends
      .filter((f) => !suggestedIds.has(f.friend_id))
      .map(friendToListUser);
    if (remaining.length > 0) {
      result.push({ title: "Friends", key: "friends", data: remaining });
    }

    return result;
  }, [searchQuery, availableFriends, searchResults, suggestedIds]);

  const toggleSelection = (userId: string) => {
    if (sentInvites.has(userId)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSendInvites = async () => {
    if (selectedIds.size === 0) return;
    setSending(true);
    try {
      const ids = [...selectedIds];

      const recipients = ids.map((id) => {
        const friend = availableFriends.find((f) => f.friend_id === id);
        const searchUser = searchResults.find((u) => u.id === id);
        return {
          id,
          push_token: friend?.friend_push_token ?? null,
          username: friend?.friend_username ?? searchUser?.username ?? null,
        };
      });

      const result = await sendGameInvites(gridId, sessionTitle || "Game", ids);
      if (!result.success) {
        Toast.show({
          type: "error",
          text1: result.error || "Failed to send invites",
          position: "bottom",
          bottomOffset: 60,
        });
        return;
      }

      await sendGameInviteNotification(gridId, sessionTitle || "Game", recipients);

      const newInvites = await getSentInvitesForGame(gridId);
      const inviteMap = new Map<string, string>();
      newInvites.forEach((inv) => inviteMap.set(inv.recipientId, inv.inviteId));
      setSentInvites(inviteMap);
      setSelectedIds(new Set());

      const count = ids.length;
      Toast.show({
        type: "success",
        text1: `Invite${count !== 1 ? "s" : ""} sent to ${count} ${count !== 1 ? "players" : "player"}`,
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
        setSearchResults(results.filter((u) => !playerIds.includes(u.id)));
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearching(false);
      }
    },
    [playerIds],
  );

  const handleCancelInvite = async (userId: string, inviteId: string) => {
    setCancelingInvite(userId);
    try {
      const result = await cancelGameInvite(inviteId);
      if (result.success) {
        setSentInvites((prev) => {
          const next = new Map(prev);
          next.delete(userId);
          return next;
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

  const handleSendFriendRequest = async (user: ListUser) => {
    setSendingFriendRequestId(user.id);
    try {
      const result = await sendFriendRequest(user.id);
      if (result.success) {
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
          text1: result.error || "Failed to send request",
          position: "bottom",
          bottomOffset: 60,
        });
      }
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Failed to send friend request",
        position: "bottom",
        bottomOffset: 60,
      });
    } finally {
      setSendingFriendRequestId(null);
    }
  };

  const handleCopy = async () => {
    try {
      const joinUrl = `https://squares-41599.web.app/session/${gridId}`;
      await Clipboard.setStringAsync(joinUrl);
      Toast.show({
        type: "info",
        text1: "Link copied",
        position: "bottom",
        bottomOffset: 60,
        visibilityTime: 1500,
      });
    } catch (err) {
      Sentry.captureException(err);
    }
  };

  const handleShare = async () => {
    try {
      const joinUrl = `https://squares-41599.web.app/session/${gridId}`;
      const result = await Share.share({
        message: `Join my Squares game "${sessionTitle}": ${joinUrl}`,
      });
      if (result.action === Share.sharedAction) {
        Toast.show({
          type: "info",
          text1: "Link shared",
          position: "bottom",
          bottomOffset: 60,
          visibilityTime: 1500,
        });
      }
    } catch (err) {
      Sentry.captureException(err);
    }
  };

  const getInitials = (
    name: string | null | undefined,
    email: string | null | undefined,
  ) => {
    if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    if (email) return email[0].toUpperCase();
    return "?";
  };

  const renderUserRow = ({ item }: { item: ListUser }) => {
    const isSelected = selectedIds.has(item.id);
    const existingInviteId = sentInvites.get(item.id);
    const isInvited = !!existingInviteId;
    const isCanceling = cancelingInvite === item.id;
    const isSendingReq = sendingFriendRequest === item.id;
    const hasPendingRequest = item.friendshipStatus === "pending";
    const hasIncomingRequest = item.friendshipStatus === "incoming_request";

    return (
      <TouchableOpacity
        onPress={() => !isInvited && toggleSelection(item.id)}
        activeOpacity={isInvited ? 1 : 0.65}
        style={[
          styles.userRow,
          {
            backgroundColor: isSelected
              ? theme.dark
                ? "rgba(94,96,206,0.18)"
                : "rgba(94,96,206,0.09)"
              : theme.colors.surface,
            borderColor: isSelected ? theme.colors.primary : "transparent",
          },
        ]}
      >
        {/* Selection indicator */}
        <View
          style={[
            styles.selectionDot,
            {
              borderColor: isInvited
                ? theme.colors.primary
                : isSelected
                  ? theme.colors.primary
                  : theme.dark ? "#555" : "#ccc",
              backgroundColor: isSelected || isInvited ? theme.colors.primary : "transparent",
            },
          ]}
        >
          {(isSelected || isInvited) && (
            <MaterialIcons name="check" size={11} color="#fff" />
          )}
        </View>

        {/* Avatar */}
        <View
          style={[
            styles.avatarCircle,
            {
              backgroundColor: isInvited || isSelected
                ? theme.colors.primary
                : theme.colors.surfaceVariant,
            },
          ]}
        >
          <Text
            style={[
              styles.avatarText,
              {
                color:
                  isInvited || isSelected
                    ? "#fff"
                    : theme.colors.onSurfaceVariant,
              },
            ]}
          >
            {getInitials(item.username, item.email)}
          </Text>
        </View>

        {/* Name + sub-label */}
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text
            style={[
              styles.userName,
              {
                color: theme.colors.onSurface,
                opacity: isInvited ? 0.6 : 1,
              },
            ]}
          >
            {item.username || item.email?.split("@")[0] || "User"}
          </Text>
          {isInvited ? (
            <Text style={[styles.userSubLabel, { color: theme.colors.primary }]}>
              Invited
            </Text>
          ) : isSelected ? (
            <Text style={[styles.userSubLabel, { color: theme.colors.primary }]}>
              Selected
            </Text>
          ) : item.isFriend ? (
            <Text style={[styles.userSubLabel, { color: theme.colors.onSurfaceVariant }]}>
              Friend
            </Text>
          ) : hasPendingRequest ? (
            <Text style={[styles.userSubLabel, { color: theme.colors.onSurfaceVariant }]}>
              Request pending
            </Text>
          ) : null}
        </View>

        {/* Right-side actions */}
        {isInvited ? (
          <TouchableOpacity
            onPress={() => handleCancelInvite(item.id, existingInviteId)}
            disabled={isCanceling}
            style={[
              styles.cancelInviteBtn,
              { borderColor: theme.colors.primary + "50" },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isCanceling ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={[styles.cancelInviteText, { color: theme.colors.primary }]}>
                Cancel
              </Text>
            )}
          </TouchableOpacity>
        ) : !item.isFriend && !hasPendingRequest && !hasIncomingRequest ? (
          <TouchableOpacity
            onPress={() => handleSendFriendRequest(item)}
            disabled={isSendingReq}
            style={[
              styles.addFriendBtn,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isSendingReq ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <MaterialIcons name="person-add" size={17} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View
      style={[
        styles.sectionHeader,
        { backgroundColor: gradientColors[0] },
      ]}
    >
      <Text
        style={[styles.sectionHeaderText, { color: theme.colors.onSurfaceVariant }]}
      >
        {section.title}
      </Text>
    </View>
  );

  const isSearchActive = searchQuery.length >= 2;
  const hasNoFriends = !loading && friends.length === 0;
const showEmptySearch = isSearchActive && !searching && sections.length === 0;
  const showFriendEmpty = !isSearchActive && !loading && availableFriends.length === 0;

  const ctaLabel =
    selectedIds.size === 0
      ? "Select People to Invite"
      : selectedIds.size === 1
        ? "Send 1 Invite"
        : `Send ${selectedIds.size} Invites`;

  return (
    <LinearGradient colors={gradientColors} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Share row */}
        <View style={styles.shareSection}>
          <Text
            style={[styles.shareSectionLabel, { color: theme.colors.onSurfaceVariant }]}
          >
            Share this game
          </Text>
          <View style={styles.shareRow}>
            <TouchableOpacity
              onPress={handleCopy}
              style={[styles.shareButton, { backgroundColor: theme.colors.surface }]}
            >
              <MaterialIcons name="content-copy" size={18} color={theme.colors.primary} />
              <Text style={[styles.shareButtonText, { color: theme.colors.primary }]}>
                Copy link
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShare}
              style={[styles.shareButton, { backgroundColor: theme.colors.surface }]}
            >
              <MaterialIcons name="share" size={18} color={theme.colors.primary} />
              <Text style={[styles.shareButtonText, { color: theme.colors.primary }]}>
                Share link
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar — always visible, replaces tabs */}
        <View style={styles.searchBarContainer}>
          <View style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
            <MaterialIcons
              name="search"
              size={20}
              color={theme.colors.onSurfaceVariant}
              style={{ marginRight: 6 }}
            />
            <TextInput
              placeholder="Search friends or users…"
              value={searchQuery}
              onChangeText={handleSearch}
              style={[styles.searchInput, { color: theme.colors.onSurface }]}
              placeholderTextColor={theme.colors.onSurfaceVariant}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="close" size={18} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* List area */}
        {loading || searching ? (
          <View style={styles.loadingContainer}>
            <SkeletonLoader variant="friendsList" />
          </View>
        ) : showFriendEmpty || showEmptySearch ? (
          <View style={styles.emptyState}>
            {showEmptySearch ? (
              <>
                <MaterialIcons
                  name="search-off"
                  size={44}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                  No users found
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
                  Try a different username
                </Text>
              </>
            ) : hasNoFriends ? (
              <>
                <MaterialIcons
                  name="people-outline"
                  size={44}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                  No friends yet
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
                  Search by username above to find and invite people
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("FriendsScreen")}
                  style={[styles.emptyActionBtn, { backgroundColor: theme.colors.primary }]}
                >
                  <Text style={styles.emptyActionText}>Find Friends</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <MaterialIcons
                  name="check-circle-outline"
                  size={44}
                  color={theme.colors.primary}
                />
                <Text style={[styles.emptyText, { color: theme.colors.onSurface }]}>
                  All friends are already in this game
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
                  Search by username to invite others
                </Text>
              </>
            )}
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderUserRow}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Bottom CTA */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.dark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.08)",
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleSendInvites}
            disabled={selectedIds.size === 0 || sending}
            style={[
              styles.ctaButton,
              {
                backgroundColor:
                  selectedIds.size > 0
                    ? theme.colors.primary
                    : theme.dark ? "#2a2a2a" : "#e8e8e8",
              },
            ]}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialIcons
                  name="send"
                  size={17}
                  color={
                    selectedIds.size > 0 ? "#fff" : theme.colors.onSurfaceVariant
                  }
                />
                <Text
                  style={[
                    styles.ctaText,
                    {
                      color:
                        selectedIds.size > 0
                          ? "#fff"
                          : theme.colors.onSurfaceVariant,
                    },
                  ]}
                >
                  {ctaLabel}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default InviteFriendsScreen;

const styles = StyleSheet.create({
  // Share section
  shareSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  shareSectionLabel: {
    fontSize: 12,
    fontFamily: "Rubik_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  shareRow: {
    flexDirection: "row",
    gap: 10,
  },
  shareButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 10,
    gap: 7,
  },
  shareButtonText: {
    fontSize: 13,
    fontFamily: "Rubik_500Medium",
  },

  // Search bar
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Rubik_400Regular",
  },

  // Section headers
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontFamily: "Rubik_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  loadingContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // User row — single interaction model for friends + search results
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1.5,
  },
  selectionDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontFamily: "Rubik_600SemiBold",
  },
  userName: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
  },
  userSubLabel: {
    fontSize: 11,
    fontFamily: "Rubik_400Regular",
    marginTop: 1,
  },

  // Right-side actions
  cancelInviteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelInviteText: {
    fontSize: 12,
    fontFamily: "Rubik_500Medium",
  },
  addFriendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  // Empty states
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingBottom: 60,
    gap: 6,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Rubik_500Medium",
    textAlign: "center",
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    textAlign: "center",
    opacity: 0.7,
  },
  emptyActionBtn: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyActionText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
  },

  // Bottom CTA
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  ctaText: {
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
  },
});
