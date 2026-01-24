import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";
import { NotificationSettings } from "./notificationTypes";
import { supabase } from "../lib/supabase";

const DEADLINE_NOTIFICATION_KEY = "deadlineNotificationIds";
const isDevClient = process.env.APP_ENV !== "production";

/**
 * Call the Supabase Edge Function to send push notifications
 */
const callPushNotificationEdgeFunction = async (payload: {
  type: "player_joined" | "player_left" | "square_deleted" | "friend_request" | "friend_accepted" | "game_invite";
  gridId?: string;
  sessionTitle?: string;
  triggerUserId: string;
  triggerUsername?: string;
  players?: Array<{ userId: string; notifySettings?: NotificationSettings }>;
  targetUserId?: string;
  targetPushToken?: string;
  recipients?: Array<{ id: string; push_token: string | null; username: string | null }>;
}) => {
  try {
    const { data, error } = await supabase.functions.invoke("send-push-notification", {
      body: payload,
    });

    if (error) {
      console.warn("Push notification edge function error:", error);
      return null;
    }

    console.log("Push notification result:", data);
    return data;
  } catch (error) {
    console.warn("Failed to call push notification edge function:", error);
    return null;
  }
};

export const scheduleNotifications = async (
  deadline: Date,
  _gridId: string,
  notifySettings: NotificationSettings
) => {
  const now = new Date();
  const deadlineTime = deadline.getTime();

  if (deadlineTime <= now.getTime()) {
    console.warn("Deadline already passed. Skipping notifications.");
    return;
  }

  const existing = await AsyncStorage.getItem(DEADLINE_NOTIFICATION_KEY);
  if (existing) {
    const ids: string[] = JSON.parse(existing);
    for (const id of ids) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  }

  const scheduledIds: string[] = [];

  const scheduleIfInFuture = async (
    target: Date,
    title: string,
    body: string
  ) => {
    const timeDiff = target.getTime() - Date.now();
    const minDelayMs = 5000;

    const trigger: Notifications.NotificationTriggerInput = isDevClient
      ? {
          type: SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.floor(timeDiff / 1000),
          repeats: false,
        }
      : {
          type: SchedulableTriggerInputTypes.DATE,
          date: new Date(target.getTime()),
        };

    if (timeDiff > minDelayMs) {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: true },
        trigger,
      });
      scheduledIds.push(id);
    } else {
      console.warn(`Skipping "${title}" — too soon (trigger in ${timeDiff}ms)`);
    }
  };

  const offset30Min = 30 * 60 * 1000;
  const offset5Min = 5 * 60 * 1000;

  const thirtyMinBefore = new Date(deadlineTime - offset30Min);
  const fiveMinBefore = new Date(deadlineTime - offset5Min);

  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) {
    const ask = await Notifications.requestPermissionsAsync();
    if (!ask.granted) {
      console.warn("Notifications not granted by user.");
      return;
    }
  }

  if (notifySettings?.deadlineReminders) {
    await scheduleIfInFuture(
      thirtyMinBefore,
      "⏰ 30 minutes left!",
      "Only 30 minutes left to pick your Squares!"
    );

    await scheduleIfInFuture(
      fiveMinBefore,
      "⏰ 5 minutes left!",
      "Time is running out to pick your Squares!"
    );

    await scheduleIfInFuture(
      deadline,
      "🚨 Deadline Reached!",
      "No more selections allowed. Check the results soon!"
    );
  }

  await AsyncStorage.setItem(
    DEADLINE_NOTIFICATION_KEY,
    JSON.stringify(scheduledIds)
  );

};

/**
 * Send push notification to the session owner when a new player joins
 */
export const sendPlayerJoinedNotification = async (
  gridId: string,
  newUsername: string,
  sessionTitle: string
) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const currentUserId = user?.id;
    if (!currentUserId) return;

    // Call the Edge Function to send push notification to the owner
    await callPushNotificationEdgeFunction({
      type: "player_joined",
      gridId,
      sessionTitle,
      triggerUserId: currentUserId,
      triggerUsername: newUsername,
    });
  } catch (e) {
    console.warn("sendPlayerJoinedNotification error:", e);
  }
};

