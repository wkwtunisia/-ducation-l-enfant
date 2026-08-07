import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDMmmAPevhrwUdDd5izbDa1BcgalKOUodM",
  authDomain: "site-invitation-d7e6f.firebaseapp.com",
  projectId: "site-invitation-d7e6f",
  storageBucket: "site-invitation-d7e6f.firebasestorage.app",
  messagingSenderId: "959058589916",
  appId: "1:959058589916:web:089d01d9357d85e3a65c19",
  measurementId: "G-NT2XPBJ1GW",
};

// Initialisation
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
let analytics = null;
if (typeof window !== "undefined" && import.meta.env.PROD) {
  analytics = getAnalytics(app);
}
const auth = getAuth(app);
const db = getFirestore(app);

// Exports principaux
export { app, auth, db, analytics };

// Exports d'authentification
export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
};

// ----- Gestion des notes (étoiles) -----
export const rateStory = async (storyId, rating) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Non authentifié");
  const ratingRef = doc(db, "ratings", `${storyId}_${user.uid}`);
  await setDoc(ratingRef, {
    storyId,
    uid: user.uid,
    rating,
    createdAt: serverTimestamp(),
  });
};

export const getStoryRating = async (storyId) => {
  const q = query(collection(db, "ratings"), where("storyId", "==", storyId));
  const snap = await getDocs(q);
  const ratings = snap.docs.map((d) => d.data().rating);
  if (ratings.length === 0) return 0;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
};

export const getUserRatingForStory = async (storyId) => {
  const user = auth.currentUser;
  if (!user) return null;
  const ratingRef = doc(db, "ratings", `${storyId}_${user.uid}`);
  const snap = await getDoc(ratingRef);
  return snap.exists() ? snap.data().rating : null;
};

// ----- Gestion des favoris -----
export const toggleFavorite = async (storyId) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Non authentifié");
  const favRef = doc(db, "favorites", user.uid);
  const favDoc = await getDoc(favRef);
  if (favDoc.exists()) {
    const favs = favDoc.data().storyIds || [];
    if (favs.includes(storyId)) {
      await updateDoc(favRef, { storyIds: arrayRemove(storyId) });
    } else {
      await updateDoc(favRef, { storyIds: arrayUnion(storyId) });
    }
  } else {
    await setDoc(favRef, { storyIds: [storyId] });
  }
};

export const getFavorites = async () => {
  const user = auth.currentUser;
  if (!user) return [];
  const favRef = doc(db, "favorites", user.uid);
  const favDoc = await getDoc(favRef);
  return favDoc.exists() ? favDoc.data().storyIds : [];
};

// ----- Gestion des badges -----
export const awardBadge = async (badgeName) => {
  const user = auth.currentUser;
  if (!user) return;
  const badgeRef = doc(db, "badges", user.uid);
  const badgeDoc = await getDoc(badgeRef);
  if (badgeDoc.exists()) {
    const badges = badgeDoc.data().badges || [];
    if (!badges.includes(badgeName)) {
      await updateDoc(badgeRef, { badges: arrayUnion(badgeName) });
    }
  } else {
    await setDoc(badgeRef, { badges: [badgeName] });
  }
};

export const getUserBadges = async () => {
  const user = auth.currentUser;
  if (!user) return [];
  const badgeRef = doc(db, "badges", user.uid);
  const badgeDoc = await getDoc(badgeRef);
  return badgeDoc.exists() ? badgeDoc.data().badges : [];
};

// ----- Gestion des utilisateurs (admin) -----
export const getAllUsers = async () => {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const createUserDocument = async (user) => {
  if (!user) return;
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || "",
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });
  } else {
    await updateDoc(userRef, { lastLogin: serverTimestamp() });
  }
};

// ----- Compteur de lectures -----
export const incrementReadCount = async (storyId) => {
  const user = auth.currentUser;
  if (!user) return;
  const readRef = doc(db, "reads", user.uid);
  const readDoc = await getDoc(readRef);
  if (readDoc.exists()) {
    const readStories = readDoc.data().storyIds || [];
    if (!readStories.includes(storyId)) {
      await updateDoc(readRef, {
        storyIds: arrayUnion(storyId),
        count: increment(1),
      });
    }
  } else {
    await setDoc(readRef, { storyIds: [storyId], count: 1 });
  }
};

export const getReadCount = async () => {
  const user = auth.currentUser;
  if (!user) return 0;
  const readRef = doc(db, "reads", user.uid);
  const readDoc = await getDoc(readRef);
  return readDoc.exists() ? readDoc.data().count || 0 : 0;
};
