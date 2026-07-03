import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const runtimeConfig = window.FIREBASE_CONFIG ?? {};
const environmentConfig =
  import.meta.env.MODE === "distribution"
    ? {}
    : {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      };

const firebaseConfig = {
  apiKey: runtimeConfig.apiKey || environmentConfig.apiKey,
  authDomain: runtimeConfig.authDomain || environmentConfig.authDomain,
  projectId: runtimeConfig.projectId || environmentConfig.projectId,
  storageBucket: runtimeConfig.storageBucket || environmentConfig.storageBucket,
  messagingSenderId:
    runtimeConfig.messagingSenderId || environmentConfig.messagingSenderId,
  appId: runtimeConfig.appId || environmentConfig.appId,
};

export const missingFirebaseConfigKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const isFirebaseConfigured = missingFirebaseConfigKeys.length === 0;

export const firebaseApp: FirebaseApp | null = isFirebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
export const db: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;
