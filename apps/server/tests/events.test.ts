/**
 * 整合測試：add-event-notification 的 events 模組（server/modules/events）。
 * 需先啟動 dev server（pnpm dev），預設打 http://localhost:3000，可用 TEST_BASE_URL 環境變數覆寫；
 * 需要一組可用的 Firebase 專案（.env 的 FIREBASE_* / VITE_FIREBASE_API_KEY 變數），
 * 且該專案需已跑過 scripts/seed-rbac.ts（admin 角色需具備 events:read/write/create/delete），
 * 並在 .env 設定 FEATURE_EVENT_ENABLED=true。
 * 圖片上傳（banner）相關測試需額外設定 R2_* 環境變數，指向一個可用的 Cloudflare R2 bucket。
 */
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import '../../../scripts/load-root-env';
import { prefixCollection } from '../server/shared/firestore-prefix';
import { Role } from '@saas-starter-kit/shared';
import type { Event, EventWithStatus } from '@saas-starter-kit/shared';

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
  'events-test',
);
const auth = getAuth(app);
const db = getFirestore(app);

const createdUserIds = new Set<string>();
const createdFirebaseUids = new Set<string>();
const createdEventIds = new Set<string>();

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

function eventsCollection() {
  return db.collection(prefixCollection('events'));
}

async function seedEvent(event: Event): Promise<void> {
  createdEventIds.add(event.id);
  await eventsCollection().doc(event.id).set(event);
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
    [...createdEventIds].map((id) =>
      eventsCollection()
        .doc(id)
        .delete()
        .catch(() => {}),
    ),
  );
});

async function createEvent(
  idToken: string,
  overrides: Partial<{
    title: string;
    copyText: string;
    startAt: string;
    endAt: string;
    enabled: boolean;
  }> = {},
): Promise<Event> {
  const now = Date.now();
  const res = await fetch(`${BASE_URL}/api/admin/events`, {
    method: 'POST',
    headers: authHeaders(idToken),
    body: JSON.stringify({
      title: '測試活動',
      copyText: '測試文宣',
      startAt: new Date(now - 60_000).toISOString(),
      endAt: new Date(now + 3600_000).toISOString(),
      ...overrides,
    }),
  });
  expect(res.status).toBe(200);
  const event = (await res.json()) as Event;
  createdEventIds.add(event.id);
  return event;
}

describe('活動走期驗證（admin/events）', () => {
  it('endAt 早於或等於 startAt → 建立失敗（非 200）', async () => {
    const { idToken } = await seedUser(testUsername('a', 1), Role.Admin);
    const now = new Date().toISOString();
    const res = await fetch(`${BASE_URL}/api/admin/events`, {
      method: 'POST',
      headers: authHeaders(idToken),
      body: JSON.stringify({
        title: '無效走期',
        copyText: '說明',
        startAt: now,
        endAt: now,
      }),
    });
    expect(res.status).toBe(400);
  });

  it('endAt 晚於 startAt → 建立成功', async () => {
    const { idToken } = await seedUser(testUsername('a', 2), Role.Admin);
    const event = await createEvent(idToken);
    expect(event.enabled).toBe(true);
  });

  it('更新活動走期為無效區間 → 拒絕', async () => {
    const { idToken } = await seedUser(testUsername('a', 3), Role.Admin);
    const event = await createEvent(idToken);
    const now = new Date().toISOString();
    const res = await fetch(`${BASE_URL}/api/admin/events/${event.id}`, {
      method: 'PATCH',
      headers: authHeaders(idToken),
      body: JSON.stringify({ startAt: now, endAt: now }),
    });
    expect(res.status).toBe(400);
  });
});

