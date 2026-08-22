/**
 * 整合測試：booking-module 的 booking 模組（server/modules/booking）。
 * 需先啟動 dev server（pnpm dev），預設打 http://localhost:3000，可用 TEST_BASE_URL 環境變數覆寫；
 * 需要一組可用的 Firebase 專案（.env 的 FIREBASE_* / VITE_FIREBASE_API_KEY 變數），
 * 且該專案需已跑過 scripts/seed-rbac.ts（admin 角色需具備 bookings:read/write/review），
 * 並在 .env 設定 FEATURE_BOOKING_ENABLED=true。
 *
 * 未涵蓋：booking feature flag 停用時各 API 回傳 404（比照 level.test.ts/coupons.test.ts，
 * 這類情境需要另開一個 flag=false 的 server process 才能驗證，不適合在本測試檔的單一
 * server process 中涵蓋，本專案其餘模組的整合測試亦未涵蓋此情境）。
 */
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import '../../../scripts/load-root-env';
import { prefixCollection } from '../server/shared/firestore-prefix';
import { Role } from '@saas-starter-kit/shared';
import type {
  Booking,
  BookingProvider,
  BookingService,
  BookingSlotTemplate,
  BookingTimeSlot,
  BulkCreateBookingTimeSlotsResult,
  PaginatedAdminBookingsResponse,
} from '@saas-starter-kit/shared';

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
  'booking-test',
);
const auth = getAuth(app);
const db = getFirestore(app);

const createdUserIds = new Set<string>();
const createdFirebaseUids = new Set<string>();
const createdServiceIds = new Set<string>();
const createdSlotIds = new Set<string>();
const createdBookingIds = new Set<string>();
const createdTemplateIds = new Set<string>();
const createdProviderIds = new Set<string>();

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

function slotRef(id: string) {
  return db.doc(`${prefixCollection('booking_time_slots')}/${id}`);
}

async function createService(
  idToken: string,
  input: { name: string; approvalMode: 'auto' | 'manual'; enabled?: boolean },
): Promise<BookingService> {
  const res = await fetch(`${BASE_URL}/api/admin/booking/services`, {
    method: 'POST',
    headers: authHeaders(idToken),
    body: JSON.stringify(input),
  });
  const service = (await res.json()) as BookingService;
  createdServiceIds.add(service.id);
  return service;
}

async function createSlot(
  idToken: string,
  serviceId: string,
  input: { startAt: string; endAt: string; capacity: number },
): Promise<BookingTimeSlot> {
  const res = await fetch(`${BASE_URL}/api/admin/booking/services/${serviceId}/slots`, {
    method: 'POST',
    headers: authHeaders(idToken),
    body: JSON.stringify(input),
  });
  const slot = (await res.json()) as BookingTimeSlot;
  createdSlotIds.add(slot.id);
  return slot;
}

function inHours(hours: number): string {
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

function isoDateInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function createSlotTemplate(
  idToken: string,
  input: {
    name: string;
    weekdays: number[];
    dailyStartTime: string;
    dailyEndTime: string;
    granularityMinutes: 15 | 30 | 60;
    defaultCapacity: number;
  },
): Promise<BookingSlotTemplate> {
  const res = await fetch(`${BASE_URL}/api/admin/booking/slot-templates`, {
    method: 'POST',
    headers: authHeaders(idToken),
    body: JSON.stringify(input),
  });
  const template = (await res.json()) as BookingSlotTemplate;
  createdTemplateIds.add(template.id);
  return template;
}

async function createProvider(
  idToken: string,
  input: {
    name: string;
    workingHours?: { weekdays: number[]; dailyStartTime: string; dailyEndTime: string };
    enabled?: boolean;
    serviceIds?: string[];
  },
): Promise<BookingProvider> {
  const res = await fetch(`${BASE_URL}/api/admin/booking/providers`, {
    method: 'POST',
    headers: authHeaders(idToken),
    body: JSON.stringify(input),
  });
  const provider = (await res.json()) as BookingProvider;
  createdProviderIds.add(provider.id);
  return provider;
}

/** 依 ISO 字串推算 `isProviderAvailableForSlot()` 比對用的 weekday（0=日～6=六）與 `HH:mm`。 */
function weekdayAndTimeOf(iso: string): { weekday: number; time: string } {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    weekday: date.getDay(),
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
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
    [...createdBookingIds].map((id) =>
      db
        .doc(`${prefixCollection('bookings')}/${id}`)
        .delete()
        .catch(() => {}),
    ),
  );
  await Promise.all(
    [...createdSlotIds].map((id) =>
      slotRef(id)
        .delete()
        .catch(() => {}),
    ),
  );
  await Promise.all(
    [...createdServiceIds].map((id) =>
      db
        .doc(`${prefixCollection('booking_services')}/${id}`)
        .delete()
        .catch(() => {}),
    ),
  );
  await Promise.all(
    [...createdTemplateIds].map((id) =>
      db
        .doc(`${prefixCollection('booking_slot_templates')}/${id}`)
        .delete()
        .catch(() => {}),
    ),
  );
  await Promise.all(
    [...createdProviderIds].map((id) =>
      db
        .doc(`${prefixCollection('booking_providers')}/${id}`)
        .delete()
        .catch(() => {}),
    ),
  );
});

