/**
 * 整合測試：驗證 add-auth-rate-limiting 的限流行為（server/modules/rate-limit）。
 * 需先啟動 dev server（pnpm dev），預設打 http://localhost:3000，可用 TEST_BASE_URL 環境變數覆寫；
 * 需要一組可用的 Firebase 專案（.env 的 FIREBASE_* 變數）。
 *
 * 注意：環境變數不可命名為 BASE_URL —— Vite 會將 `process.env.BASE_URL` 靜態替換為
 * build base path（預設 '/'），導致此變數永遠無法被 .env 或 shell 覆寫。
 *
 * 未涵蓋：
 * - 登入頁鎖定警示文案（需瀏覽器操作）
 */
import { afterAll, describe, expect, it } from 'vitest';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import 'dotenv/config';
import { prefixCollection } from '../server/shared/firestore-prefix';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
// username/password 需為 6–8 碼英數字（見 shared/utils/validation.ts），故 RUN_ID 取 5 碼 + 1 碼序號後綴
const RUN_ID = Date.now().toString(36).slice(-5);
const TEST_PASSWORD = 'Test1234';

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
const rateLimitKeys = new Set<string>();

async function register(username: string, ip: string) {
  createdUsernames.add(username);
  rateLimitKeys.add(`register:ip:${ip}`);
  return fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
    body: JSON.stringify({ username, password: TEST_PASSWORD }),
  });
}

async function loginPassword(identifier: string, password: string, ip: string) {
  rateLimitKeys.add(`login:ip:${ip}`);
  rateLimitKeys.add(`login:account:${identifier}`);
  return fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
    body: JSON.stringify({ provider: 'password', identifier, password }),
  });
}

async function loginGoogle(ip: string) {
  return fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
    body: JSON.stringify({ provider: 'google', idToken: 'invalid-token' }),
  });
}

afterAll(async () => {
  const usersCol = prefixCollection('users');
  for (const username of createdUsernames) {
    const snap = await db.collection(usersCol).where('username', '==', username).limit(1).get();
    if (snap.empty) continue;
    const uid = snap.docs[0].data().uid as string;
    await db.doc(`${usersCol}/${uid}`).delete();
    await db.doc(`${prefixCollection('user_roles')}/${uid}`).delete();
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
      statuses.push((await register(testUsername(i), ip)).status);
    }
    expect(statuses.slice(0, 10)).not.toContain(429);
    expect(statuses[10]).toBe(429);
  });

  it('帳號維度連續失敗 5 次 → 鎖定 15 分鐘', async () => {
    const username = `rl-acct-${RUN_ID}`;
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await loginPassword(username, 'wrong-password', `10.2.${i}.1`)).status);
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses[5]).toBe(429);
  });

  it('IP 維度連續失敗 5 次 → 鎖定 15 分鐘', async () => {
    const ip = '10.3.0.1';
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await loginPassword(`rl-ip-${RUN_ID}-${i}`, 'wrong-password', ip)).status);
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses[5]).toBe(429);
  });

  it('登入成功後重置帳號失敗計數', async () => {
    const username = testUsername(99);
    const regRes = await register(username, '10.4.0.1');
    expect(regRes.status).toBe(200);

    for (let i = 0; i < 4; i++) {
      await loginPassword(username, 'wrong-password', `10.4.${i + 1}.1`);
    }
    const successRes = await loginPassword(username, TEST_PASSWORD, '10.4.9.1');
    const afterRes = await loginPassword(username, 'wrong-password', '10.4.10.1');

    expect(successRes.status).toBe(200);
    expect(afterRes.status).toBe(401);
  });

  it('google-login 不受限流影響', async () => {
    const ip = '10.5.0.1';
    const statuses: number[] = [];
    for (let i = 0; i < 20; i++) {
      statuses.push((await loginGoogle(ip)).status);
    }
    expect(statuses).not.toContain(429);
  });
});