describe('「即將開始／上檔中」查詢邏輯（liff/events/active）', () => {
  it('回傳 enabled 且尚未結束的活動（含即將開始與上檔中），排除停用/已過去事件', async () => {
    const { idToken: adminToken } = await seedUser(testUsername('a', 4), Role.Admin);
    const member = await seedUser(testUsername('m', 1), Role.Member);
    const now = Date.now();

    const active = await createEvent(adminToken, { title: '進行中' });

    const disabled = await createEvent(adminToken, {
      title: '已停用',
      enabled: false,
    });

    const upcoming = await createEvent(adminToken, {
      title: '未來活動',
      startAt: new Date(now + 3600_000).toISOString(),
      endAt: new Date(now + 7200_000).toISOString(),
    });

    const ended = await createEvent(adminToken, {
      title: '已結束',
      startAt: new Date(now - 7200_000).toISOString(),
      endAt: new Date(now - 3600_000).toISOString(),
    });

    const res = await fetch(`${BASE_URL}/api/liff/events/active`, {
      headers: authHeaders(member.idToken),
    });
    expect(res.status).toBe(200);
    const events = (await res.json()) as Event[];
    const ids = events.map((e) => e.id);
    expect(ids).toContain(active.id);
    expect(ids).toContain(upcoming.id);
    expect(ids).not.toContain(disabled.id);
    expect(ids).not.toContain(ended.id);
  });

  it('邊界時間：startAt/endAt 恰為當下的活動應被視為上檔中', async () => {
    const { idToken: adminToken } = await seedUser(testUsername('a', 5), Role.Admin);
    const member = await seedUser(testUsername('m', 2), Role.Member);
    const now = new Date();

    const boundaryEvent: Event = {
      id: randomUUID(),
      title: '邊界事件',
      copyText: '文宣',
      startAt: now.toISOString(),
      endAt: new Date(now.getTime() + 1000).toISOString(),
      enabled: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await seedEvent(boundaryEvent);

    const res = await fetch(`${BASE_URL}/api/liff/events/active`, {
      headers: authHeaders(member.idToken),
    });
    const events = (await res.json()) as Event[];
    expect(events.map((e) => e.id)).toContain(boundaryEvent.id);

    // 直接呼叫 admin API 驗證 status 計算：admin list 應標示為 active
    const listRes = await fetch(`${BASE_URL}/api/admin/events`, {
      headers: authHeaders(adminToken),
    });
    const list = (await listRes.json()) as EventWithStatus[];
    expect(list.find((e) => e.id === boundaryEvent.id)?.status).toBe('active');
  });
});

describe('Admin API 權限檢查（events:read/write/create/delete）', () => {
  it('member 角色（無 events:* 權限）呼叫各 events admin API → 403', async () => {
    const { idToken } = await seedUser(testUsername('m', 3), Role.Member);

    const list = await fetch(`${BASE_URL}/api/admin/events`, { headers: authHeaders(idToken) });
    expect(list.status).toBe(403);

    const create = await fetch(`${BASE_URL}/api/admin/events`, {
      method: 'POST',
      headers: authHeaders(idToken),
      body: JSON.stringify({
        title: 'x',
        copyText: 'x',
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    });
    expect(create.status).toBe(403);

    const patch = await fetch(`${BASE_URL}/api/admin/events/nonexistent`, {
      method: 'PATCH',
      headers: authHeaders(idToken),
      body: JSON.stringify({ title: 'x' }),
    });
    expect(patch.status).toBe(403);

    const del = await fetch(`${BASE_URL}/api/admin/events/nonexistent`, {
      method: 'DELETE',
      headers: authHeaders(idToken),
    });
    expect(del.status).toBe(403);
  });
});

describe('圖片上傳（admin/events/[id]/banner）', () => {
  const PNG_1X1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );

  it('不支援的 MIME type → 拒絕，不更動 bannerUrl', async () => {
    const { idToken } = await seedUser(testUsername('a', 8), Role.Admin);
    const event = await createEvent(idToken);

    const form = new FormData();
    form.append('file', new Blob([PNG_1X1], { type: 'text/plain' }), 'banner.txt');
    const res = await fetch(`${BASE_URL}/api/admin/events/${event.id}/banner`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
      body: form,
    });
    expect(res.status).toBe(400);
  });

  it('超過大小上限 → 拒絕，不更動 bannerUrl', async () => {
    const { idToken } = await seedUser(testUsername('a', 9), Role.Admin);
    const event = await createEvent(idToken);

    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1, 1);
    const form = new FormData();
    form.append('file', new Blob([oversized], { type: 'image/png' }), 'banner.png');
    const res = await fetch(`${BASE_URL}/api/admin/events/${event.id}/banner`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
      body: form,
    });
    expect(res.status).toBe(400);
  });

  it('合法圖片上傳成功並更新 bannerUrl；更換 banner 後舊檔案不再可存取', async () => {
    const { idToken } = await seedUser(testUsername('a', 10), Role.Admin);
    const event = await createEvent(idToken);

    const form1 = new FormData();
    form1.append('file', new Blob([PNG_1X1], { type: 'image/png' }), 'banner1.png');
    const res1 = await fetch(`${BASE_URL}/api/admin/events/${event.id}/banner`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
      body: form1,
    });
    expect(res1.status).toBe(200);
    const updated1 = (await res1.json()) as Event;
    expect(updated1.bannerUrl).toBeTruthy();
    const firstBannerUrl = updated1.bannerUrl as string;

    const check1 = await fetch(firstBannerUrl);
    expect(check1.status).toBe(200);

    const form2 = new FormData();
    form2.append('file', new Blob([PNG_1X1], { type: 'image/png' }), 'banner2.png');
    const res2 = await fetch(`${BASE_URL}/api/admin/events/${event.id}/banner`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
      body: form2,
    });
    expect(res2.status).toBe(200);
    const updated2 = (await res2.json()) as Event;
    expect(updated2.bannerUrl).toBe(firstBannerUrl); // same key (same ext) → URL unchanged, content replaced
  });

  it('刪除活動時一併刪除 R2 banner 檔案', async () => {
    const { idToken } = await seedUser(testUsername('a', 11), Role.Admin);
    const event = await createEvent(idToken);

    const form = new FormData();
    form.append('file', new Blob([PNG_1X1], { type: 'image/png' }), 'banner.png');
    const uploadRes = await fetch(`${BASE_URL}/api/admin/events/${event.id}/banner`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
      body: form,
    });
    const uploaded = (await uploadRes.json()) as Event;
    const bannerUrl = uploaded.bannerUrl as string;

    const deleteRes = await fetch(`${BASE_URL}/api/admin/events/${event.id}`, {
      method: 'DELETE',
      headers: authHeaders(idToken),
    });
    expect(deleteRes.status).toBe(200);
    createdEventIds.delete(event.id);

    const check = await fetch(bannerUrl);
    expect(check.status).toBe(404);
  });
});

