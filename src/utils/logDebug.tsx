import { collection, addDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";

export const logDebug = async (tag: string, data: any) => {
  try {
    await addDoc(collection(db, "debugLogs"), {
      tag,
      data,
      timestamp: new Date(),
    });
  } catch (err) {
    // silently fail to avoid crashing the app
  }
};
