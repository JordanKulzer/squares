import * as Notifications from "expo-notifications";

/**
 * Schedules 2 local notifications:
 * - 30 minutes before the deadline
 * - Exactly at the deadline
 */
export const scheduleDeadlineNotifications = async (deadline: Date) => {
  const now = new Date();
  const deadlineTime = deadline.getTime();

  if (deadlineTime <= now.getTime()) {
    console.warn("Deadline already passed. Skipping notifications.");
    return;
  }

  const scheduleIfInFuture = async (
    target: Date,
    title: string,
    body: string
  ) => {
    const secondsUntil = Math.floor((target.getTime() - Date.now()) / 1000);

    if (secondsUntil > 0) {
      await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: true },
        trigger: {
          type: "timeInterval",
          seconds: secondsUntil,
          repeats: false,
        } as Notifications.NotificationTriggerInput, // ✅ this cast resolves type conflict
      });
    }
  };

  const thirtyMinBefore = new Date(deadlineTime - 30 * 60 * 1000);

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

  console.log("✅ Deadline notifications scheduled.");
};
