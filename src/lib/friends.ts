// Friends API functions for managing friendships and Top 4 rankings

import { supabase } from "./supabase";
import {
  Friend,
  FriendWithProfile,
  FriendRequest,
  UserSearchResult,
  Top4Slot,
  MyRankingInfo,
} from "../types/friends";

/**
 * Send a friend request to another user
 */
export const sendFriendRequest = async (
  friendId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Prevent sending friend request to yourself
    if (friendId === user.id) {
      return {
        success: false,
        error: "Cannot send friend request to yourself",
      };
    }

    // Validate that the target user exists in the `users` table
    const { data: targetUser, error: targetError } = await supabase
      .from("users")
      .select("id")
      .eq("id", friendId)
      .maybeSingle();

    if (targetError) {
      console.error("Error validating target user:", targetError);
      return { success: false, error: targetError.message };
    }

    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from("friends")
      .select("id, status")
      .or(
        `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`,
      )
      .maybeSingle();

    if (existing) {
      if (existing.status === "accepted") {
        return { success: false, error: "Already friends" };
      }
      if (existing.status === "pending") {
        return { success: false, error: "Friend request already pending" };
      }
      if (existing.status === "blocked") {
        return { success: false, error: "Unable to send request" };
      }
    }

    const { error } = await supabase.from("friends").insert({
      user_id: user.id,
      friend_id: friendId,
      status: "pending",
    });

    if (error) {
      // Handle FK violation (target user missing) or duplicate constraint
      if (error.code === "23503") {
        console.error("Foreign key violation inserting friends:", error);
        return { success: false, error: "Target user does not exist" };
      }
      if (error.code === "23505") {
        console.warn("Duplicate friend relationship detected:", error);
        return {
          success: false,
          error: "Friend request already exists or you are already friends",
        };
      }

      console.error("Error sending friend request:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("sendFriendRequest error:", err);
    return { success: false, error: "Failed to send friend request" };
  }
};

/**
 * Accept an incoming friend request
 */
export const acceptFriendRequest = async (
  requestId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("friends")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) {
      console.error("Error accepting friend request:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("acceptFriendRequest error:", err);
    return { success: false, error: "Failed to accept friend request" };
  }
};

/**
 * Reject/decline an incoming friend request
 */
export const rejectFriendRequest = async (
  requestId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("friends")
      .delete()
      .eq("id", requestId);

    if (error) {
      console.error("Error rejecting friend request:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("rejectFriendRequest error:", err);
    return { success: false, error: "Failed to reject friend request" };
  }
};

/**
 * Remove an existing friend
 */
export const removeFriend = async (
  friendshipId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("friends")
      .delete()
      .eq("id", friendshipId);

    if (error) {
      console.error("Error removing friend:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("removeFriend error:", err);
    return { success: false, error: "Failed to remove friend" };
  }
};

/**
 * Block a user
 */
export const blockUser = async (
  userId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Check if friendship exists
    const { data: existing } = await supabase
      .from("friends")
      .select("id")
      .or(
        `and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`,
      )
      .maybeSingle();

    if (existing) {
      // Update existing to blocked
      const { error } = await supabase
        .from("friends")
        .update({ status: "blocked", ranking: null })
        .eq("id", existing.id);

      if (error) return { success: false, error: error.message };
    } else {
      // Create new blocked relationship
      const { error } = await supabase.from("friends").insert({
        user_id: user.id,
        friend_id: userId,
        status: "blocked",
      });

      if (error) return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("blockUser error:", err);
    return { success: false, error: "Failed to block user" };
  }
};

/**
 * Get all accepted friends with their profile info
 */
export const getFriends = async (): Promise<FriendWithProfile[]> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    // Get friendships where current user is either user_id or friend_id
    const { data: friendships, error } = await supabase
      .from("friends")
      .select("*")
      .eq("status", "accepted")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (error || !friendships) {
      console.error("Error fetching friends:", error);
      return [];
    }

    // Get the friend's user IDs (the other person in each relationship)
    const friendIds = friendships.map((f) =>
      f.user_id === user.id ? f.friend_id : f.user_id,
    );

    if (friendIds.length === 0) return [];

    // Fetch user profiles
    const { data: profiles } = await supabase
      .from("users")
      .select("id, username, email, push_token")
      .in("id", friendIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // Combine friendship data with profiles
    return friendships.map((friendship) => {
      const friendId =
        friendship.user_id === user.id
          ? friendship.friend_id
          : friendship.user_id;
      const profile = profileMap.get(friendId);

      // For display purposes, normalize so friend_id is always the friend
      return {
        ...friendship,
        friend_id: friendId,
        user_id: user.id,
        friend_username: profile?.username || null,
        friend_email: profile?.email || null,
        friend_push_token: profile?.push_token || null,
      };
    });
  } catch (err) {
    console.error("getFriends error:", err);
    return [];
  }
};

/**
 * Get incoming friend requests (where you are the friend_id)
 */
export const getPendingRequests = async (): Promise<FriendRequest[]> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: requests, error } = await supabase
      .from("friends")
      .select("*")
      .eq("friend_id", user.id)
      .eq("status", "pending");

    if (error || !requests) {
      console.error("Error fetching pending requests:", error);
      return [];
    }

    // Get requester profiles
    const requesterIds = requests.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("users")
      .select("id, username, email")
      .in("id", requesterIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    return requests.map((request) => ({
      ...request,
      status: "pending" as const,
      requester_username: profileMap.get(request.user_id)?.username || null,
      requester_email: profileMap.get(request.user_id)?.email || null,
    }));
  } catch (err) {
    console.error("getPendingRequests error:", err);
    return [];
  }
};