describe('服務項目管理（admin/booking/services）', () => {
  it('建立服務項目缺少必填欄位 → 400', async () => {
    const { idToken } = await seedUser(testUsername('a', 1), Role.Admin);
    const res = await fetch(`${BASE_URL}/api/admin/booking/services`, {
      method: 'POST',
      headers: authHeaders(idToken),
      body: JSON.stringify({ description: '缺少 name/approvalMode' }),
    });
    expect(res.status).toBe(400);
  });

  it('建立、編輯服務項目成功', async () => {
    const { idToken } = await seedUser(testUsername('a', 2), Role.Admin);
    const service = await createService(idToken, { name: '剪髮', approvalMode: 'auto' });
    expect(service.enabled).toBe(true);

    const updateRes = await fetch(`${BASE_URL}/api/admin/booking/services/${service.id}`, {
      method: 'PATCH',
      headers: authHeaders(idToken),
      body: JSON.stringify({ enabled: false }),
    });
    expect(updateRes.status).toBe(200);
    const updated = (await updateRes.json()) as BookingService;
    expect(updated.enabled).toBe(false);
  });
});

describe('時段管理（admin/booking/services/:id/slots）', () => {
  it('建立時段時結束時間早於起始時間 → 400', async () => {
    const { idToken } = await seedUser(testUsername('a', 3), Role.Admin);
    const service = await createService(idToken, { name: '按摩', approvalMode: 'auto' });

    const res = await fetch(`${BASE_URL}/api/admin/booking/services/${service.id}/slots`, {
      method: 'POST',
      headers: authHeaders(idToken),
      body: JSON.stringify({ startAt: inHours(2), endAt: inHours(1), capacity: 3 }),
    });
    expect(res.status).toBe(400);
  });

  it('編輯時段容量調降至低於目前已使用量 → 409', async () => {
    const { idToken } = await seedUser(testUsername('a', 4), Role.Admin);
    const service = await createService(idToken, { name: '瑜珈', approvalMode: 'auto' });
    const slot = await createSlot(idToken, service.id, {
      startAt: inHours(1),
      endAt: inHours(2),
      capacity: 2,
    });

    // 兩位不同會員各訂一位，把 confirmedCount 灌到 2（usage = capacity）
    const memberA = await seedUser(testUsername('m', 1), Role.Member);
    const memberB = await seedUser(testUsername('m', 20), Role.Member);
    for (const member of [memberA, memberB]) {
      const bookRes = await fetch(`${BASE_URL}/api/liff/booking/bookings`, {
        method: 'POST',
        headers: authHeaders(member.idToken),
        body: JSON.stringify({ serviceId: service.id, timeSlotId: slot.id }),
      });
      const booking = (await bookRes.json()) as Booking;
      createdBookingIds.add(booking.id);
    }

    // capacity=1 本身是合法的正整數（不會撞到 schema 的 positive 驗證），
    // 但低於目前 usage=2，應被業務規則拒絕，而非被 zod schema 拒絕
    const downsizeRes = await fetch(
      `${BASE_URL}/api/admin/booking/services/${service.id}/slots/${slot.id}`,
      {
        method: 'PATCH',
        headers: authHeaders(idToken),
        body: JSON.stringify({ capacity: 1 }),
      },
    );
    expect(downsizeRes.status).toBe(409);
  });
});

