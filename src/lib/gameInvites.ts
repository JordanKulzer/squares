// Game Invites API functions for database-backed invite system

import { supabase } from "./supabase";
import { GameInviteWithSender } from "../types/gameInvites";

/**
 * Send game invites to multiple recipients
 * Stores invites in the database (alongside push notifications)
 * Handles reinvitations by updating existing non-pending invites back to pending
 */
export const sendGameInvites = async (
  gridId: string,
  sessionTitle: string,
  recipientIds: string[],
): Promise<{ success: boolean; error?: string }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Deduplicate incoming recipient IDs and filter out self-invites
    const uniqueRecipientIds = Array.from(new Set(recipientIds)).filter(
      (id) => id !== user.id,
    );

    if (uniqueRecipientIds.length === 0) {
      return { success: true };
    }

    // Validate recipients exist in the public `users` table (profiles)
    const { data: existingUsers } = await supabase
      .from("users")
      .select("id")
      .in("id", uniqueRecipientIds);

    const validRecipientIds = new Set(existingUsers?.map((u) => u.id) || []);
    const validCandidates = uniqueRecipientIds.filter((id) =>
      validRecipientIds.has(id),
    );
    const invalidCandidates = uniqueRecipientIds.filter(
      (id) => !validRecipientIds.has(id),
    );

    if (invalidCandidates.length > 0) {
      console.warn(
        "sendGameInvites: skipping recipients with no user record:",
        invalidCandidates,
      );
    }

    if (validCandidates.length === 0) {
      return { success: true }; // Nothing valid to process
    }

    // Use upsert to handle both new invites and reinvitations
    // This works even when RLS prevents seeing/updating invites from other senders
    const invites = validCandidates.map((recipientId) => ({
      grid_id: gridId,
      sender_id: user.id,
      recipient_id: recipientId,
      session_title: sessionTitle,
      status: "pending",
      responded_at: null,
    }));

    console.log(
      "sendGameInvites: upserting invites for recipients:",
      validCandidates,
    );

    const { data: upsertData, error: upsertError } = await supabase
      .from("game_invites")
      .upsert(invites, {
        onConflict: "grid_id,recipient_id",
        ignoreDuplicates: false, // We want to update on conflict
      })
      .select();

    console.log("sendGameInvites: upsert result:", { upsertData, upsertError });

    if (upsertError) {
      if (upsertError.code === "23503") {
        console.error("Foreign key violation in game_invites:", upsertError);
        return { success: false, error: "One or more recipients do not exist" };
      }
      console.error("Error upserting game invites:", upsertError);
      return { success: false, error: upsertError.message };
    }

    return { success: true };
  } catch (err) {
    console.error("sendGameInvites error:", err);
    return { success: false, error: "Failed to send game invites" };
  }
};

/**
 * Get pending invites for the current user with sender info
 */
export const getPendingInvites = async (): Promise<GameInviteWithSender[]> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: invites, error } = await supabase
      .from("game_invites")
      .select("*")
      .eq("recipient_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error || !invites) {
      console.error("Error fetching pending invites:", error);
      return [];
    }

    // Get sender profiles
    const senderIds = [...new Set(invites.map((i) => i.sender_id))];
    const { data: profiles } = await supabase
      .from("users")
      .select("id, username, email")
      .in("id", senderIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    return invites.map((invite) => ({
      ...invite,
      sender_username: profileMap.get(invite.sender_id)?.username || null,
      sender_email: profileMap.get(invite.sender_id)?.email || null,
    }));
  } catch (err) {
    console.error("getPendingInvites error:", err);
    return [];
  }
};

/**
 * Get count of pending invites (for badge display)
 */
export const getInviteCount = async (): Promise<number> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from("game_invites")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("status", "pending");

    if (error) {
      console.error("Error getting invite count:", error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error("getInviteCount error:", err);
    return 0;
  }
};

/**
 * Accept an invite - marks it as accepted and navigates user to JoinSquareScreen
 * The actual game join happens in JoinSquareScreen where user picks username/color
 */
export const acceptInvite = async (
  inviteId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Fetch the invite
    const { data: invite, error: inviteError } = await supabase
      .from("game_invites")
      .select("*")
      .eq("id", inviteId)
      .eq("recipient_id", user.id)
      .eq("status", "pending")
      .single();

    if (inviteError || !invite) {
      return { success: false, error: "Invite not found or already responded" };
    }

    // Check if the game still exists
    const { data: square, error: squareError } = await supabase
      .from("squares")
      .select("id")
      .eq("id", invite.grid_id)
      .single();

    if (squareError || !square) {
      // Game was deleted, mark invite as expired
      await supabase
        .from("game_invites")
        .update({ status: "expired", responded_at: new Date().toISOString() })
        .eq("id", inviteId);
      return { success: false, error: "Game no longer exists" };
    }

    // Mark invite as accepted
    await supabase
      .from("game_invites")
      .update({ status: "accepted", responded_at: new Date().toISOString() })
      .eq("id", inviteId);

    return { success: true };
  } catch (err) {
    console.error("acceptInvite error:", err);
    return { success: false, error: "Failed to accept invite" };
  }
};

/**
 * Reject an invite
 */
export const rejectInvite = async (
  inviteId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("game_invites")
      .update({ status: "rejected", responded_at: new Date().toISOString() })
      .eq("id", inviteId)
      .eq("recipient_id", user.id);

    if (error) {
      console.error("Error rejecting invite:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("rejectInvite error:", err);
    return { success: false, error: "Failed to reject invite" };
  }
};

/**
 * Cancel/rescind a sent game invite (sender only)
 */
export const cancelGameInvite = async (
  inviteId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("game_invites")
      .delete()
      .eq("id", inviteId)
      .eq("sender_id", user.id)
      .eq("status", "pending");

    if (error) {
      console.error("Error canceling game invite:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("cancelGameInvite error:", err);
    return { success: false, error: "Failed to cancel invite" };
  }
};

/**
 * Get pending invites sent by current user for a specific game
 * Returns recipient IDs who already have pending invites
 */
export const getSentInvitesForGame = async (
  gridId: string,
): Promise<{ recipientId: string; inviteId: string }[]> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: invites, error } = await supabase
      .from("game_invites")
      .select("id, recipient_id")
      .eq("grid_id", gridId)
      .eq("sender_id", user.id)
      .eq("status", "pending");

    if (error || !invites) {
      console.error("Error fetching sent invites:", error);
      return [];
    }

    return invites.map((i) => ({
      recipientId: i.recipient_id,
      inviteId: i.id,
    }));
  } catch (err) {
    console.error("getSentInvitesForGame error:", err);
    return [];
  }
};
