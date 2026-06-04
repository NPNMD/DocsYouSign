import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAiDpekC9-NhsGaxQ7bGFT0nrmmGVPSSl4",
  authDomain: "docsyousign.firebaseapp.com",
  projectId: "docsyousign",
  storageBucket: "docsyousign.firebasestorage.app",
  messagingSenderId: "882861116793",
  appId: "1:882861116793:web:50496a0a0e0c1b76bd33a8",
  measurementId: "G-NKWVXPXHQ3",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) getAnalytics(app);
  });
}

export default app;
