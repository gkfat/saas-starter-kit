import { randomUUID } from 'crypto';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import 'dotenv/config';
import { prefixCollection } from '../apps/server/server/shared/firestore-prefix';
import { Role, toSyntheticEmail } from '@saas-starter-kit/shared';

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const auth = getAuth(app);
const db = getFirestore(app);

const DEMO_USERS = [
  {
    username: 'demoadmin',
    password: 'demo1234',
    displayName: 'Demo Admin',
    email: 'admin@demo.com',
    phone: null,
    role: Role.Admin,
  },
  {
    username: 'demomember',
    password: 'demo1234',
    displayName: 'Demo Member',
    email: null,
    phone: null,
    role: Role.Member,
  },
];

async function upsertDemoUser(demo: (typeof DEMO_USERS)[number]) {
  const usersCol = prefixCollection('users');
  const userAuthCol = prefixCollection('user_auth');
  const authDocId = `password_${demo.username}`;

  const existingAuth = await db.doc(`${userAuthCol}/${authDocId}`).get();
  if (existingAuth.exists) {
    console.log(`[SKIP] Demo user already exists: ${demo.username}`);
    return;
  }

  const firebaseUser = await auth.createUser({
    email: toSyntheticEmail(demo.username),
    password: demo.password,
    emailVerified: true,
    displayName: demo.displayName,
  });

  const userId = randomUUID();
  const batch = db.batch();

  batch.set(db.doc(`${usersCol}/${userId}`), {
    userId,
    username: demo.username,
    displayName: demo.displayName,
    email: demo.email,
    phone: demo.phone,
    passwordSetupPending: false,
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
  });

  batch.set(db.doc(`${userAuthCol}/${authDocId}`), {
    userId,
    providerType: 'password',
    providerUserId: demo.username,
    firebaseUid: firebaseUser.uid,
    createdAt: new Date().toISOString(),
  });

  batch.set(db.doc(`${prefixCollection('user_roles')}/${userId}`), {
    role: demo.role,
  });

  await batch.commit();
  await auth.setCustomUserClaims(firebaseUser.uid, { userId });

  console.log(`[OK] Demo user created: ${demo.username} (userId: ${userId}) → role: ${demo.role}`);
}

(async () => {
  for (const user of DEMO_USERS) {
    await upsertDemoUser(user);
  }
  console.log('Demo users seed done.');
})();