/**
 * Get outgoing friend requests (where you are the user_id)
 */
export const getSentRequests = async (): Promise<Friend[]> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("friends")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (error) {
      console.error("Error fetching sent requests:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("getSentRequests error:", err);
    return [];
  }
};

/**
 * Update a friend's Top 4 ranking (1-4, or null to remove from Top 4)
 */
export const updateFriendRanking = async (
  friendshipId: string,
  ranking: number | null,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    if (ranking !== null && (ranking < 1 || ranking > 4)) {
      return { success: false, error: "Ranking must be 1-4 or null" };
    }

    // If setting a ranking, clear any existing friend at that position
    if (ranking !== null) {
      await supabase
        .from("friends")
        .update({ ranking: null })
        .eq("user_id", user.id)
        .eq("ranking", ranking)
        .neq("id", friendshipId);
    }

    const { error } = await supabase
      .from("friends")
      .update({ ranking })
      .eq("id", friendshipId);

    if (error) {
      console.error("Error updating ranking:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("updateFriendRanking error:", err);
    return { success: false, error: "Failed to update ranking" };
  }
};

/**
 * Get Top 4 friends as slots (with empty positions)
 */
export const getTop4 = async (): Promise<Top4Slot[]> => {
  try {
    const friends = await getFriends();
    const rankedFriends = friends.filter((f) => f.ranking !== null);

    const slots: Top4Slot[] = [1, 2, 3, 4].map((position) => ({
      position: position as 1 | 2 | 3 | 4,
      friend: rankedFriends.find((f) => f.ranking === position) || null,
    }));

    return slots;
  } catch (err) {
    console.error("getTop4 error:", err);
    return [
      { position: 1, friend: null },
      { position: 2, friend: null },
      { position: 3, friend: null },
      { position: 4, friend: null },
    ];
  }
};

/**
 * Search users by name or email to add as friends
 */
export const searchUsers = async (
  query: string,
): Promise<UserSearchResult[]> => {
  try {
    if (!query || query.length < 2) return [];

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    // Search users by username or email (case insensitive)
    // Filter out current user by both ID and email to handle ID mismatches
    let queryBuilder = supabase
      .from("users")
      .select("id, username, email")
      .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
      .neq("id", user.id)
      .is("deleted_at", null)
      .or("is_private.is.null,is_private.eq.false")
      .limit(20);

    // Also filter by email if available
    if (user.email) {
      queryBuilder = queryBuilder.neq("email", user.email);
    }

    const { data: users, error } = await queryBuilder;

    if (error || !users) {
      console.error("Error searching users:", error);
      return [];
    }

    // Get existing friendships with these users
    const userIds = users.map((u) => u.id);
    const { data: friendships } = await supabase
      .from("friends")
      .select("id, user_id, friend_id, status")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .or(userIds.map((id) => `user_id.eq.${id},friend_id.eq.${id}`).join(","));

    // Map friendship status for each user
    return users.map((u) => {
      const friendship = friendships?.find(
        (f) =>
          (f.user_id === user.id && f.friend_id === u.id) ||
          (f.user_id === u.id && f.friend_id === user.id),
      );

      let friendshipStatus: UserSearchResult["friendship_status"] = "none";
      if (friendship) {
        if (friendship.status === "accepted") {
          friendshipStatus = "accepted";
        } else if (friendship.status === "pending") {
          // Check if incoming or outgoing
          friendshipStatus =
            friendship.user_id === user.id ? "pending" : "incoming_request";
        } else if (friendship.status === "blocked") {
          friendshipStatus = "blocked";
        }
      }

      return {
        id: u.id,
        username: u.username,
        email: u.email,
        friendship_status: friendshipStatus,
        friendship_id: friendship?.id || null,
      };
    });
  } catch (err) {
    console.error("searchUsers error:", err);
    return [];
  }
};

/**
 * Check where you rank on a friend's Top 4 list
 */
export const getMyRankingOnFriendsList = async (
  friendId: string,
): Promise<MyRankingInfo | null> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // Get the friendship where friendId is the user_id (their list)
    const { data: friendship, error } = await supabase
      .from("friends")
      .select("ranking")
      .eq("user_id", friendId)
      .eq("friend_id", user.id)
      .eq("status", "accepted")
      .maybeSingle();

    if (error) {
      console.error("Error getting ranking:", error);
      return null;
    }

    // Get friend's username
    const { data: friendProfile } = await supabase
      .from("users")
      .select("username")
      .eq("id", friendId)
      .single();

    return {
      friend_id: friendId,
      friend_username: friendProfile?.username || null,
      my_ranking: friendship?.ranking || null,
    };
  } catch (err) {
    console.error("getMyRankingOnFriendsList error:", err);
    return null;
  }
};

/**
 * Cancel a sent friend request
 */
export const cancelFriendRequest = async (
  requestId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("friends")
      .delete()
      .eq("id", requestId);

    if (error) {
      console.error("Error canceling friend request:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("cancelFriendRequest error:", err);
    return { success: false, error: "Failed to cancel friend request" };
  }
};
