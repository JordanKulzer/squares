import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

const DEADLINE_NOTIFICATION_KEY = "deadlineNotificationIds";

export const scheduleDeadlineNotifications = async (deadline: Date) => {
  const now = new Date();
  const deadlineTime = deadline.getTime();

  if (deadlineTime <= now.getTime()) {
    console.warn("Deadline already passed. Skipping notifications.");
    return;
  }

  // Cancel previous deadline-related notifications only
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
    if (target.getTime() > Date.now()) {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: true },
        trigger: { date: target } as Notifications.NotificationTriggerInput,
      });
      scheduledIds.push(id);
    }
  };

  const testOffset = __DEV__ ? 10 * 1000 : 30 * 60 * 1000;
  const thirtyMinBefore = new Date(deadlineTime - testOffset);

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

  // Save the new IDs
  await AsyncStorage.setItem(
    DEADLINE_NOTIFICATION_KEY,
    JSON.stringify(scheduledIds)
  );

  console.log("✅ Deadline notifications scheduled.");
};
