import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import 'dotenv/config';

const email = process.env.SUPERADMIN_EMAIL;
const password = process.env.SUPERADMIN_PASSWORD;

if (!email || !password) {
  throw new Error('SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set in .env');
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
  try {
    const existing = await auth.getUserByEmail(email);
    const role = (existing.customClaims ?? {})['role'];

    if (role === 'superadmin') {
      console.warn(`[SKIP] Superadmin already exists: ${email}`);
      process.exit(0);
    }

    throw new Error(
      `Account ${email} exists but role is "${role ?? 'none'}", not superadmin. Aborting to prevent overwrite.`,
    );
  } catch (err: unknown) {
    if ((err as { code?: string }).code !== 'auth/user-not-found') throw err;
  }

  const user = await auth.createUser({ email, password });
  await auth.setCustomUserClaims(user.uid, { role: 'superadmin' });
  console.log(`[OK] Superadmin created: ${email} (uid: ${user.uid})`);
})();
