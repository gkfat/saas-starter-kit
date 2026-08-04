import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import 'dotenv/config';
import { Role, toSyntheticEmail } from '@saas-starter-kit/shared';

const username = process.env.SUPERADMIN_USERNAME;
const password = process.env.SUPERADMIN_PASSWORD;

if (!username || !password) {
  throw new Error('SUPERADMIN_USERNAME and SUPERADMIN_PASSWORD must be set in .env');
}

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const auth = getAuth(app);

(async () => {
  const email = toSyntheticEmail(username as string);

  const existing = await auth.getUserByEmail(email).catch(() => null);
  if (existing) {
    console.warn(`[SKIP] Superadmin already exists: ${username} (uid: ${existing.uid})`);
    process.exit(0);
  }

  const user = await auth.createUser({
    email,
    password,
    emailVerified: true,
    displayName: username,
  });
  await auth.setCustomUserClaims(user.uid, { role: Role.SuperAdmin });
  console.log(`[OK] Superadmin created: ${username} (uid: ${user.uid})`);
  console.log(
    'Superadmin has no Firestore user/user_auth doc — it authenticates purely via Firebase Auth custom claims.',
  );
})();
