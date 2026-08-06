import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDMmmAPevhrwUdDd5izbDa1BcgalKOUodM",
  authDomain: "site-invitation-d7e6f.firebaseapp.com",
  projectId: "site-invitation-d7e6f",
  storageBucket: "site-invitation-d7e6f.firebasestorage.app",
  messagingSenderId: "959058589916",
  appId: "1:959058589916:web:089d01d9357d85e3a65c19",
  measurementId: "G-NT2XPBJ1GW"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let analytics = null;
if (typeof window !== "undefined" && import.meta.env.PROD) {
  analytics = getAnalytics(app);
}

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, analytics };
export { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
