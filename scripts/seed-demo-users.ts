import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import 'dotenv/config';
import { prefixCollection } from '../apps/server/server/shared/firestore-prefix';
import { hashPassword } from '../apps/server/server/shared/crypto';
import { Role } from '@saas-starter-kit/shared';

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

async function upsertDemoUser(user: (typeof DEMO_USERS)[number]) {
  const usersCol = prefixCollection('users');

  // Check if Firestore doc with this username already exists
  const existing = await db
    .collection(usersCol)
    .where('username', '==', user.username)
    .limit(1)
    .get();

  let uid: string;

  if (!existing.empty) {
    uid = existing.docs[0].data().uid as string;
    console.log(`[SKIP] Firestore user already exists: ${user.username} (uid: ${uid})`);
  } else {
    const created = await auth.createUser({ displayName: user.displayName });
    uid = created.uid;
    console.log(`[OK] Auth user created: ${user.username} (uid: ${uid})`);
  }

  const passwordHash = await hashPassword(user.password);
  const batch = db.batch();

  batch.set(db.doc(`${usersCol}/${uid}`), {
    uid,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    phone: user.phone,
    providers: ['password'],
    passwordHash,
    createdAt: new Date().toISOString(),
  });

  batch.set(db.doc(`${prefixCollection('user_roles')}/${uid}`), {
    role: user.role,
  });

  await batch.commit();
  console.log(`[OK] Firestore upserted: ${user.username} → role: ${user.role}`);
}

(async () => {
  for (const user of DEMO_USERS) {
    await upsertDemoUser(user);
  }
  console.log('Demo users seed done.');
})();
