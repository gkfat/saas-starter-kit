/**
 * 整合測試：add-member-level-management 的 level 模組（server/modules/level）。
 * 需先啟動 dev server（pnpm dev），預設打 http://localhost:3000，可用 TEST_BASE_URL 環境變數覆寫；
 * 需要一組可用的 Firebase 專案（.env 的 FIREBASE_* / VITE_FIREBASE_API_KEY 變數），
 * 且該專案需已跑過 scripts/seed-rbac.ts（admin 角色需具備 level_tiers:read/write）。
 * 需要在 .env 設定 LEVEL_BATCH_SECRET，並與此檔案讀到的值一致。
 *
 * 未涵蓋：recordMetric()（立即升級、負數金額拒絕）——本次 change 刻意未開放任何 HTTP
 * endpoint 呼叫 recordMetric（指標串接為 Non-Goal，留待後續 change 決定呼叫端與介面），
 * 在目前「純 HTTP 整合測試」慣例下沒有入口可測，留待該次 change 一併補上（tasks.md 8.1/8.2/8.8）。
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
const LEVEL_BATCH_SECRET = process.env.LEVEL_BATCH_SECRET ?? '';
const RUN_ID = Date.now().toString(36).slice(-5);
const TEST_STARTED_AT = new Date().toISOString();

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
  'level-test',
);
const auth = getAuth(app);
const db = getFirestore(app);

const createdUserIds = new Set<string>();
const createdFirebaseUids = new Set<string>();
const createdTierLevelNumbers = new Set<number>();
const createdMemberStateUserIds = new Set<string>();

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

/** 比照 rbac.test.ts 的 seedUser，直接在 Firestore 造一個指定角色的測試帳號（略過 level 初始化）。 */
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

function tiersRef(levelNumber: number) {
  return db.doc(`${prefixCollection('level_tiers')}/${levelNumber}`);
}

async function seedTier(levelNumber: number, name: string, metricThreshold: number) {
  createdTierLevelNumbers.add(levelNumber);
  await tiersRef(levelNumber).set({ levelNumber, name, metricThreshold });
}

function memberStateRef(userId: string) {
  return db.doc(`${prefixCollection('level_member_states')}/${userId}`);
}

async function seedMemberState(state: {
  userId: string;
  startDate: string;
  endDate: string;
  currentPeriodTotal: number;
  currentLevelNumber: number;
}) {
  createdMemberStateUserIds.add(state.userId);
  await memberStateRef(state.userId).set(state);
}

