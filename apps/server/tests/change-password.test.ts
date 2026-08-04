/**
 * 整合測試：add-line-liff-identity 新增的「個人中心變更密碼」（`PATCH /api/profile/password`）。
 * 需先啟動 dev server（pnpm dev），預設打 http://localhost:3000，可用 TEST_BASE_URL 環境變數覆寫；
 * 需要一組可用的 Firebase 專案（.env 的 FIREBASE_* / VITE_FIREBASE_API_KEY 變數）。
 */
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { config as loadEnv } from 'dotenv';
import { prefixCollection } from '../server/shared/firestore-prefix';
import { toSyntheticEmail } from '@saas-starter-kit/shared';

loadEnv({ path: resolve(import.meta.dirname, '../../../.env') });

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY;
const RUN_ID = Date.now().toString(36).slice(-5);

function testUsername(index: number) {
  return `cp${RUN_ID}${index.toString(36)}`;
}

const app = initializeApp(
  {
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  },
  'change-password-test',
);
const auth = getAuth(app);
const db = getFirestore(app);

const createdUsernames = new Set<string>();
const createdFirebaseUids = new Set<string>();
const createdUserIds = new Set<string>();

async function mintIdToken(uid: string): Promise<string> {
  const customToken = await auth.createCustomToken(uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  const data = (await res.json()) as { idToken?: string };
  if (!data.idToken) throw new Error('Failed to mint idToken for test uid');
  return data.idToken;
}

async function signInWithPassword(email: string, password: string): Promise<string | null> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const data = (await res.json()) as { idToken?: string };
  return data.idToken ?? null;
}

/** 註冊一個帶真實密碼的 username/password 帳號，回傳帶有 custom claims 的 idToken（供 Authorization 用）。 */
async function registerPasswordUser(
  username: string,
  password: string,
): Promise<{ uid: string; idToken: string }> {
  createdUsernames.add(username);
  const email = toSyntheticEmail(username);

  const signUpRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const signUpData = (await signUpRes.json()) as { idToken?: string; localId?: string };
  if (!signUpData.idToken || !signUpData.localId) {
    throw new Error('Failed to create test Firebase user with password');
  }
  createdFirebaseUids.add(signUpData.localId);

  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: signUpData.idToken, username }),
  });
  if (res.status !== 200) throw new Error(`Failed to register test user: ${res.status}`);

  // custom claims 是在 register 完成後才寫入，需重新登入換一個帶 claims 的 idToken。
  const idToken = await signInWithPassword(email, password);
  if (!idToken) throw new Error('Failed to re-authenticate test user after registration');

  return { uid: signUpData.localId, idToken };
}

/** 直接在 Firestore 造一個「LINE-only」帳號（無 password provider），比照 registerUserWithProvider 的資料形狀。 */
async function seedLineOnlyUser(username: string): Promise<{ userId: string; idToken: string }> {
  createdUsernames.add(username);
  const userId = randomUUID();
  createdUserIds.add(userId);

  const created = await auth.createUser({});
  createdFirebaseUids.add(created.uid);
  await auth.setCustomUserClaims(created.uid, { userId });

  await db.doc(`${prefixCollection('user_auth')}/line_${userId}`).set({
    userId,
    providerType: 'line',
    providerUserId: `line-test-${userId}`,
    firebaseUid: created.uid,
    createdAt: new Date().toISOString(),
  });

  await db.doc(`${prefixCollection('users')}/${userId}`).set({
    userId,
    username,
    displayName: username,
    email: null,
    phone: null,
    passwordSetupPending: false,
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
  });

  await db.doc(`${prefixCollection('user_roles')}/${userId}`).set({ role: 'member' });

  const idToken = await mintIdToken(created.uid);
  return { userId, idToken };
}

afterAll(async () => {
  const usersCol = prefixCollection('users');
  for (const uname of createdUsernames) {
    const snap = await db.collection(usersCol).where('username', '==', uname).limit(1).get();
    if (snap.empty) continue;
    const userId = snap.docs[0].data().userId as string;
    await db.doc(`${usersCol}/${userId}`).delete();
    await db.doc(`${prefixCollection('user_roles')}/${userId}`).delete();
    await db.doc(`${prefixCollection('user_auth')}/password_${uname}`).delete();
  }
  for (const userId of createdUserIds) {
    await db.doc(`${prefixCollection('user_auth')}/line_${userId}`).delete();
  }
  for (const uid of createdFirebaseUids) {
    await auth.deleteUser(uid).catch(() => {});
  }
});

describe('已有密碼帳號變更密碼', () => {
  it('目前密碼正確 → 200，且新密碼可登入、舊密碼失效', async () => {
    const uname = testUsername(1);
    const { idToken } = await registerPasswordUser(uname, 'oldpass1');

    const res = await fetch(`${BASE_URL}/api/profile/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ newPassword: 'newpass2', currentIdToken: idToken }),
    });
    expect(res.status).toBe(200);

    const email = toSyntheticEmail(uname);
    expect(await signInWithPassword(email, 'newpass2')).toBeTruthy();
    expect(await signInWithPassword(email, 'oldpass1')).toBeNull();
  });

  it('目前密碼驗證失敗（無效 currentIdToken）→ 401，密碼不變', async () => {
    const uname = testUsername(2);
    const { idToken } = await registerPasswordUser(uname, 'oldpass1');

    const res = await fetch(`${BASE_URL}/api/profile/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ newPassword: 'newpass2', currentIdToken: 'not-a-real-jwt' }),
    });
    expect(res.status).toBe(401);

    const email = toSyntheticEmail(uname);
    expect(await signInWithPassword(email, 'oldpass1')).toBeTruthy();
  });

  it('未帶 currentIdToken → 400', async () => {
    const uname = testUsername(3);
    const { idToken } = await registerPasswordUser(uname, 'oldpass1');

    const res = await fetch(`${BASE_URL}/api/profile/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ newPassword: 'newpass2' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('尚無密碼的帳號（LINE-only）設定密碼', () => {
  it('直接帶新密碼 → 200，建立 user_auth(provider=password) 且可用帳密登入', async () => {
    const uname = testUsername(4);
    const { userId, idToken } = await seedLineOnlyUser(uname);

    const res = await fetch(`${BASE_URL}/api/profile/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ newPassword: 'brandnew1' }),
    });
    expect(res.status).toBe(200);

    const doc = await db.doc(`${prefixCollection('user_auth')}/password_${uname}`).get();
    expect(doc.exists).toBe(true);
    expect(doc.data()?.userId).toBe(userId);

    expect(await signInWithPassword(toSyntheticEmail(uname), 'brandnew1')).toBeTruthy();
  });
});
