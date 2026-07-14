import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import 'dotenv/config';
import { prefixCollection } from '../server/shared/firestore-prefix';

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const auth = getAuth(app);
const db = getFirestore(app);
const TENANT_ID = process.env.TENANT_ID ?? 'default';

const DEMO_USERS = [
  {
    email: 'admin@demo.com',
    password: 'demo1234',
    displayName: 'Demo Admin',
    role: 'admin',
  },
  {
    email: 'member@demo.com',
    password: 'demo1234',
    displayName: 'Demo Member',
    role: 'member',
  },
];

async function upsertDemoUser(user: (typeof DEMO_USERS)[number]) {
  let uid: string;

  try {
    const existing = await auth.getUserByEmail(user.email);
    uid = existing.uid;
    console.log(`[SKIP] Auth user already exists: ${user.email} (uid: ${uid})`);
  } catch (err: unknown) {
    if ((err as { code?: string }).code !== 'auth/user-not-found') throw err;
    const created = await auth.createUser({
      email: user.email,
      password: user.password,
      displayName: user.displayName,
    });
    uid = created.uid;
    console.log(`[OK] Auth user created: ${user.email} (uid: ${uid})`);
  }

  const base = `tenants/${TENANT_ID}`;
  const batch = db.batch();

  batch.set(db.doc(`${base}/${prefixCollection('users')}/${uid}`), {
    uid,
    tenantId: TENANT_ID,
    email: user.email,
    displayName: user.displayName,
    createdAt: new Date().toISOString(),
  });

  batch.set(db.doc(`${base}/${prefixCollection('user_roles')}/${uid}`), {
    role: user.role,
  });

  await batch.commit();
  console.log(`[OK] Firestore upserted: ${user.email} → role: ${user.role}`);
}

(async () => {
  for (const user of DEMO_USERS) {
    await upsertDemoUser(user);
  }
  console.log('Demo users seed done.');
})();
