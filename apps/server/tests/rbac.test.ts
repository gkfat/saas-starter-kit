/**
 * 整合測試：RBAC 權限檢查（server/middleware/03.auth.ts + shared/rbac.ts + modules/roles）。
 * 需先啟動 dev server（pnpm dev），預設打 http://localhost:3000，可用 TEST_BASE_URL 環境變數覆寫；
 * 需要一組可用的 Firebase 專案（.env 的 FIREBASE_* / VITE_FIREBASE_API_KEY 變數），
 * 且該專案需已跑過 scripts/seed-rbac.ts（member 角色無任何權限、admin 角色具完整權限）。
 */
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { config as loadEnv } from 'dotenv';
import { prefixCollection } from '../server/shared/firestore-prefix';
import { Role } from '@saas-starter-kit/shared';

loadEnv({ path: resolve(import.meta.dirname, '../../../.env') });

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const RUN_ID = Date.now().toString(36).slice(-5);

function testUsername(prefix: string, index: number) {
  return `${prefix}${RUN_ID}${index.toString(36)}`;
}

const app = initializeApp(
  {
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  },
  'rbac-test',
);
const auth = getAuth(app);
const db = getFirestore(app);

const createdUserIds = new Set<string>();
const createdFirebaseUids = new Set<string>();

async function mintIdToken(uid: string): Promise<string> {
  const customToken = await auth.createCustomToken(uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.VITE_FIREBASE_API_KEY}`,
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

/** 比照 change-password.test.ts 的 seedLineOnlyUser，直接在 Firestore 造一個指定角色的測試帳號。 */
async function seedUser(
  username: string,
  role: string,
): Promise<{ userId: string; idToken: string }> {
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

  await db.doc(`${prefixCollection('user_roles')}/${userId}`).set({ role });

  const idToken = await mintIdToken(created.uid);
  return { userId, idToken };
}

afterAll(async () => {
  for (const userId of createdUserIds) {
    await db.doc(`${prefixCollection('users')}/${userId}`).delete();
    await db.doc(`${prefixCollection('user_roles')}/${userId}`).delete();
    await db.doc(`${prefixCollection('user_auth')}/line_${userId}`).delete();
  }
  for (const uid of createdFirebaseUids) {
    await auth.deleteUser(uid).catch(() => {});
  }
});

describe('RBAC 權限檢查', () => {
  it('未帶 Authorization header 打受保護端點 → 401', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/logs/audit`, { method: 'GET' });
    expect(res.status).toBe(401);
  });

  it('member 角色（無 audit_logs:read）呼叫 /api/admin/logs/audit → 403', async () => {
    const { idToken } = await seedUser(testUsername('m', 1), Role.Member);

    const res = await fetch(`${BASE_URL}/api/admin/logs/audit`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${idToken}` },
    });
    expect(res.status).toBe(403);
  });

  it('member 角色（無 members:write）呼叫 PATCH /api/admin/users/:id → 403', async () => {
    const { idToken: actorToken } = await seedUser(testUsername('m', 2), Role.Member);
    const { userId: targetId } = await seedUser(testUsername('m', 3), Role.Member);

    const res = await fetch(`${BASE_URL}/api/admin/users/${targetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${actorToken}` },
      body: JSON.stringify({ disabled: true }),
    });
    expect(res.status).toBe(403);
  });

  it('admin 角色（具 members:write）呼叫 PATCH /api/admin/users/:id 停用 member → 200，且寫入 audit_log', async () => {
    const { idToken: actorToken, userId: actorId } = await seedUser(
      testUsername('a', 1),
      Role.Admin,
    );
    const { userId: targetId } = await seedUser(testUsername('m', 4), Role.Member);

    const res = await fetch(`${BASE_URL}/api/admin/users/${targetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${actorToken}` },
      body: JSON.stringify({ disabled: true }),
    });
    expect(res.status).toBe(200);

    const snap = await db
      .collection(prefixCollection('audit_logs'))
      .where('actor.userId', '==', actorId)
      .where('metadata.userId', '==', targetId)
      .where('action', '==', 'user.status.update')
      .limit(1)
      .get();
    expect(snap.empty).toBe(false);
  });

  it('admin 無法停用自己的帳號 → 400', async () => {
    const { idToken, userId } = await seedUser(testUsername('a', 2), Role.Admin);

    const res = await fetch(`${BASE_URL}/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ disabled: true }),
    });
    expect(res.status).toBe(400);
  });
});
