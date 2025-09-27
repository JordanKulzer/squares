import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";
import { NotificationSettings } from "./notificationTypes";
import { supabase } from "../lib/supabase";

const DEADLINE_NOTIFICATION_KEY = "deadlineNotificationIds";
const isDevClient = process.env.APP_ENV !== "production";

export const scheduleNotifications = async (
  deadline: Date,
  gridId: string,
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

  if (notifySettings?.quarterResults) {
    await AsyncStorage.removeItem(`quarterNotified:${gridId}`);
  }
};

export const sendGameUpdateNotification = async (gridId: string) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentUserId = user?.id;
  if (!currentUserId) return;

  const { data: players, error } = await supabase
    .from("players")
    .select("notification_token, notification_settings, user_id")
    .eq("grid_id", gridId);

  if (error || !players) return;

  const currentPlayer = players.find((p) => p.user_id === currentUserId);
  const shouldNotify = currentPlayer?.notification_settings?.gameUpdated;

  if (!shouldNotify) return;

  players.forEach(async (p) => {
    if (p.user_id !== currentUserId && p.notification_settings?.gameUpdated) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "📢 Game Info Updated",
          body: "The session owner updated team names or scores.",
          sound: true,
        },
        trigger: null,
      });
    }
  });
};
