// import { db } from "../firebaseConfig";
// import { collection, addDoc, Timestamp } from "firebase/firestore";

// // Define the Session type
// export interface Session {
//   name: string;
//   createdAt: Timestamp;
// }

// // Function to create a session
// export const createSession = async (
//   sessionName: string
// ): Promise<string | null> => {
//   try {
//     const docRef = await addDoc(collection(db, "sessions"), {
//       name: sessionName,
//       createdAt: Timestamp.now(),
//     });
//     console.log("Session created with ID:", docRef.id);
//     return docRef.id;
//   } catch (error) {
//     console.error("Error creating session:", error);
//     return null;
//   }
// };
