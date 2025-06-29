import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";

const DEADLINE_NOTIFICATION_KEY = "deadlineNotificationIds";
const isDevClient = process.env.APP_ENV !== "production";

export const scheduleDeadlineNotifications = async (deadline: Date) => {
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
    await Notifications.requestPermissionsAsync();
  }

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

  await AsyncStorage.setItem(
    DEADLINE_NOTIFICATION_KEY,
    JSON.stringify(scheduledIds)
  );
};
