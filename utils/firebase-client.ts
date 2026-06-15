import { type FirebaseApp, getApps, initializeApp } from 'firebase/app';

let _app: FirebaseApp | null = null;

export function getClientApp(): FirebaseApp {
  if (import.meta.server) {
    throw new Error('getClientApp() is browser-only and cannot be called on the server.');
  }

  if (_app !== null) return _app;

  const existing = getApps();
  if (existing.length > 0) {
    _app = existing[0];
    return _app;
  }

  const config = useRuntimeConfig();

  _app = initializeApp({
    apiKey: config.public.firebaseApiKey as string,
    authDomain: config.public.firebaseAuthDomain as string,
    projectId: config.public.firebaseProjectId as string,
    storageBucket: config.public.firebaseStorageBucket as string,
    messagingSenderId: config.public.firebaseMessagingSenderId as string,
    appId: config.public.firebaseAppId as string,
  });

  return _app;
}
