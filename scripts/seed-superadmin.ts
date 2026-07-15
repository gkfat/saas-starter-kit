import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import 'dotenv/config';
import { prefixCollection } from '../server/shared/firestore-prefix';
import { hashPassword } from '../server/shared/crypto';
import { Role } from '~/shared/roles';

const username = process.env.SUPERADMIN_USERNAME;
const password = process.env.SUPERADMIN_PASSWORD;

if (!username || !password) {
  throw new Error('SUPERADMIN_USERNAME and SUPERADMIN_PASSWORD must be set in .env');
}

const TENANT_ID = process.env.TENANT_ID ?? 'default';

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const auth = getAuth(app);
const db = getFirestore(app);

(async () => {
  const usersCol = `tenants/${TENANT_ID}/${prefixCollection('users')}`;

  // Check if Firestore doc with this username already exists
  const existing = await db.collection(usersCol).where('username', '==', username).limit(1).get();

  if (!existing.empty) {
    const uid = existing.docs[0].data().uid as string;
    console.warn(`[SKIP] Superadmin already exists: ${username} (uid: ${uid})`);
    process.exit(0);
  }

  const user = await auth.createUser({ displayName: username });
  const uid = user.uid;
  await auth.setCustomUserClaims(uid, { role: Role.SuperAdmin });
  console.log(`[OK] Superadmin Auth created: ${username} (uid: ${uid})`);

  const passwordHash = await hashPassword(password);

  await db.doc(`${usersCol}/${uid}`).set({
    uid,
    username,
    displayName: username,
    email: null,
    phone: null,
    providers: ['password'],
    passwordHash,
    tenantId: TENANT_ID,
    createdAt: new Date().toISOString(),
  });
  console.log(`[OK] Superadmin Firestore doc created: ${username}`);
})();
