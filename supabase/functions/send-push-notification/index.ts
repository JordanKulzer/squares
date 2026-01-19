// @ts-nocheck
// Supabase Edge Function to send push notifications via Expo Push API
// Deploy with: supabase functions deploy send-push-notification
// Note: This file runs in Deno runtime, not Node.js. IDE errors for Deno APIs are expected.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface NotificationSettings {
  deadlineReminders: boolean;
  playerJoined: boolean;
  playerLeft: boolean;
  squareDeleted: boolean;
}

interface Player {
  userId: string;
  username: string;
  color: string;
  notifySettings?: NotificationSettings;
  pushToken?: string;
}

interface PushNotificationRequest {
  type: "player_joined" | "player_left" | "square_deleted";
  gridId: string;
  sessionTitle: string;
  triggerUserId: string;
  triggerUsername: string;
  // For square_deleted, we need the players list since the square will be deleted
  players?: Player[];
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  sound?: "default" | null;
  data?: Record<string, unknown>;
}

// Send notifications via Expo Push API
async function sendExpoPushNotifications(messages: ExpoPushMessage[]) {
  if (messages.length === 0) return { success: true, sent: 0 };

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log("Expo Push API response:", result);
    return { success: true, sent: messages.length, result };
  } catch (error) {
    console.error("Failed to send push notifications:", error);
    return { success: false, error: String(error) };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role key to access all data
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushNotificationRequest = await req.json();
    const { type, gridId, sessionTitle, triggerUserId, triggerUsername, players: providedPlayers } = payload;

    console.log("Received notification request:", { type, gridId, sessionTitle, triggerUserId });

    const messages: ExpoPushMessage[] = [];

    if (type === "player_joined" || type === "player_left") {
      // Get the square to find the owner and players
      const { data: square, error } = await supabase
        .from("squares")
        .select("players, created_by")
        .eq("id", gridId)
        .single();

      if (error || !square) {
        console.error("Failed to fetch square:", error);
        return new Response(
          JSON.stringify({ error: "Square not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      const players: Player[] = square.players || [];
      const ownerId = square.created_by;

      // Find owner's player record to check their notification settings
      const owner = players.find((p) => p.userId === ownerId);

      if (!owner) {
        return new Response(
          JSON.stringify({ error: "Owner not found in players" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get owner's push token from users table
      const { data: ownerUser } = await supabase
        .from("users")
        .select("push_token")
        .eq("id", ownerId)
        .single();

      const ownerPushToken = ownerUser?.push_token;

      if (type === "player_joined") {
        // Notify owner if they have playerJoined enabled and they're not the one joining
        if (
          owner.notifySettings?.playerJoined &&
          ownerId !== triggerUserId &&
          ownerPushToken
        ) {
          messages.push({
            to: ownerPushToken,
            title: "New Player Joined",
            body: `${triggerUsername} joined "${sessionTitle}"`,
            sound: "default",
            data: { gridId, type: "player_joined" },
          });
        }
      } else if (type === "player_left") {
        // Notify owner if they have playerLeft enabled and they're not the one leaving
        if (
          owner.notifySettings?.playerLeft &&
          ownerId !== triggerUserId &&
          ownerPushToken
        ) {
          messages.push({
            to: ownerPushToken,
            title: "Player Left",
            body: `${triggerUsername} left "${sessionTitle}"`,
            sound: "default",
            data: { gridId, type: "player_left" },
          });
        }
      }
    } else if (type === "square_deleted") {
      // For deletion, we need the players list passed in since the square will be deleted
      const players: Player[] = providedPlayers || [];

      // Get push tokens for all players who have squareDeleted enabled
      const playersToNotify = players.filter(
        (p) => p.notifySettings?.squareDeleted && p.userId !== triggerUserId
      );

      if (playersToNotify.length > 0) {
        // Fetch push tokens from users table
        const userIds = playersToNotify.map((p) => p.userId);
        const { data: users } = await supabase
          .from("users")
          .select("id, push_token")
          .in("id", userIds);

        const tokenMap = new Map(
          users?.map((u) => [u.id, u.push_token]) || []
        );

        for (const player of playersToNotify) {
          const pushToken = tokenMap.get(player.userId);
          if (pushToken) {
            messages.push({
              to: pushToken,
              title: "Session Deleted",
              body: `"${sessionTitle}" has been deleted by the owner`,
              sound: "default",
              data: { type: "square_deleted" },
            });
          }
        }
      }
    }

    console.log(`Sending ${messages.length} push notifications`);
    const result = await sendExpoPushNotifications(messages);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error processing notification:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
