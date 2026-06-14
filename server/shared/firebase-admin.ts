import { type App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let _app: App | null = null;

function getAdminApp(): App {
  if (_app) return _app;

  const existing = getApps();
  if (existing.length > 0) {
    _app = existing[0];
    return _app;
  }

  const config = useRuntimeConfig();

  _app = initializeApp({
    credential: cert({
      projectId: config.firebaseProjectId as string,
      clientEmail: config.firebaseClientEmail as string,
      privateKey: (config.firebasePrivateKey as string)?.replace(/\\n/g, '\n'),
    }),
  });

  return _app;
}

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());
