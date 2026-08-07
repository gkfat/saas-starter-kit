/**
 * 整合測試：add-coupon-management 的 coupons 模組（server/modules/coupons）。
 * 需先啟動 dev server（pnpm dev），預設打 http://localhost:3000，可用 TEST_BASE_URL 環境變數覆寫；
 * 需要一組可用的 Firebase 專案（.env 的 FIREBASE_* / VITE_FIREBASE_API_KEY 變數），
 * 且該專案需已跑過 scripts/seed-rbac.ts（admin 角色需具備 coupons:read/write/issue/redeem），
 * 並在 .env 設定 FEATURE_COUPON_ENABLED=true。
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
import type {
  CouponInstance,
  CouponInstanceWithState,
  CouponTemplate,
} from '@saas-starter-kit/shared';

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
  'coupons-test',
);
const auth = getAuth(app);
const db = getFirestore(app);

const createdUserIds = new Set<string>();
const createdFirebaseUids = new Set<string>();
const createdTemplateIds = new Set<string>();
const createdInstanceIds = new Set<string>();

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

function authHeaders(idToken: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` };
}

function instancesCollection() {
  return db.collection(prefixCollection('coupon_instances'));
}

async function seedInstance(instance: CouponInstance): Promise<void> {
  createdInstanceIds.add(instance.id);
  await instancesCollection().doc(instance.id).set(instance);
}

afterAll(async () => {
  await Promise.all(
    [...createdUserIds].flatMap((userId) => [
      db.doc(`${prefixCollection('users')}/${userId}`).delete(),
      db.doc(`${prefixCollection('user_roles')}/${userId}`).delete(),
      db.doc(`${prefixCollection('user_auth')}/line_${userId}`).delete(),
    ]),
  );
  await Promise.all([...createdFirebaseUids].map((uid) => auth.deleteUser(uid).catch(() => {})));
  await Promise.all(
    [...createdTemplateIds].map((id) =>
      db
        .doc(`${prefixCollection('coupon_templates')}/${id}`)
        .delete()
        .catch(() => {}),
    ),
  );
  await Promise.all(
    [...createdInstanceIds].map((id) =>
      instancesCollection()
        .doc(id)
        .delete()
        .catch(() => {}),
    ),
  );
});

async function createTemplate(
  idToken: string,
  overrides: Partial<{
    title: string;
    description: string;
    discountType: 'fixed' | 'percentage' | 'item';
    discountValue?: number;
    validDays: number;
    status: 'draft' | 'published' | 'disabled';
  }> = {},
): Promise<CouponTemplate> {
  const res = await fetch(`${BASE_URL}/api/admin/coupons`, {
    method: 'POST',
    headers: authHeaders(idToken),
    body: JSON.stringify({
      title: '測試優惠券',
      description: '測試說明',
      discountType: 'fixed',
      discountValue: 50,
      validDays: 7,
      ...overrides,
    }),
  });
  expect(res.status).toBe(200);
  const template = (await res.json()) as CouponTemplate;
  createdTemplateIds.add(template.id);
  return template;
}

describe('優惠券範本管理（admin/coupons）', () => {
  it('未指定 status 建立範本 → 預設 draft', async () => {
    const { idToken } = await seedUser(testUsername('a', 1), Role.Admin);
    const template = await createTemplate(idToken);
    expect(template.status).toBe('draft');
  });

  it('建立 fixed 類型範本缺少 discountValue → 不建立成功（非 200）', async () => {
    const { idToken } = await seedUser(testUsername('a', 2), Role.Admin);
    const res = await fetch(`${BASE_URL}/api/admin/coupons`, {
      method: 'POST',
      headers: authHeaders(idToken),
      body: JSON.stringify({
        title: '缺折扣值',
        description: '說明',
        discountType: 'fixed',
        validDays: 7,
      }),
    });
    expect(res.status).not.toBe(200);
  });

  it('僅 published 範本可發放；draft/disabled 發放皆被拒絕', async () => {
    const { idToken } = await seedUser(testUsername('a', 3), Role.Admin);
    const memberA = await seedUser(testUsername('m', 1), Role.Member);

    const draftTemplate = await createTemplate(idToken);
    const issueDraft = await fetch(`${BASE_URL}/api/admin/coupons/${draftTemplate.id}/issue`, {
      method: 'POST',
      headers: authHeaders(idToken),
      body: JSON.stringify({ memberIds: [memberA.userId] }),
    });
    expect(issueDraft.status).toBe(409);

    const publish = await fetch(`${BASE_URL}/api/admin/coupons/${draftTemplate.id}`, {
      method: 'PATCH',
      headers: authHeaders(idToken),
      body: JSON.stringify({ status: 'published' }),
    });
    expect(publish.status).toBe(200);

    const issuePublished = await fetch(`${BASE_URL}/api/admin/coupons/${draftTemplate.id}/issue`, {
      method: 'POST',
      headers: authHeaders(idToken),
      body: JSON.stringify({ memberIds: [memberA.userId] }),
    });
    expect(issuePublished.status).toBe(200);
    const issuedInstances = (await issuePublished.json()) as CouponInstance[];
    for (const instance of issuedInstances) createdInstanceIds.add(instance.id);

    const disable = await fetch(`${BASE_URL}/api/admin/coupons/${draftTemplate.id}`, {
      method: 'PATCH',
      headers: authHeaders(idToken),
      body: JSON.stringify({ status: 'disabled' }),
    });
    expect(disable.status).toBe(200);

    // 停用範本後，既有券的核銷/到期狀態不受影響
    const instancesRes = await fetch(
      `${BASE_URL}/api/admin/coupons/${draftTemplate.id}/instances`,
      { headers: authHeaders(idToken) },
    );
    expect(instancesRes.status).toBe(200);
    const instancesBody = (await instancesRes.json()) as CouponInstanceWithState[];
    expect(instancesBody.find((i) => i.id === issuedInstances[0].id)?.state).toBe('usable');

    const issueDisabled = await fetch(`${BASE_URL}/api/admin/coupons/${draftTemplate.id}/issue`, {
      method: 'POST',
      headers: authHeaders(idToken),
      body: JSON.stringify({ memberIds: [memberA.userId] }),
    });
    expect(issueDisabled.status).toBe(409);
  });
});

describe('發放邏輯（admin/coupons/[id]/issue）', () => {
  it('批次發放給多位會員產生正確數量的獨立 instances，expiresAt 依 validDays 計算', async () => {
    const { idToken } = await seedUser(testUsername('a', 4), Role.Admin);
    const memberA = await seedUser(testUsername('m', 2), Role.Member);
    const memberB = await seedUser(testUsername('m', 3), Role.Member);
    const memberC = await seedUser(testUsername('m', 4), Role.Member);

    const template = await createTemplate(idToken, { status: 'published', validDays: 3 });

    const beforeIssue = Date.now();
    const res = await fetch(`${BASE_URL}/api/admin/coupons/${template.id}/issue`, {
      method: 'POST',
      headers: authHeaders(idToken),
      body: JSON.stringify({ memberIds: [memberA.userId, memberB.userId, memberC.userId] }),
    });
    expect(res.status).toBe(200);
    const instances = (await res.json()) as CouponInstance[];
    for (const instance of instances) createdInstanceIds.add(instance.id);

    expect(instances).toHaveLength(3);
    expect(new Set(instances.map((i) => i.code)).size).toBe(3);
    for (const instance of instances) {
      const expiresAt = new Date(instance.expiresAt).getTime();
      const expected = beforeIssue + 3 * 24 * 60 * 60 * 1000;
      expect(Math.abs(expiresAt - expected)).toBeLessThan(60_000);
    }
  });

  it('對同一會員重複發放同一範本 → 允許，建立另一筆獨立 instance', async () => {
    const { idToken } = await seedUser(testUsername('a', 5), Role.Admin);
    const member = await seedUser(testUsername('m', 5), Role.Member);
    const template = await createTemplate(idToken, { status: 'published' });

    const first = await fetch(`${BASE_URL}/api/admin/coupons/${template.id}/issue`, {
      method: 'POST',
      headers: authHeaders(idToken),
      body: JSON.stringify({ memberIds: [member.userId] }),
    });
    const second = await fetch(`${BASE_URL}/api/admin/coupons/${template.id}/issue`, {
      method: 'POST',
      headers: authHeaders(idToken),
      body: JSON.stringify({ memberIds: [member.userId] }),
    });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const firstInstances = (await first.json()) as CouponInstance[];
    const secondInstances = (await second.json()) as CouponInstance[];
    for (const instance of [...firstInstances, ...secondInstances]) {
      createdInstanceIds.add(instance.id);
    }
    expect(firstInstances[0].id).not.toBe(secondInstances[0].id);

    const instancesRes = await fetch(`${BASE_URL}/api/admin/coupons/${template.id}/instances`, {
      headers: authHeaders(idToken),
    });
    const instancesBody = (await instancesRes.json()) as CouponInstanceWithState[];
    expect(instancesBody.filter((i) => i.memberId === member.userId)).toHaveLength(2);
  });
});

describe('核銷邏輯（admin/coupons/redeem）', () => {
  it('成功核銷；已核銷/已過期/查無序號各自回應正確狀態碼', async () => {
    const { idToken } = await seedUser(testUsername('a', 6), Role.Admin);
    const member = await seedUser(testUsername('m', 6), Role.Member);
    const template = await createTemplate(idToken, { status: 'published' });

    const issueRes = await fetch(`${BASE_URL}/api/admin/coupons/${template.id}/issue`, {
      method: 'POST',
      headers: authHeaders(idToken),
      body: JSON.stringify({ memberIds: [member.userId] }),
    });
    const [instance] = (await issueRes.json()) as CouponInstance[];
    createdInstanceIds.add(instance.id);

    const redeemOk = await fetch(`${BASE_URL}/api/admin/coupons/redeem`, {
      method: 'POST',
      headers: authHeaders(idToken),
      body: JSON.stringify({ code: instance.code }),
    });
    expect(redeemOk.status).toBe(200);
    const redeemedBody = (await redeemOk.json()) as CouponInstanceWithState;
    expect(redeemedBody.state).toBe('redeemed');

    const redeemAgain = await fetch(`${BASE_URL}/api/admin/coupons/redeem`, {
      method: 'POST',
      headers: authHeaders(idToken),
      body: JSON.stringify({ code: instance.code }),
    });
    expect(redeemAgain.status).toBe(409);

    const redeemUnknown = await fetch(`${BASE_URL}/api/admin/coupons/redeem`, {
      method: 'POST',
      headers: authHeaders(idToken),
      body: JSON.stringify({ code: 'NOPE0000' }),
    });
    expect(redeemUnknown.status).toBe(404);

    const expiredInstance: CouponInstance = {
      id: randomUUID(),
      templateId: template.id,
      memberId: member.userId,
      code: `EXP${RUN_ID}`.toUpperCase().slice(0, 8),
      issuedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      issuedBy: idToken,
      expiresAt: new Date(Date.now() - 86400000).toISOString(),
    };
    await seedInstance(expiredInstance);

    const redeemExpired = await fetch(`${BASE_URL}/api/admin/coupons/redeem`, {
      method: 'POST',
      headers: authHeaders(idToken),
      body: JSON.stringify({ code: expiredInstance.code }),
    });
    expect(redeemExpired.status).toBe(409);
  });

  it('同一序號同時送出兩次核銷請求，僅一次成功', async () => {
    const { idToken } = await seedUser(testUsername('a', 7), Role.Admin);
    const member = await seedUser(testUsername('m', 7), Role.Member);
    const template = await createTemplate(idToken, { status: 'published' });

    const issueRes = await fetch(`${BASE_URL}/api/admin/coupons/${template.id}/issue`, {
      method: 'POST',
      headers: authHeaders(idToken),
      body: JSON.stringify({ memberIds: [member.userId] }),
    });
    const [instance] = (await issueRes.json()) as CouponInstance[];
    createdInstanceIds.add(instance.id);

    const [resA, resB] = await Promise.all([
      fetch(`${BASE_URL}/api/admin/coupons/redeem`, {
        method: 'POST',
        headers: authHeaders(idToken),
        body: JSON.stringify({ code: instance.code }),
      }),
      fetch(`${BASE_URL}/api/admin/coupons/redeem`, {
        method: 'POST',
        headers: authHeaders(idToken),
        body: JSON.stringify({ code: instance.code }),
      }),
    ]);
    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);
  });
});

describe('Admin API 權限檢查（coupons:read/write/issue/redeem）', () => {
  it('member 角色（無 coupons:* 權限）呼叫各 coupons admin API → 403', async () => {
    const { idToken } = await seedUser(testUsername('m', 8), Role.Member);

    const list = await fetch(`${BASE_URL}/api/admin/coupons`, { headers: authHeaders(idToken) });
    expect(list.status).toBe(403);

    const create = await fetch(`${BASE_URL}/api/admin/coupons`, {
      method: 'POST',
      headers: authHeaders(idToken),
      body: JSON.stringify({
        title: 'x',
        description: 'x',
        discountType: 'fixed',
        discountValue: 1,
        validDays: 1,
      }),
    });
    expect(create.status).toBe(403);

    const issue = await fetch(`${BASE_URL}/api/admin/coupons/nonexistent/issue`, {
      method: 'POST',
      headers: authHeaders(idToken),
      body: JSON.stringify({ memberIds: ['x'] }),
    });
    expect(issue.status).toBe(403);

    const redeem = await fetch(`${BASE_URL}/api/admin/coupons/redeem`, {
      method: 'POST',
      headers: authHeaders(idToken),
      body: JSON.stringify({ code: 'x' }),
    });
    expect(redeem.status).toBe(403);
  });
});

describe('LIFF 公開 API（liff/coupons）', () => {
  it('未登入查詢 → 401', async () => {
    const res = await fetch(`${BASE_URL}/api/liff/coupons`);
    expect(res.status).toBe(401);
  });

  it('已登入會員可查看自己持有的優惠券列表與詳情；查詢非自己持有的優惠券 → 403', async () => {
    const { idToken: adminToken } = await seedUser(testUsername('a', 9), Role.Admin);
    const owner = await seedUser(testUsername('m', 9), Role.Member);
    const other = await seedUser(testUsername('m', 10), Role.Member);
    const template = await createTemplate(adminToken, { status: 'published' });

    const issueRes = await fetch(`${BASE_URL}/api/admin/coupons/${template.id}/issue`, {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: JSON.stringify({ memberIds: [owner.userId] }),
    });
    const [instance] = (await issueRes.json()) as CouponInstance[];
    createdInstanceIds.add(instance.id);

    const listRes = await fetch(`${BASE_URL}/api/liff/coupons`, {
      headers: authHeaders(owner.idToken),
    });
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()) as CouponInstanceWithState[];
    expect(list.some((i) => i.id === instance.id)).toBe(true);

    const ownDetail = await fetch(`${BASE_URL}/api/liff/coupons/${instance.id}`, {
      headers: authHeaders(owner.idToken),
    });
    expect(ownDetail.status).toBe(200);

    const forbiddenDetail = await fetch(`${BASE_URL}/api/liff/coupons/${instance.id}`, {
      headers: authHeaders(other.idToken),
    });
    expect(forbiddenDetail.status).toBe(403);
  });
});