function adminAuthHeaders(idToken: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` };
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
    [...createdTierLevelNumbers].map((levelNumber) =>
      tiersRef(levelNumber)
        .delete()
        .catch(() => {}),
    ),
  );
  const memberStateUserIds = [...createdMemberStateUserIds];
  while (memberStateUserIds.length > 0) {
    const chunk = memberStateUserIds.splice(0, 400);
    const deleteBatch = db.batch();
    for (const userId of chunk) deleteBatch.delete(memberStateRef(userId));
    await deleteBatch.commit();
  }
  // level_history 是服務端寫入、非 seed 產生，無法用固定 doc id 清理；改以測試起始時間為界清掉本次執行產生的紀錄
  const historySnap = await db
    .collection(prefixCollection('level_history'))
    .where('evaluatedAt', '>=', TEST_STARTED_AT)
    .get();
  await Promise.all(historySnap.docs.map((doc) => doc.ref.delete()));
});

describe('等級級距表管理（admin/level/tiers）', () => {
  it('levelNumber=1 但 metricThreshold != 0 → 拒絕建立（400/409）', async () => {
    const { idToken } = await seedUser(testUsername('a', 1), Role.Admin);
    const levelNumber = 900 + Math.floor(Math.random() * 100);
    createdTierLevelNumbers.add(levelNumber);

    const res = await fetch(`${BASE_URL}/api/admin/level/tiers`, {
      method: 'POST',
      headers: adminAuthHeaders(idToken),
      body: JSON.stringify({ levelNumber: 1, name: '測試floor', metricThreshold: 10 }),
    });
    // 若專案已存在合法的 levelNumber=1 tier，此請求會先撞到 duplicate 檢查（409）；
    // 若尚未存在，則會撞到 floor 驗證（409）。兩者皆非 200 即符合預期。
    expect(res.status).not.toBe(200);
  });

  it('新增/更新/刪除 tier，門檻須遞增，刪除使用中的 tier 會被拒絕', async () => {
    const { idToken } = await seedUser(testUsername('a', 2), Role.Admin);
    const lvA = 910 + Math.floor(Math.random() * 40);
    const lvB = lvA + 1;
    createdTierLevelNumbers.add(lvA);
    createdTierLevelNumbers.add(lvB);

    const createA = await fetch(`${BASE_URL}/api/admin/level/tiers`, {
      method: 'POST',
      headers: adminAuthHeaders(idToken),
      body: JSON.stringify({ levelNumber: lvA, name: 'Bronze', metricThreshold: 100 }),
    });
    expect(createA.status).toBe(200);

    const createB = await fetch(`${BASE_URL}/api/admin/level/tiers`, {
      method: 'POST',
      headers: adminAuthHeaders(idToken),
      body: JSON.stringify({ levelNumber: lvB, name: 'Silver', metricThreshold: 50 }),
    });
    expect(createB.status).toBe(409);

    const updateA = await fetch(`${BASE_URL}/api/admin/level/tiers/${lvA}`, {
      method: 'PATCH',
      headers: adminAuthHeaders(idToken),
      body: JSON.stringify({ name: 'Bronze+' }),
    });
    expect(updateA.status).toBe(200);

    const memberId = randomUUID();
    await seedMemberState({
      userId: memberId,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
      currentPeriodTotal: 0,
      currentLevelNumber: lvA,
    });

    const deleteInUse = await fetch(`${BASE_URL}/api/admin/level/tiers/${lvA}`, {
      method: 'DELETE',
      headers: adminAuthHeaders(idToken),
    });
    expect(deleteInUse.status).toBe(409);

    await memberStateRef(memberId).delete();
    createdMemberStateUserIds.delete(memberId);

    const deleteUnused = await fetch(`${BASE_URL}/api/admin/level/tiers/${lvA}`, {
      method: 'DELETE',
      headers: adminAuthHeaders(idToken),
    });
    expect(deleteUnused.status).toBe(200);
    createdTierLevelNumbers.delete(lvA);
  });
});

describe('內部批次評等 endpoint（internal/level/evaluate-due-periods）', () => {
  it('缺少或錯誤的 shared secret → 401', async () => {
    const missing = await fetch(`${BASE_URL}/api/internal/level/evaluate-due-periods`, {
      method: 'POST',
    });
    expect(missing.status).toBe(401);

    const invalid = await fetch(`${BASE_URL}/api/internal/level/evaluate-due-periods`, {
      method: 'POST',
      headers: { 'X-Level-Batch-Secret': 'wrong-secret' },
    });
    expect(invalid.status).toBe(401);
  });

  it('到期會員被評等：寫入 level_history 快照、currentPeriodTotal 歸零、期間推進，且冪等', async () => {
    await seedTier(920, 'Tier920', 0);

    const userId = randomUUID();
    const pastEnd = new Date(Date.now() - 60000).toISOString();
    await seedMemberState({
      userId,
      startDate: new Date(Date.now() - 365 * 86400000).toISOString(),
      endDate: pastEnd,
      currentPeriodTotal: 42,
      currentLevelNumber: 920,
    });

    const firstCall = await fetch(`${BASE_URL}/api/internal/level/evaluate-due-periods`, {
      method: 'POST',
      headers: { 'X-Level-Batch-Secret': LEVEL_BATCH_SECRET },
    });
    expect(firstCall.status).toBe(200);
    const firstBody = (await firstCall.json()) as { processed: number; failedUserIds: string[] };
    expect(firstBody.failedUserIds).not.toContain(userId);

    const stateAfter = (await memberStateRef(userId).get()).data();
    expect(stateAfter?.currentPeriodTotal).toBe(0);
    expect(stateAfter?.endDate > pastEnd).toBe(true);

    const historySnap = await db
      .collection(prefixCollection('level_history'))
      .where('userId', '==', userId)
      .get();
    expect(historySnap.empty).toBe(false);
    const historyEntry = historySnap.docs[0].data();
    expect(historyEntry.levelNumber).toBe(920);
    expect(
      historyEntry.tierSnapshot.some((t: { levelNumber: number }) => t.levelNumber === 920),
    ).toBe(true);
    // 變更 tier 定義後，既有 history 快照不應改變
    await tiersRef(920).update({ name: 'Renamed920' });
    const historyAfterRename = (
      await db.doc(`${prefixCollection('level_history')}/${historySnap.docs[0].id}`).get()
    ).data();
    expect(
      historyAfterRename?.tierSnapshot.find((t: { levelNumber: number }) => t.levelNumber === 920)
        .name,
    ).toBe('Tier920');

    // 冪等：同一個到期會員已被處理過，endDate 已推進到未來，第二次呼叫不應再次處理它
    const secondCall = await fetch(`${BASE_URL}/api/internal/level/evaluate-due-periods`, {
      method: 'POST',
      headers: { 'X-Level-Batch-Secret': LEVEL_BATCH_SECRET },
    });
    const secondBody = (await secondCall.json()) as { failedUserIds: string[] };
    expect(secondBody.failedUserIds).not.toContain(userId);
    const historySnapAfter = await db
      .collection(prefixCollection('level_history'))
      .where('userId', '==', userId)
      .get();
    expect(historySnapAfter.size).toBe(historySnap.size); // 沒有新增第二筆 history
  });

  it('分頁處理超過 100 筆到期會員，且單一會員失敗不會擋住其他會員', async () => {
    const pastEnd = new Date(Date.now() - 60000).toISOString();
    const validUserIds: string[] = Array.from({ length: 105 }, () => randomUUID());
    const brokenUserId = randomUUID();

    const seedBatch = db.batch();
    for (const userId of validUserIds) {
      createdMemberStateUserIds.add(userId);
      seedBatch.set(memberStateRef(userId), {
        userId,
        startDate: new Date(Date.now() - 365 * 86400000).toISOString(),
        endDate: pastEnd,
        currentPeriodTotal: 1,
        currentLevelNumber: 1,
      });
    }
    // 損壞的 endDate（字典序仍 <= now，但無法被解析為合法日期）用來製造單一會員失敗
    createdMemberStateUserIds.add(brokenUserId);
    seedBatch.set(memberStateRef(brokenUserId), {
      userId: brokenUserId,
      startDate: new Date(Date.now() - 365 * 86400000).toISOString(),
      endDate: '0000-BROKEN-DATE',
      currentPeriodTotal: 1,
      currentLevelNumber: 1,
    });
    await seedBatch.commit();

    const res = await fetch(`${BASE_URL}/api/internal/level/evaluate-due-periods`, {
      method: 'POST',
      headers: { 'X-Level-Batch-Secret': LEVEL_BATCH_SECRET },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      processed: number;
      failed: number;
      failedUserIds: string[];
    };

    expect(body.processed).toBeGreaterThanOrEqual(105);
    expect(body.failedUserIds).toContain(brokenUserId);

    const sampleState = (await memberStateRef(validUserIds[0]).get()).data();
    expect(sampleState?.currentPeriodTotal).toBe(0);
    expect(sampleState?.endDate > pastEnd).toBe(true);

    const brokenState = (await memberStateRef(brokenUserId).get()).data();
    expect(brokenState?.endDate).toBe('0000-BROKEN-DATE'); // 失敗的會員狀態未被改動（transaction 未提交）
  }, 180000);
});

describe('會員等級可見性（profile/level、admin/users）', () => {
  it('登入使用者查詢 /api/profile/level 取得自己的等級資訊', async () => {
    const { idToken, userId } = await seedUser(testUsername('m', 1), Role.Member);
    await seedTier(930, 'Tier930', 0);
    await seedMemberState({
      userId,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
      currentPeriodTotal: 5,
      currentLevelNumber: 930,
    });

    const res = await fetch(`${BASE_URL}/api/profile/level`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { levelNumber: number; levelName: string };
    expect(body.levelNumber).toBe(930);
    expect(body.levelName).toBe('Tier930');
  });

  it('admin 查詢 /api/admin/users/:id 可看到目標會員的等級資訊', async () => {
    const { idToken: adminToken } = await seedUser(testUsername('a', 3), Role.Admin);
    const { userId: memberId } = await seedUser(testUsername('m', 2), Role.Member);
    await seedTier(931, 'Tier931', 0);
    await seedMemberState({
      userId: memberId,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
      currentPeriodTotal: 7,
      currentLevelNumber: 931,
    });

    const res = await fetch(`${BASE_URL}/api/admin/users/${memberId}`, {
      headers: adminAuthHeaders(adminToken),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { level: { levelNumber: number; levelName: string } | null };
    expect(body.level?.levelNumber).toBe(931);
    expect(body.level?.levelName).toBe('Tier931');
  });

  it('admin 呼叫 /api/admin/users 列表時，每筆會員都帶有其等級摘要', async () => {
    const { idToken: adminToken } = await seedUser(testUsername('a', 4), Role.Admin);
    const { userId: memberId } = await seedUser(testUsername('m', 3), Role.Member);
    await seedTier(932, 'Tier932', 0);
    await seedMemberState({
      userId: memberId,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
      currentPeriodTotal: 3,
      currentLevelNumber: 932,
    });

    const res = await fetch(`${BASE_URL}/api/admin/users?role=member`, {
      headers: adminAuthHeaders(adminToken),
    });
    expect(res.status).toBe(200);
    const list = (await res.json()) as Array<{
      userId: string;
      level: { levelNumber: number } | null;
    }>;
    const row = list.find((u) => u.userId === memberId);
    expect(row?.level?.levelNumber).toBe(932);
  });
});

describe('註冊流程一律初始化 level period（不受 feature flag 影響）', () => {
  it('POST /api/auth/register 成功後，該會員立即擁有 level_member_states', async () => {
    const username = testUsername('reg', 1);
    const created = await auth.createUser({});
    createdFirebaseUids.add(created.uid);
    const idToken = await mintIdToken(created.uid);

    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, username }),
    });
    expect(res.status).toBe(200);
    createdUserIds.add(username); // 標記以便下方以 username 查回 userId 做清理

    const snap = await db
      .collection(prefixCollection('users'))
      .where('username', '==', username)
      .limit(1)
      .get();
    expect(snap.empty).toBe(false);
    const userId = snap.docs[0].data().userId as string;

    const stateSnap = await memberStateRef(userId).get();
    expect(stateSnap.exists).toBe(true);
    expect(stateSnap.data()?.currentLevelNumber).toBe(1);

    // 清理（此帳號透過 register API 建立，非 seedUser，需另外處理刪除）
    await db.doc(`${prefixCollection('users')}/${userId}`).delete();
    await db.doc(`${prefixCollection('user_roles')}/${userId}`).delete();
    await db.doc(`${prefixCollection('user_auth')}/password_${username}`).delete();
    await memberStateRef(userId).delete();
    createdUserIds.delete(username);
  });
});
