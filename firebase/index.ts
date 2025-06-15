import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, indexedDBLocalPersistence } from 'firebase/auth';
import { firebaseConfig } from './config';

import type { Auth } from 'firebase/auth';

let auth: Auth;

try {
  if (
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  ) {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    if (typeof window !== 'undefined') {
      setPersistence(auth, indexedDBLocalPersistence).catch(() => {});
    }
  } else {
    // Provide an empty object during build when env vars are missing
    auth = {} as Auth;
  }
} catch {
  auth = {} as Auth;
}

export { auth };
