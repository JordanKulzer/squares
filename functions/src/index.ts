// import { onDocumentUpdated } from "firebase-functions/v2/firestore";
// import { initializeApp } from "firebase-admin/app";
// import { getFirestore, DocumentData } from "firebase-admin/firestore";
// import axios from "axios";

// // Initialize Firebase Admin SDK
// initializeApp();
// const db = getFirestore();

// interface NotificationPreferences {
//   quarterWin?: boolean;
//   quarterResults?: boolean;
//   playerJoined?: boolean;
// }

// interface UserData {
//   pushToken?: string;
//   notificationPreferences?: NotificationPreferences;
//   username?: string;
// }

// // 🔔 Helper to send push notifications via Expo
// const sendExpoPush = async (
//   token: string,
//   title: string,
//   body: string
// ): Promise<void> => {
//   await axios.post("https://exp.host/--/api/v2/push/send", {
//     to: token,
//     sound: "default",
//     title,
//     body,
//   });
// };

// // ✅ 1. Notify user when they win a quarter
// export const notifyQuarterWin = onDocumentUpdated(
//   "squares/{gridId}",
//   async (event) => {
//     const before = event.data?.before?.data() as DocumentData | undefined;
//     const after = event.data?.after?.data() as DocumentData | undefined;
//     if (!before || !after) return;

//     const beforeWinners = before.quarterWinners || [];
//     const afterWinners = after.quarterWinners || [];

//     if (JSON.stringify(beforeWinners) === JSON.stringify(afterWinners)) return;

//     for (const win of afterWinners) {
//       const userDoc = await db.collection("users").doc(win.userId).get();
//       const user = userDoc.data() as UserData;
//       if (!user?.pushToken || !user.notificationPreferences?.quarterWin)
//         continue;

//       await sendExpoPush(
//         user.pushToken,
//         "🎉 You Won!",
//         `You won the ${win.quarter} quarter!`
//       );
//     }
//   }
// );

// // ✅ 2. Notify all users who opted in about quarter results
// export const notifyQuarterResults = onDocumentUpdated(
//   "squares/{gridId}",
//   async (event) => {
//     const before = event.data?.before?.data() as DocumentData | undefined;
//     const after = event.data?.after?.data() as DocumentData | undefined;
//     if (!before || !after) return;

//     const beforeWinners = before.quarterWinners || [];
//     const afterWinners = after.quarterWinners || [];

//     if (JSON.stringify(beforeWinners) === JSON.stringify(afterWinners)) return;

//     for (const win of afterWinners) {
//       const usersSnap = await db.collection("users").get();
//       for (const userDoc of usersSnap.docs) {
//         const user = userDoc.data() as UserData;
//         if (!user.pushToken || !user.notificationPreferences?.quarterResults)
//           continue;

//         await sendExpoPush(
//           user.pushToken,
//           "🏆 Quarter Results",
//           `Winner of ${win.quarter}: ${win.username}`
//         );
//       }
//     }
//   }
// );

// // ✅ 3. Notify the square owner when someone joins
// export const notifyPlayerJoined = onDocumentUpdated(
//   "squares/{gridId}",
//   async (event) => {
//     const before = event.data?.before?.data() as DocumentData | undefined;
//     const after = event.data?.after?.data() as DocumentData | undefined;
//     if (!before || !after) return;

//     const beforePlayers = before.playerIds || [];
//     const afterPlayers = after.playerIds || [];

//     if (afterPlayers.length <= beforePlayers.length) return;

//     const ownerId = after.createdBy;
//     const ownerDoc = await db.collection("users").doc(ownerId).get();
//     const owner = ownerDoc.data() as UserData;

//     if (!owner?.pushToken || !owner.notificationPreferences?.playerJoined)
//       return;

//     await sendExpoPush(
//       owner.pushToken,
//       "👥 New Player",
//       `Someone just joined your session: ${after.title}`
//     );
//   }
// );