/**
 * Send push notification to the session owner when a player leaves
 */
export const sendPlayerLeftNotification = async (
  gridId: string,
  username: string,
  sessionTitle: string
) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const currentUserId = user?.id;
    if (!currentUserId) return;

    // Call the Edge Function to send push notification to the owner
    await callPushNotificationEdgeFunction({
      type: "player_left",
      gridId,
      sessionTitle,
      triggerUserId: currentUserId,
      triggerUsername: username,
    });
  } catch (e) {
    console.warn("sendPlayerLeftNotification error:", e);
  }
};

/**
 * Send push notification to all players when a square is deleted
 */
export const sendSquareDeletedNotification = async (
  gridId: string,
  sessionTitle: string,
  players: Array<{ userId: string; notifySettings?: NotificationSettings }>
) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const currentUserId = user?.id;
    if (!currentUserId) return;

    // Get current user's username for the notification
    const currentPlayer = players.find(p => p.userId === currentUserId);
    const triggerUsername = (currentPlayer as any)?.username || "The owner";

    // Call the Edge Function to send push notifications to all players
    await callPushNotificationEdgeFunction({
      type: "square_deleted",
      gridId,
      sessionTitle,
      triggerUserId: currentUserId,
      triggerUsername,
      players,
    });
  } catch (e) {
    console.warn("sendSquareDeletedNotification error:", e);
  }
};

/**
 * Cancel all scheduled deadline notifications (call when leaving a session)
 */
export const cancelDeadlineNotifications = async () => {
  try {
    const existing = await AsyncStorage.getItem(DEADLINE_NOTIFICATION_KEY);
    if (existing) {
      const ids: string[] = JSON.parse(existing);
      for (const id of ids) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
      await AsyncStorage.removeItem(DEADLINE_NOTIFICATION_KEY);
    }
  } catch (e) {
    console.warn("cancelDeadlineNotifications error:", e);
  }
};

/**
 * Send push notification when a friend request is sent
 */
export const sendFriendRequestNotification = async (
  targetUserId: string,
  targetPushToken: string | null
) => {
  try {
    if (!targetPushToken) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get current user's username
    const { data: profile } = await supabase
      .from("users")
      .select("username")
      .eq("id", user.id)
      .single();

    await callPushNotificationEdgeFunction({
      type: "friend_request",
      triggerUserId: user.id,
      triggerUsername: profile?.username || "Someone",
      targetUserId,
      targetPushToken,
    });
  } catch (e) {
    console.warn("sendFriendRequestNotification error:", e);
  }
};

/**
 * Send push notification when a friend request is accepted
 */
export const sendFriendAcceptedNotification = async (
  targetUserId: string,
  targetPushToken: string | null
) => {
  try {
    if (!targetPushToken) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get current user's username
    const { data: profile } = await supabase
      .from("users")
      .select("username")
      .eq("id", user.id)
      .single();

    await callPushNotificationEdgeFunction({
      type: "friend_accepted",
      triggerUserId: user.id,
      triggerUsername: profile?.username || "Someone",
      targetUserId,
      targetPushToken,
    });
  } catch (e) {
    console.warn("sendFriendAcceptedNotification error:", e);
  }
};

/**
 * Send push notifications to invite friends to a game
 */
export const sendGameInviteNotification = async (
  gridId: string,
  sessionTitle: string,
  recipients: Array<{ id: string; push_token: string | null; username: string | null }>
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get current user's username
    const { data: profile } = await supabase
      .from("users")
      .select("username")
      .eq("id", user.id)
      .single();

    // Filter out recipients without push tokens
    const validRecipients = recipients.filter(r => r.push_token);
    if (validRecipients.length === 0) return;

    await callPushNotificationEdgeFunction({
      type: "game_invite",
      gridId,
      sessionTitle,
      triggerUserId: user.id,
      triggerUsername: profile?.username || "A friend",
      recipients: validRecipients,
    });
  } catch (e) {
    console.warn("sendGameInviteNotification error:", e);
  }
};
