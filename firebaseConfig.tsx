import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// 🔹 Replace these with your actual Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyAWi7oX2D6U5aBD2TfYgkzBoXemYs_6Nqs",
  authDomain: "squares-41599.firebaseapp.com",
  projectId: "squares-41599",
  storageBucket: "squares-41599.firebasestorage.app",
  messagingSenderId: "1097299144914",
  appId: "1:1097299144914:web:df9503fbfda1fe1e597d0b",
  measurementId: "G-FHSK52HHDZ",
};

// 🔹 Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
