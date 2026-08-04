import { type FirebaseApp, getApps, initializeApp } from 'firebase/app';

let _app: FirebaseApp | null = null;

export function getClientApp(): FirebaseApp {
  if (_app !== null) return _app;

  const existing = getApps();
  if (existing.length > 0) {
    _app = existing[0];
    return _app;
  }

  _app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  });

  return _app;
}
