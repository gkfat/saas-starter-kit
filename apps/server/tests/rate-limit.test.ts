/**
 * 整合測試：驗證 add-auth-rate-limiting 的限流行為（server/modules/rate-limit）。
 * 需先啟動 dev server（pnpm dev），預設打 http://localhost:3000，可用 TEST_BASE_URL 環境變數覆寫；
 * 需要一組可用的 Firebase 專案（.env 的 FIREBASE_* / VITE_FIREBASE_API_KEY 變數）。
 *
 * 注意：環境變數不可命名為 BASE_URL —— Vite 會將 `process.env.BASE_URL` 靜態替換為
 * build base path（預設 '/'），導致此變數永遠無法被 .env 或 shell 覆寫。
 *
 * add-line-liff-identity 之後，密碼驗證改由 Firebase 原生 signInWithEmailAndPassword
 * 於 client 端完成，/api/auth/login 只接收已驗證的 idToken，伺服器端不再能辨識「這次是哪個
 * 帳號密碼打錯」，因此帳號維度的鎖定機制已移除，只保留 IP 維度限流（見 02.rate-limit.ts）。
 *
 * 未涵蓋：
 * - 登入頁鎖定警示文案（需瀏覽器操作）
 */
import { resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { config as loadEnv } from 'dotenv';
import { prefixCollection } from '../server/shared/firestore-prefix';

loadEnv({ path: resolve(import.meta.dirname, '../../../.env') });

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY;
// username/password 需為 6–8 碼英數字（見 packages/shared/utils/validation.ts），故 RUN_ID 取 5 碼 + 1 碼序號後綴
const RUN_ID = Date.now().toString(36).slice(-5);

function testUsername(index: number) {
  return `${RUN_ID}${index.toString(36)}`;
}

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});
const auth = getAuth(app);
const db = getFirestore(app);

const createdUsernames = new Set<string>();
const createdFirebaseUids = new Set<string>();
const rateLimitKeys = new Set<string>();

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

async function register(username: string, ip: string) {
  createdUsernames.add(username);
  rateLimitKeys.add(`register:ip:${ip}`);

  const created = await auth.createUser({});
  createdFirebaseUids.add(created.uid);
  const idToken = await mintIdToken(created.uid);

  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
    body: JSON.stringify({ idToken, username }),
  });
  return { res, uid: created.uid };
}

async function loginWithGarbageToken(ip: string) {
  rateLimitKeys.add(`login:ip:${ip}`);
  return fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
    body: JSON.stringify({ provider: 'password', idToken: 'not-a-real-token' }),
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

  const rateLimitsCol = prefixCollection('rate_limits');
  await Promise.all(
    [...rateLimitKeys].map((key) =>
      db
        .doc(`${rateLimitsCol}/${key}`)
        .delete()
        .catch(() => {}),
    ),
  );
});

describe('auth rate limiting', () => {
  it('register 同一 IP 超過 10 次/小時 → 第 11 次回傳 429', async () => {
    const ip = '10.1.0.1';
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuses.push((await register(testUsername(i), ip)).res.status);
    }
    expect(statuses.slice(0, 10)).not.toContain(429);
    expect(statuses[10]).toBe(429);
  });

  it('login 同一 IP 超過 5 次/15 分鐘 → 第 6 次回傳 429', async () => {
    const ip = '10.2.0.1';
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await loginWithGarbageToken(ip)).status);
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses[5]).toBe(429);
  });

  it('login 成功後重置該 IP 的失敗計數', async () => {
    const ip = '10.3.0.1';
    const username = testUsername(99);

    const { res: regRes, uid } = await register(username, ip);
    expect(regRes.status).toBe(200);
    rateLimitKeys.add(`login:ip:${ip}`);

    // 重新對同一個（已註冊、已有 custom claims）uid 簽發一組 idToken，模擬後續登入。
    const idToken = await mintIdToken(uid);
    const successRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify({ provider: 'password', idToken }),
    });
    expect(successRes.status).toBe(200);

    const afterRes = await loginWithGarbageToken(ip);
    expect(afterRes.status).toBe(401);
  });
});
