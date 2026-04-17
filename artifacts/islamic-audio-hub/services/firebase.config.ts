import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey:            "AIzaSyDi6rtNdie2ueJPYC2fWgHiM6AG-ao8RMo",
  authDomain:        "bismillah-573d3.firebaseapp.com",
  projectId:         "bismillah-573d3",
  storageBucket:     "bismillah-573d3.firebasestorage.app",
  messagingSenderId: "282242582668",
  appId:             "1:282242582668:web:55658acd7c0d649c2f93a9",
  measurementId:     "G-0RZ46VYWX2",
};

const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db      = getFirestore(app);
export const storage = getStorage(app);
export const auth    = getAuth(app);
export default app;

// ─── Admin credentials ────────────────────────────────────────────────────────
const ADMIN_EMAIL    = "admin@example.com";
const ADMIN_PASSWORD = "123456";

// ─── ensureAdminSignedIn ──────────────────────────────────────────────────────
// Signs in silently with admin credentials before Firebase Storage operations.
// Firebase Storage security rules typically require request.auth != null, so
// uploads will fail with storage/unauthorized if no user is signed in.
//
// This is safe to call multiple times — it short-circuits if already signed in.

let _signInPromise: Promise<User> | null = null;

export async function ensureAdminSignedIn(): Promise<User> {
  // If already signed in, return immediately
  if (auth.currentUser) {
    console.log("[Auth] Already signed in as:", auth.currentUser.email);
    return auth.currentUser;
  }

  // Deduplicate concurrent calls — only one sign-in attempt at a time
  if (_signInPromise) return _signInPromise;

  _signInPromise = signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)
    .then(cred => {
      console.log("[Auth] ✅ Signed in as:", cred.user.email);
      _signInPromise = null;
      return cred.user;
    })
    .catch(e => {
      _signInPromise = null;
      console.warn("[Auth] ⚠️ Sign-in failed:", e.code, e.message);
      throw e;
    });

  return _signInPromise;
}

// ─── Auto sign-in on app start ────────────────────────────────────────────────
// Try immediately so the token is ready before the user hits "Upload"
onAuthStateChanged(auth, user => {
  if (!user) {
    signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)
      .then(c => console.log("[Auth] 🔑 Auto signed in:", c.user.email))
      .catch(e => console.warn("[Auth] ⚠️ Auto sign-in failed (check Firebase Auth console):", e.code));
  }
});