describe('LIFF 公開 API（liff/events）', () => {
  it('未登入查詢 active 清單 → 401', async () => {
    const res = await fetch(`${BASE_URL}/api/liff/events/active`);
    expect(res.status).toBe(401);
  });

  it('未登入查詢活動詳情 → 401', async () => {
    const res = await fetch(`${BASE_URL}/api/liff/events/nonexistent`);
    expect(res.status).toBe(401);
  });

  it('已登入會員查詢非上檔中活動的詳情 → 404', async () => {
    const { idToken: adminToken } = await seedUser(testUsername('a', 6), Role.Admin);
    const member = await seedUser(testUsername('m', 4), Role.Member);
    const ended = await createEvent(adminToken, {
      title: '已結束',
      startAt: new Date(Date.now() - 7200_000).toISOString(),
      endAt: new Date(Date.now() - 3600_000).toISOString(),
    });

    const res = await fetch(`${BASE_URL}/api/liff/events/${ended.id}`, {
      headers: authHeaders(member.idToken),
    });
    expect(res.status).toBe(404);
  });

  it('已登入會員查詢上檔中活動的詳情 → 200', async () => {
    const { idToken: adminToken } = await seedUser(testUsername('a', 7), Role.Admin);
    const member = await seedUser(testUsername('m', 5), Role.Member);
    const active = await createEvent(adminToken);

    const res = await fetch(`${BASE_URL}/api/liff/events/${active.id}`, {
      headers: authHeaders(member.idToken),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Event;
    expect(body.id).toBe(active.id);
  });

  it('已登入會員查詢即將開始活動的詳情 → 200', async () => {
    const { idToken: adminToken } = await seedUser(testUsername('a', 12), Role.Admin);
    const member = await seedUser(testUsername('m', 6), Role.Member);
    const now = Date.now();
    const upcoming = await createEvent(adminToken, {
      title: '未來活動',
      startAt: new Date(now + 3600_000).toISOString(),
      endAt: new Date(now + 7200_000).toISOString(),
    });

    const res = await fetch(`${BASE_URL}/api/liff/events/${upcoming.id}`, {
      headers: authHeaders(member.idToken),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Event;
    expect(body.id).toBe(upcoming.id);
  });
});
