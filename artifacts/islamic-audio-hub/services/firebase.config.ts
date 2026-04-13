import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:            "AIzaSyDi6rtNdie2ueJPYC2fWgHiM6AG-ao8RMo",
  authDomain:        "bismillah-573d3.firebaseapp.com",
  projectId:         "bismillah-573d3",
  storageBucket:     "bismillah-573d3.firebasestorage.app",
  messagingSenderId: "282242582668",
  appId:             "1:282242582668:web:55658acd7c0d649c2f93a9",
  measurementId:     "G-0RZ46VYWX2",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db      = getFirestore(app);
export const storage = getStorage(app);
export default app;
