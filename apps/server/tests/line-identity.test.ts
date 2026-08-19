/**
 * 整合測試：add-line-liff-identity 的 user_auth / 邀請連結 / bind code 行為。
 * 需先啟動 dev server（pnpm dev），預設打 http://localhost:3000，可用 TEST_BASE_URL 環境變數覆寫；
 * 需要一組可用的 Firebase 專案（.env 的 FIREBASE_* / VITE_FIREBASE_API_KEY 變數）。
 *
 * 未涵蓋：
 * - 真實 LINE Login 端到端流程（需要真實 LINE channel 與使用者互動，CI/本機測試環境無法取得
 *   有效簽章的 LIFF ID Token）。以下測試改以「無效 idToken」驗證各端點在簽章驗證失敗時的
 *   行為，以及邀請連結/bind code 在到達 LINE token 驗證之前就先擋下過期/已使用案例的邏輯。
 * - Google quick-register/登入/綁定 的端到端流程（需要真實 Google OAuth，理由同上）。
 */
import { afterAll, describe, expect, it } from 'vitest';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import '../../../scripts/load-root-env';
import { prefixCollection } from '../server/shared/firestore-prefix';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY;
const RUN_ID = Date.now().toString(36).slice(-5);

function testUsername(index: number) {
  return `li${RUN_ID}${index.toString(36)}`;
}

const app = initializeApp(
  {
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  },
  'line-identity-test',
);
const auth = getAuth(app);
const db = getFirestore(app);

const createdUsernames = new Set<string>();
const createdFirebaseUids = new Set<string>();
const inviteTokens = new Set<string>();
const bindCodes = new Set<string>();

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

async function registerTestUser(username: string): Promise<string> {
  createdUsernames.add(username);
  const created = await auth.createUser({});
  createdFirebaseUids.add(created.uid);
  const idToken = await mintIdToken(created.uid);

  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, username }),
  });
  if (res.status !== 200) throw new Error(`Failed to register test user: ${res.status}`);
  return created.uid;
}

async function seedInvite(overrides: {
  token: string;
  userId: string;
  expiresAt: string;
  usedAt: string | null;
}) {
  inviteTokens.add(overrides.token);
  await db.doc(`${prefixCollection('line_bind_invites')}/${overrides.token}`).set({
    token: overrides.token,
    userId: overrides.userId,
    expiresAt: overrides.expiresAt,
    usedAt: overrides.usedAt,
    createdAt: new Date().toISOString(),
  });
}

async function seedBindCode(overrides: {
  code: string;
  userId: string;
  expiresAt: string;
  usedAt: string | null;
}) {
  bindCodes.add(overrides.code);
  await db.doc(`${prefixCollection('line_bind_codes')}/${overrides.code}`).set({
    code: overrides.code,
    userId: overrides.userId,
    expiresAt: overrides.expiresAt,
    usedAt: overrides.usedAt,
    createdAt: new Date().toISOString(),
  });
}

afterAll(async () => {
  const usersCol = prefixCollection('users');
  for (const username of createdUsernames) {
    const snap = await db.collection(usersCol).where('username', '==', username).limit(1).get();
    if (snap.empty) continue;
    const userId = snap.docs[0].data().userId as string;
    await db.doc(`${usersCol}/${userId}`).delete();
    await db.doc(`${prefixCollection('user_roles')}/${userId}`).delete();
    await db.doc(`${prefixCollection('user_auth')}/password_${username}`).delete();
  }
  for (const uid of createdFirebaseUids) {
    await auth.deleteUser(uid).catch(() => {});
  }
  for (const token of inviteTokens) {
    await db.doc(`${prefixCollection('line_bind_invites')}/${token}`).delete();
  }
  for (const code of bindCodes) {
    await db.doc(`${prefixCollection('line_bind_codes')}/${code}`).delete();
  }
});

describe('username/password 註冊', () => {
  it('成功註冊會建立 user_auth(provider_type=password) 綁定', async () => {
    const username = testUsername(1);
    await registerTestUser(username);

    const doc = await db.doc(`${prefixCollection('user_auth')}/password_${username}`).get();
    expect(doc.exists).toBe(true);
    expect(doc.data()?.providerType).toBe('password');
    expect(doc.data()?.providerUserId).toBe(username);
  });

  it('重複的 username 註冊回傳 409', async () => {
    const username = testUsername(2);
    await registerTestUser(username);

    const created = await auth.createUser({});
    createdFirebaseUids.add(created.uid);
    const idToken = await mintIdToken(created.uid);

    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, username }),
    });
    expect(res.status).toBe(409);

    // 失敗註冊應清掉剛建立的孤兒 Firebase uid，不留下殘留帳號。
    await expect(auth.getUser(created.uid)).rejects.toThrow();
    createdFirebaseUids.delete(created.uid);
  });
});

describe('LINE ID Token 驗證', () => {
  it('無效的 LIFF ID Token → line-login 回傳 401', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/line-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'not-a-real-jwt' }),
    });
    expect(res.status).toBe(401);
  });
});

describe('LINE 綁定邀請連結', () => {
  it('已過期的邀請連結 → 400，且不會走到 LINE token 驗證', async () => {
    const token = `expired-${RUN_ID}`;
    await seedInvite({
      token,
      userId: 'irrelevant-user-id',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      usedAt: null,
    });

    const res = await fetch(`${BASE_URL}/api/auth/line-invite-activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, idToken: 'not-a-real-jwt' }),
    });
    expect(res.status).toBe(400);
  });

  it('已使用過的邀請連結 → 400', async () => {
    const token = `used-${RUN_ID}`;
    await seedInvite({
      token,
      userId: 'irrelevant-user-id',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      usedAt: new Date().toISOString(),
    });

    const res = await fetch(`${BASE_URL}/api/auth/line-invite-activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, idToken: 'not-a-real-jwt' }),
    });
    expect(res.status).toBe(400);
  });

  it('未過期、未使用的邀請連結會放行到 LINE token 驗證階段（此處因假 idToken 而 401）', async () => {
    const token = `valid-${RUN_ID}`;
    await seedInvite({
      token,
      userId: 'irrelevant-user-id',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      usedAt: null,
    });

    const res = await fetch(`${BASE_URL}/api/auth/line-invite-activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, idToken: 'not-a-real-jwt' }),
    });
    expect(res.status).toBe(401);

    // token 未成功綁定，理應仍未被標記為已使用。
    const doc = await db.doc(`${prefixCollection('line_bind_invites')}/${token}`).get();
    expect(doc.data()?.usedAt).toBeNull();
  });
});

describe('LINE 綁定 bind code', () => {
  it('已過期的 bind code → 400', async () => {
    const code = '000001';
    await seedBindCode({
      code,
      userId: 'irrelevant-user-id',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      usedAt: null,
    });

    const res = await fetch(`${BASE_URL}/api/auth/line-bind-code-activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, idToken: 'not-a-real-jwt' }),
    });
    expect(res.status).toBe(400);
  });

  it('已使用過的 bind code → 400', async () => {
    const code = '000002';
    await seedBindCode({
      code,
      userId: 'irrelevant-user-id',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      usedAt: new Date().toISOString(),
    });

    const res = await fetch(`${BASE_URL}/api/auth/line-bind-code-activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, idToken: 'not-a-real-jwt' }),
    });
    expect(res.status).toBe(400);
  });
});