describe('時段樣板（admin/booking/slot-templates）與批次套用（services/:id/slots/bulk）', () => {
  it('dailyEndTime 早於 dailyStartTime → 400', async () => {
    const { idToken } = await seedUser(testUsername('a', 12), Role.Admin);
    const res = await fetch(`${BASE_URL}/api/admin/booking/slot-templates`, {
      method: 'POST',
      headers: authHeaders(idToken),
      body: JSON.stringify({
        name: '不合法樣板',
        weekdays: [1, 3, 5],
        dailyStartTime: '17:00',
        dailyEndTime: '09:00',
        granularityMinutes: 30,
        defaultCapacity: 2,
      }),
    });
    expect(res.status).toBe(400);
  });

  it('建立樣板、編輯樣板、刪除樣板', async () => {
    const { idToken } = await seedUser(testUsername('a', 13), Role.Admin);
    const template = await createSlotTemplate(idToken, {
      name: '平日晨課',
      weekdays: [1, 3, 5],
      dailyStartTime: '09:00',
      dailyEndTime: '11:00',
      granularityMinutes: 30,
      defaultCapacity: 4,
    });
    expect(template.weekdays).toEqual([1, 3, 5]);

    const updateRes = await fetch(`${BASE_URL}/api/admin/booking/slot-templates/${template.id}`, {
      method: 'PATCH',
      headers: authHeaders(idToken),
      body: JSON.stringify({ defaultCapacity: 6 }),
    });
    expect(updateRes.status).toBe(200);
    const updated = (await updateRes.json()) as BookingSlotTemplate;
    expect(updated.defaultCapacity).toBe(6);

    const deleteRes = await fetch(`${BASE_URL}/api/admin/booking/slot-templates/${template.id}`, {
      method: 'DELETE',
      headers: authHeaders(idToken),
    });
    expect(deleteRes.status).toBe(200);
    createdTemplateIds.delete(template.id);

    const listRes = await fetch(`${BASE_URL}/api/admin/booking/slot-templates`, {
      headers: authHeaders(idToken),
    });
    const list = (await listRes.json()) as BookingSlotTemplate[];
    expect(list.some((t) => t.id === template.id)).toBe(false);
  });

  it('批次套用樣板產生的時段數符合切分粒度計算，且重複套用會略過已存在的時段', async () => {
    const { idToken } = await seedUser(testUsername('a', 14), Role.Admin);
    const service = await createService(idToken, { name: '游泳教學', approvalMode: 'auto' });

    // 09:00–11:00、每 30 分鐘一段 → 每天 4 段，共 2 天 = 8 段
    const date1 = isoDateInDays(3);
    const date2 = isoDateInDays(4);
    const slots = [date1, date2].flatMap((date) =>
      Array.from({ length: 4 }, (_, i) => {
        const startHour = 9 + Math.floor((i * 30) / 60);
        const startMinute = (i * 30) % 60;
        const endTotal = i * 30 + 30;
        const endHour = 9 + Math.floor(endTotal / 60);
        const endMinute = endTotal % 60;
        const pad = (n: number) => String(n).padStart(2, '0');
        return {
          startAt: `${date}T${pad(startHour)}:${pad(startMinute)}:00.000Z`,
          endAt: `${date}T${pad(endHour)}:${pad(endMinute)}:00.000Z`,
          capacity: 5,
        };
      }),
    );
    expect(slots).toHaveLength(8);

    const firstRes = await fetch(
      `${BASE_URL}/api/admin/booking/services/${service.id}/slots/bulk`,
      {
        method: 'POST',
        headers: authHeaders(idToken),
        body: JSON.stringify({ slots }),
      },
    );
    expect(firstRes.status).toBe(200);
    const firstResult = (await firstRes.json()) as BulkCreateBookingTimeSlotsResult;
    expect(firstResult.created).toHaveLength(8);
    expect(firstResult.skippedCount).toBe(0);
    for (const slot of firstResult.created) createdSlotIds.add(slot.id);

    // 重複套用同一批 slots → 全部應被視為重複而略過
    const secondRes = await fetch(
      `${BASE_URL}/api/admin/booking/services/${service.id}/slots/bulk`,
      {
        method: 'POST',
        headers: authHeaders(idToken),
        body: JSON.stringify({ slots }),
      },
    );
    const secondResult = (await secondRes.json()) as BulkCreateBookingTimeSlotsResult;
    expect(secondResult.created).toHaveLength(0);
    expect(secondResult.skippedCount).toBe(8);

    const listRes = await fetch(`${BASE_URL}/api/admin/booking/services/${service.id}/slots`, {
      headers: authHeaders(idToken),
    });
    const list = (await listRes.json()) as BookingTimeSlot[];
    expect(list).toHaveLength(8); // 沒有因重複套用而產生額外時段
  });
});

