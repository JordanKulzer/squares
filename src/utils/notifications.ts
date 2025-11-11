import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";
import { NotificationSettings } from "./notificationTypes";
import { supabase } from "../lib/supabase";

const DEADLINE_NOTIFICATION_KEY = "deadlineNotificationIds";
const isDevClient = process.env.APP_ENV !== "production";
const QUARTER_FLAG_KEY = (gridId: string) => `quarterFlags:${gridId}`;

// Map a period number to a friendly key
const periodToKey = (p: number) =>
  p === 1
    ? "Q1"
    : p === 2
    ? "Q2"
    : p === 3
    ? "Q3"
    : p === 4
    ? "Q4"
    : p >= 5
    ? `OT${p - 4}`
    : `P${p}`;

type QuarterFlags = Record<string, boolean>;
export async function checkQuarterEndNotification(
  game: any,
  gridId: string,
  notifySettings: NotificationSettings
) {
  try {
    if (!notifySettings?.quarterResults) return;

    const completed = game?.completedQuarters ?? 0;
    if (completed === 0) return;

    // Load existing flags (which quarters have already notified)
    const raw = (await AsyncStorage.getItem(QUARTER_FLAG_KEY(gridId))) || "{}";
    const flags: QuarterFlags = JSON.parse(raw);

    // Loop through all completed quarters
    for (let q = 1; q <= completed; q++) {
      const key = periodToKey(q);
      if (!flags[key]) {
        const qScore = game?.quarterScores?.[q - 1];

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🏈 End of ${key}`,
            body: `${game.fullTeam2} ${qScore?.home ?? "-"} – ${
              game.fullTeam1
            } ${qScore?.away ?? "-"}`,
            sound: true,
          },
          trigger: null,
        });

        flags[key] = true;
        // save immediately
        await AsyncStorage.setItem(
          QUARTER_FLAG_KEY(gridId),
          JSON.stringify(flags)
        );
      }
    }

    // 👇 Add this AFTER the quarter loop
    if (game?.completed && !flags["FINAL"]) {
      const lastScore = game.quarterScores?.at(-1);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🎉 Final Result",
          body: `${game.fullTeam2} ${lastScore?.home ?? "-"} – ${
            game.fullTeam1
          } ${lastScore?.away ?? "-"}`,
          sound: true,
        },
        trigger: null,
      });

      flags["FINAL"] = true;
      await AsyncStorage.setItem(
        QUARTER_FLAG_KEY(gridId),
        JSON.stringify(flags)
      );
    }
  } catch (e) {
    console.warn("checkQuarterEndNotification error", e);
  }
}

/** Optional: call this when leaving the session or when a game is fully POST to reset */
export async function resetQuarterNotifications(gridId: string) {
  await AsyncStorage.removeItem(QUARTER_FLAG_KEY(gridId));
}

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

  // if (notifySettings?.quarterResults) {
  //   await AsyncStorage.removeItem(`quarterNotified:${gridId}`);
  // }
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

export const sendPlayerJoinedNotification = async (
  gridId: string,
  newUsername: string
) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id;
  if (!currentUserId) return;

  // Get all players in this session
  const { data: players, error } = await supabase
    .from("players")
    .select("user_id, is_manager, notification_settings")
    .eq("grid_id", gridId);

  if (error || !players) return;

  // Notify managers only
  const managers = players.filter((p) => p.is_manager);
  for (const m of managers) {
    if (m.user_id !== currentUserId && m.notification_settings?.playerJoined) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "👋 New Player Joined",
          body: `${newUsername} just joined your session.`,
          sound: true,
        },
        trigger: null,
      });
    }
  }
};
