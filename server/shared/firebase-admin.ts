import { type App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function createAdminApp(): App {
  const config = useRuntimeConfig();
  const projectId = config.firebaseProjectId as string;
  const clientEmail = config.firebaseClientEmail as string;
  const privateKey = config.firebasePrivateKey as string;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin SDK env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY are all required.',
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });
}

const getAdminApp = createFirebaseSingleton(getApps, createAdminApp);

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());