describe('會員建立預約（liff/booking/bookings）：容量與 approvalMode', () => {
  it('auto 模式容量內建立 → confirmed；容量已滿 → 409', async () => {
    const { idToken: adminToken } = await seedUser(testUsername('a', 5), Role.Admin);
    const service = await createService(adminToken, { name: '游泳課', approvalMode: 'auto' });
    const slot = await createSlot(adminToken, service.id, {
      startAt: inHours(1),
      endAt: inHours(2),
      capacity: 1,
    });

    const memberA = await seedUser(testUsername('m', 2), Role.Member);
    const resA = await fetch(`${BASE_URL}/api/liff/booking/bookings`, {
      method: 'POST',
      headers: authHeaders(memberA.idToken),
      body: JSON.stringify({ serviceId: service.id, timeSlotId: slot.id }),
    });
    expect(resA.status).toBe(200);
    const bookingA = (await resA.json()) as Booking;
    createdBookingIds.add(bookingA.id);
    expect(bookingA.status).toBe('confirmed');

    const memberB = await seedUser(testUsername('m', 3), Role.Member);
    const resB = await fetch(`${BASE_URL}/api/liff/booking/bookings`, {
      method: 'POST',
      headers: authHeaders(memberB.idToken),
      body: JSON.stringify({ serviceId: service.id, timeSlotId: slot.id }),
    });
    expect(resB.status).toBe(409);
  });

  it('manual 模式建立 → pendingReview，且 reviewDeadlineAt 等於時段 startAt', async () => {
    const { idToken: adminToken } = await seedUser(testUsername('a', 6), Role.Admin);
    const service = await createService(adminToken, { name: '諮詢', approvalMode: 'manual' });
    const startAt = inHours(3);
    const slot = await createSlot(adminToken, service.id, {
      startAt,
      endAt: inHours(4),
      capacity: 2,
    });

    const member = await seedUser(testUsername('m', 4), Role.Member);
    const res = await fetch(`${BASE_URL}/api/liff/booking/bookings`, {
      method: 'POST',
      headers: authHeaders(member.idToken),
      body: JSON.stringify({ serviceId: service.id, timeSlotId: slot.id }),
    });
    expect(res.status).toBe(200);
    const booking = (await res.json()) as Booking;
    createdBookingIds.add(booking.id);
    expect(booking.status).toBe('pendingReview');
    expect(booking.reviewDeadlineAt).toBe(startAt);
  });

  it('併發建立僅一方成功（剩餘容量 1）', async () => {
    const { idToken: adminToken } = await seedUser(testUsername('a', 7), Role.Admin);
    const service = await createService(adminToken, { name: '拳擊課', approvalMode: 'auto' });
    const slot = await createSlot(adminToken, service.id, {
      startAt: inHours(1),
      endAt: inHours(2),
      capacity: 1,
    });

    const memberA = await seedUser(testUsername('m', 5), Role.Member);
    const memberB = await seedUser(testUsername('m', 6), Role.Member);

    const [resA, resB] = await Promise.all([
      fetch(`${BASE_URL}/api/liff/booking/bookings`, {
        method: 'POST',
        headers: authHeaders(memberA.idToken),
        body: JSON.stringify({ serviceId: service.id, timeSlotId: slot.id }),
      }),
      fetch(`${BASE_URL}/api/liff/booking/bookings`, {
        method: 'POST',
        headers: authHeaders(memberB.idToken),
        body: JSON.stringify({ serviceId: service.id, timeSlotId: slot.id }),
      }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);

    const winner = resA.status === 200 ? resA : resB;
    const winnerBooking = (await winner.json()) as Booking;
    createdBookingIds.add(winnerBooking.id);

    const slotAfter = (await slotRef(slot.id).get()).data() as BookingTimeSlot;
    expect(slotAfter.confirmedCount).toBe(1);
  });
});

describe('審核流程（admin/booking/bookings/:id）', () => {
  it('核准/拒絕待審核預約；非 pendingReview 狀態再次審核 → 409', async () => {
    const { idToken: adminToken } = await seedUser(testUsername('a', 8), Role.Admin);
    const service = await createService(adminToken, { name: '個人教練', approvalMode: 'manual' });
    const slot = await createSlot(adminToken, service.id, {
      startAt: inHours(1),
      endAt: inHours(2),
      capacity: 2,
    });
    const member = await seedUser(testUsername('m', 7), Role.Member);

    const bookRes = await fetch(`${BASE_URL}/api/liff/booking/bookings`, {
      method: 'POST',
      headers: authHeaders(member.idToken),
      body: JSON.stringify({ serviceId: service.id, timeSlotId: slot.id }),
    });
    const booking = (await bookRes.json()) as Booking;
    createdBookingIds.add(booking.id);

    const approveRes = await fetch(`${BASE_URL}/api/admin/booking/bookings/${booking.id}`, {
      method: 'PATCH',
      headers: authHeaders(adminToken),
      body: JSON.stringify({ status: 'confirmed' }),
    });
    expect(approveRes.status).toBe(200);
    const approved = (await approveRes.json()) as Booking;
    expect(approved.status).toBe('confirmed');
    expect(approved.reviewDeadlineAt).toBeUndefined();

    const slotAfter = (await slotRef(slot.id).get()).data() as BookingTimeSlot;
    expect(slotAfter.confirmedCount).toBe(1);
    expect(slotAfter.pendingCount).toBe(0);

    const reReviewRes = await fetch(`${BASE_URL}/api/admin/booking/bookings/${booking.id}`, {
      method: 'PATCH',
      headers: authHeaders(adminToken),
      body: JSON.stringify({ status: 'rejected' }),
    });
    expect(reReviewRes.status).toBe(409);
  });
});

describe('取消流程（liff/booking/bookings/:id）', () => {
  it('本人於時段開始前取消成功，計數釋放', async () => {
    const { idToken: adminToken } = await seedUser(testUsername('a', 9), Role.Admin);
    const service = await createService(adminToken, { name: '皮拉提斯', approvalMode: 'auto' });
    const slot = await createSlot(adminToken, service.id, {
      startAt: inHours(1),
      endAt: inHours(2),
      capacity: 2,
    });
    const member = await seedUser(testUsername('m', 8), Role.Member);

    const bookRes = await fetch(`${BASE_URL}/api/liff/booking/bookings`, {
      method: 'POST',
      headers: authHeaders(member.idToken),
      body: JSON.stringify({ serviceId: service.id, timeSlotId: slot.id }),
    });
    const booking = (await bookRes.json()) as Booking;
    createdBookingIds.add(booking.id);

    const cancelRes = await fetch(`${BASE_URL}/api/liff/booking/bookings/${booking.id}`, {
      method: 'PATCH',
      headers: authHeaders(member.idToken),
      body: JSON.stringify({ status: 'cancelled' }),
    });
    expect(cancelRes.status).toBe(200);
    const cancelled = (await cancelRes.json()) as Booking;
    expect(cancelled.status).toBe('cancelled');

    const slotAfter = (await slotRef(slot.id).get()).data() as BookingTimeSlot;
    expect(slotAfter.confirmedCount).toBe(0);
  });

  it('取消他人的預約 → 403', async () => {
    const { idToken: adminToken } = await seedUser(testUsername('a', 10), Role.Admin);
    const service = await createService(adminToken, { name: '飛輪課', approvalMode: 'auto' });
    const slot = await createSlot(adminToken, service.id, {
      startAt: inHours(1),
      endAt: inHours(2),
      capacity: 2,
    });
    const owner = await seedUser(testUsername('m', 9), Role.Member);
    const intruder = await seedUser(testUsername('m', 10), Role.Member);

    const bookRes = await fetch(`${BASE_URL}/api/liff/booking/bookings`, {
      method: 'POST',
      headers: authHeaders(owner.idToken),
      body: JSON.stringify({ serviceId: service.id, timeSlotId: slot.id }),
    });
    const booking = (await bookRes.json()) as Booking;
    createdBookingIds.add(booking.id);

    const cancelRes = await fetch(`${BASE_URL}/api/liff/booking/bookings/${booking.id}`, {
      method: 'PATCH',
      headers: authHeaders(intruder.idToken),
      body: JSON.stringify({ status: 'cancelled' }),
    });
    expect(cancelRes.status).toBe(403);
  });

  it('時段已開始後取消 → 409', async () => {
    const { idToken: adminToken } = await seedUser(testUsername('a', 11), Role.Admin);
    const service = await createService(adminToken, { name: '深蹲挑戰', approvalMode: 'auto' });
    const slot = await createSlot(adminToken, service.id, {
      startAt: inHours(1),
      endAt: inHours(2),
      capacity: 2,
    });
    const member = await seedUser(testUsername('m', 11), Role.Member);

    const bookRes = await fetch(`${BASE_URL}/api/liff/booking/bookings`, {
      method: 'POST',
      headers: authHeaders(member.idToken),
      body: JSON.stringify({ serviceId: service.id, timeSlotId: slot.id }),
    });
    const booking = (await bookRes.json()) as Booking;
    createdBookingIds.add(booking.id);

    // 直接把時段起始時間改到過去，模擬「時段已開始」而不必真的等待
    await slotRef(slot.id).update({ startAt: new Date(Date.now() - 60_000).toISOString() });

    const cancelRes = await fetch(`${BASE_URL}/api/liff/booking/bookings/${booking.id}`, {
      method: 'PATCH',
      headers: authHeaders(member.idToken),
      body: JSON.stringify({ status: 'cancelled' }),
    });
    expect(cancelRes.status).toBe(409);
  });
});

describe('Admin API 權限檢查（bookings:read/write/review）', () => {
  it('member 角色（無 bookings:* 權限）呼叫 admin booking API → 403', async () => {
    const { idToken } = await seedUser(testUsername('m', 12), Role.Member);

    const listServices = await fetch(`${BASE_URL}/api/admin/booking/services`, {
      headers: authHeaders(idToken),
    });
    expect(listServices.status).toBe(403);

    const createServiceRes = await fetch(`${BASE_URL}/api/admin/booking/services`, {
      method: 'POST',
      headers: authHeaders(idToken),
      body: JSON.stringify({ name: 'x', approvalMode: 'auto' }),
    });
    expect(createServiceRes.status).toBe(403);

    const listBookings = await fetch(`${BASE_URL}/api/admin/booking/bookings`, {
      headers: authHeaders(idToken),
    });
    expect(listBookings.status).toBe(403);
  });
});

describe('服務人員（admin/booking/providers、liff/booking/providers）', () => {
  it('admin 建立人員後，未帶 timeSlotId 的 LIFF 清單可查得該人員；完整設定出勤/服務指派後可指定其建立預約', async () => {
    const { idToken: adminToken } = await seedUser(testUsername('a', 15), Role.Admin);
    const { idToken: memberToken } = await seedUser(testUsername('m', 21), Role.Member);

    const service = await createService(adminToken, { name: '教練課', approvalMode: 'auto' });
    const slot = await createSlot(adminToken, service.id, {
      startAt: inHours(1),
      endAt: inHours(2),
      capacity: 1,
    });
    const { weekday } = weekdayAndTimeOf(slot.startAt);

    const provider = await createProvider(adminToken, {
      name: `教練${RUN_ID}`,
      enabled: true,
      workingHours: { weekdays: [weekday], dailyStartTime: '00:00', dailyEndTime: '23:59' },
      serviceIds: [service.id],
    });

    const listRes = await fetch(`${BASE_URL}/api/liff/booking/providers`, {
      headers: authHeaders(memberToken),
    });
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()) as BookingProvider[];
    expect(list.some((p) => p.id === provider.id)).toBe(true);

    const bookRes = await fetch(`${BASE_URL}/api/liff/booking/bookings`, {
      method: 'POST',
      headers: authHeaders(memberToken),
      body: JSON.stringify({ serviceId: service.id, timeSlotId: slot.id, providerId: provider.id }),
    });
    expect(bookRes.status).toBe(200);
    const booking = (await bookRes.json()) as Booking;
    createdBookingIds.add(booking.id);
    expect(booking.providerId).toBe(provider.id);
  });

  it('建立預約時指定不可指派（未涵蓋出勤時段/服務）的人員 → 409', async () => {
    const { idToken: adminToken } = await seedUser(testUsername('a', 18), Role.Admin);
    const { idToken: memberToken } = await seedUser(testUsername('m', 23), Role.Member);

    const service = await createService(adminToken, { name: '有氧課', approvalMode: 'auto' });
    const slot = await createSlot(adminToken, service.id, {
      startAt: inHours(1),
      endAt: inHours(2),
      capacity: 1,
    });
    const notConfigured = await createProvider(adminToken, { name: `未設定人員${RUN_ID}` });

    const bookRes = await fetch(`${BASE_URL}/api/liff/booking/bookings`, {
      method: 'POST',
      headers: authHeaders(memberToken),
      body: JSON.stringify({
        serviceId: service.id,
        timeSlotId: slot.id,
        providerId: notConfigured.id,
      }),
    });
    expect(bookRes.status).toBe(409);
  });

  it('依 timeSlotId 篩選：完整設定 enabled/workingHours/serviceIds 的人員才會出現在可指派清單', async () => {
    const { idToken: adminToken } = await seedUser(testUsername('a', 17), Role.Admin);
    const { idToken: memberToken } = await seedUser(testUsername('m', 22), Role.Member);

    const service = await createService(adminToken, { name: '游泳課', approvalMode: 'auto' });
    const slot = await createSlot(adminToken, service.id, {
      startAt: inHours(3),
      endAt: inHours(4),
      capacity: 5,
    });
    const { weekday, time: startTime } = weekdayAndTimeOf(slot.startAt);
    const { time: endTime } = weekdayAndTimeOf(slot.endAt);
    const workingHours = { weekdays: [weekday], dailyStartTime: '00:00', dailyEndTime: '23:59' };
    expect(startTime >= workingHours.dailyStartTime && endTime <= workingHours.dailyEndTime).toBe(
      true,
    );

    const eligible = await createProvider(adminToken, {
      name: `合格教練${RUN_ID}`,
      enabled: true,
      workingHours,
      serviceIds: [service.id],
    });
    const noWorkingHours = await createProvider(adminToken, {
      name: `未設定出勤${RUN_ID}`,
      serviceIds: [service.id],
    });
    const wrongService = await createProvider(adminToken, {
      name: `未指派此服務${RUN_ID}`,
      enabled: true,
      workingHours,
      serviceIds: ['some-other-service'],
    });
    const disabled = await createProvider(adminToken, {
      name: `已下架${RUN_ID}`,
      enabled: false,
      workingHours,
      serviceIds: [service.id],
    });
    const outsideHours = await createProvider(adminToken, {
      name: `出勤時段不涵蓋${RUN_ID}`,
      enabled: true,
      workingHours: {
        weekdays: [(weekday + 1) % 7],
        dailyStartTime: '00:00',
        dailyEndTime: '23:59',
      },
      serviceIds: [service.id],
    });

    const res = await fetch(`${BASE_URL}/api/liff/booking/providers?timeSlotId=${slot.id}`, {
      headers: authHeaders(memberToken),
    });
    expect(res.status).toBe(200);
    const list = (await res.json()) as BookingProvider[];
    const ids = list.map((p) => p.id);

    expect(ids).toContain(eligible.id);
    expect(ids).not.toContain(noWorkingHours.id);
    expect(ids).not.toContain(wrongService.id);
    expect(ids).not.toContain(disabled.id);
    expect(ids).not.toContain(outsideHours.id);
  });
});

describe('刪除時段（admin/booking/services/:id/slots/:slotId DELETE）', () => {
  it('未使用的時段可刪除；已有預約的時段刪除會被拒絕 → 409', async () => {
    const { idToken } = await seedUser(testUsername('a', 16), Role.Admin);
    const service = await createService(idToken, { name: '空手道', approvalMode: 'auto' });

    const unusedSlot = await createSlot(idToken, service.id, {
      startAt: inHours(1),
      endAt: inHours(2),
      capacity: 2,
    });
    const deleteRes = await fetch(
      `${BASE_URL}/api/admin/booking/services/${service.id}/slots/${unusedSlot.id}`,
      { method: 'DELETE', headers: authHeaders(idToken) },
    );
    expect(deleteRes.status).toBe(200);
    createdSlotIds.delete(unusedSlot.id);

    const bookedSlot = await createSlot(idToken, service.id, {
      startAt: inHours(3),
      endAt: inHours(4),
      capacity: 2,
    });
    const { idToken: memberToken } = await seedUser(testUsername('m', 22), Role.Member);
    const bookRes = await fetch(`${BASE_URL}/api/liff/booking/bookings`, {
      method: 'POST',
      headers: authHeaders(memberToken),
      body: JSON.stringify({ serviceId: service.id, timeSlotId: bookedSlot.id }),
    });
    const booking = (await bookRes.json()) as Booking;
    createdBookingIds.add(booking.id);

    const blockedDeleteRes = await fetch(
      `${BASE_URL}/api/admin/booking/services/${service.id}/slots/${bookedSlot.id}`,
      { method: 'DELETE', headers: authHeaders(idToken) },
    );
    expect(blockedDeleteRes.status).toBe(409);
  });
});

describe('預約備註與 admin 列表 join 欄位（GET /api/admin/booking/bookings）', () => {
  it('建立預約時可選填 note，admin 列表回傳 join 後的會員/服務項目/時段資訊', async () => {
    const { idToken: adminToken } = await seedUser(testUsername('a', 17), Role.Admin);
    const service = await createService(adminToken, { name: '按摩課', approvalMode: 'auto' });
    const slot = await createSlot(adminToken, service.id, {
      startAt: inHours(1),
      endAt: inHours(2),
      capacity: 3,
    });

    const memberUsername = testUsername('m', 23);
    const { idToken: memberToken } = await seedUser(memberUsername, Role.Member);
    const bookRes = await fetch(`${BASE_URL}/api/liff/booking/bookings`, {
      method: 'POST',
      headers: authHeaders(memberToken),
      body: JSON.stringify({ serviceId: service.id, timeSlotId: slot.id, note: '請小力一點' }),
    });
    expect(bookRes.status).toBe(200);
    const booking = (await bookRes.json()) as Booking;
    createdBookingIds.add(booking.id);
    expect(booking.note).toBe('請小力一點');

    const listRes = await fetch(`${BASE_URL}/api/admin/booking/bookings?serviceId=${service.id}`, {
      headers: authHeaders(adminToken),
    });
    expect(listRes.status).toBe(200);
    const { items: rows } = (await listRes.json()) as PaginatedAdminBookingsResponse;
    const row = rows.find((r) => r.id === booking.id);
    expect(row).toBeDefined();
    expect(row?.note).toBe('請小力一點');
    expect(row?.serviceName).toBe('按摩課');
    expect(row?.memberDisplayName).toBe(memberUsername);
    expect(row?.timeSlotStartAt).toBe(slot.startAt);
    expect(row?.timeSlotEndAt).toBe(slot.endAt);
  });

  it('note 超過 200 字元 → 400', async () => {
    const { idToken: adminToken } = await seedUser(testUsername('a', 18), Role.Admin);
    const service = await createService(adminToken, { name: '瑜珈課', approvalMode: 'auto' });
    const slot = await createSlot(adminToken, service.id, {
      startAt: inHours(1),
      endAt: inHours(2),
      capacity: 3,
    });

    const { idToken: memberToken } = await seedUser(testUsername('m', 24), Role.Member);
    const bookRes = await fetch(`${BASE_URL}/api/liff/booking/bookings`, {
      method: 'POST',
      headers: authHeaders(memberToken),
      body: JSON.stringify({ serviceId: service.id, timeSlotId: slot.id, note: 'x'.repeat(201) }),
    });
    expect(bookRes.status).toBe(400);
  });

  it('列表依 createdAt 降冪排序，並支援 pageSize/cursor 分頁', async () => {
    const { idToken: adminToken } = await seedUser(testUsername('a', 19), Role.Admin);
    const service = await createService(adminToken, {
      name: '游泳課-分頁測試',
      approvalMode: 'auto',
    });
    const { idToken: memberToken } = await seedUser(testUsername('m', 25), Role.Member);

    // 建立 3 個不同時段，各訂一筆，createdAt 依序遞增（後建立的較新）
    const bookingIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const slot = await createSlot(adminToken, service.id, {
        startAt: inHours(1 + i),
        endAt: inHours(2 + i),
        capacity: 1,
      });
      const bookRes = await fetch(`${BASE_URL}/api/liff/booking/bookings`, {
        method: 'POST',
        headers: authHeaders(memberToken),
        body: JSON.stringify({ serviceId: service.id, timeSlotId: slot.id }),
      });
      const booking = (await bookRes.json()) as Booking;
      createdBookingIds.add(booking.id);
      bookingIds.push(booking.id);
    }

    const firstPageRes = await fetch(
      `${BASE_URL}/api/admin/booking/bookings?serviceId=${service.id}&page=1&pageSize=2`,
      { headers: authHeaders(adminToken) },
    );
    expect(firstPageRes.status).toBe(200);
    const firstPage = (await firstPageRes.json()) as PaginatedAdminBookingsResponse;
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.total).toBe(3);
    // 降冪：最後建立的第 3 筆排最前面
    expect(firstPage.items[0].id).toBe(bookingIds[2]);
    expect(firstPage.items[1].id).toBe(bookingIds[1]);

    const secondPageRes = await fetch(
      `${BASE_URL}/api/admin/booking/bookings?serviceId=${service.id}&page=2&pageSize=2`,
      { headers: authHeaders(adminToken) },
    );
    expect(secondPageRes.status).toBe(200);
    const secondPage = (await secondPageRes.json()) as PaginatedAdminBookingsResponse;
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.items[0].id).toBe(bookingIds[0]);
    expect(secondPage.total).toBe(3);
  });
});
