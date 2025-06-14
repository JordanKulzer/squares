import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebaseConfig";

export const registerPushToken = async (userId: string) => {
  console.log("🔔 Starting push token registration...");

  if (!Device.isDevice) {
    console.log("❌ Not a physical device — cannot register for push.");
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  console.log("🔒 Existing permission status:", existingStatus);

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log("🔄 Updated permission status:", finalStatus);
  }

  if (finalStatus !== "granted") {
    console.log("🚫 Push notification permission not granted");
    return;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log("📦 Got push token:", token);

  try {
    await updateDoc(doc(db, "users", userId), {
      pushToken: token,
    });
    console.log("✅ Push token saved to Firestore");
  } catch (err) {
    console.error("❌ Failed to save push token to Firestore:", err);
  }
};
