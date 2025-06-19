import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { logDebug } from "./logDebug";

const DEADLINE_NOTIFICATION_KEY = "deadlineNotificationIds";

export const scheduleDeadlineNotifications = async (
  deadline: Date,
  gridId?: string
) => {
  const now = new Date();
  const deadlineTime = deadline.getTime();

  if (deadlineTime <= now.getTime()) {
    console.warn("Deadline already passed. Skipping notifications.");
    return;
  }

  // Cancel previous deadline-related notifications
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
    const nowTime = Date.now();
    const timeDiff = target.getTime() - nowTime;
    const minDelayMs = 5000;
    console.log("yyy: ", target);
    console.log(
      "📆 Scheduling for:",
      target.toISOString(),
      "Now:",
      new Date().toISOString()
    );

    if (timeDiff > minDelayMs) {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: true },
        trigger: {
          date: target,
        } as Notifications.NotificationTriggerInput,
      });
      scheduledIds.push(id);
    } else {
      const skipReason = `Skipping "${title}" — too soon (trigger in ${timeDiff}ms)`;
      console.warn(skipReason);
      await logDebug("scheduleDeadlineNotifications_skipped", {
        gridId,
        title,
        body,
        now: new Date().toISOString(),
        target: target.toISOString(),
        timeDiff,
        reason: skipReason,
      });
    }
  };

  const offset30Min = 30 * 60 * 1000;
  const thirtyMinBefore = new Date(deadlineTime - offset30Min);
  console.log("Now: ", now);
  console.log("deadline: ", deadline.toISOString());
  console.log("deadlineTimestamp: ", deadline.getTime());
  console.log("thirtyMinBefore: ", thirtyMinBefore);

  // Log scheduling attempt
  await logDebug("scheduleDeadlineNotifications", {
    gridId,
    now: new Date().toISOString(),
    deadline: deadline.toISOString(),
    deadlineTimestamp: deadline.getTime(),
    thirtyMinBefore: thirtyMinBefore.toISOString(),
  });

  await scheduleIfInFuture(
    thirtyMinBefore,
    "⏰ 30 minutes left!",
    "Only 30 minutes left to pick your Squares!"
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

  console.log("✅ Deadline notifications scheduled.");
};
