import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAWi7oX2D6U5aBD2TfYgkzBoXemYs_6Nqs",
  authDomain: "squares-41599.firebaseapp.com",
  projectId: "squares-41599",
  storageBucket: "squares-41599.appspot.com",
  messagingSenderId: "1097299144914",
  appId: "1:1097299144914:web:df9503fbfda1fe1e597d0b",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Set persistence (only once)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("Auth persistence error:", error);
});

export { app, auth, db };
