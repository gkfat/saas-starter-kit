import { randomUUID } from 'node:crypto';
import type { Query } from 'firebase-admin/firestore';
import { adminDb } from '../../shared/firebase-admin';
import { prefixCollection } from '../../shared/firestore-prefix';
import type {
  Booking,
  BookingProvider,
  BookingProviderWorkingHours,
  BookingService,
  BookingSlotTemplate,
  BookingTimeSlot,
} from './booking.types';

function servicesCollection() {
  return adminDb().collection(prefixCollection('booking_services'));
}

function timeSlotsCollection() {
  return adminDb().collection(prefixCollection('booking_time_slots'));
}

function slotTemplatesCollection() {
  return adminDb().collection(prefixCollection('booking_slot_templates'));
}

function providersCollection() {
  return adminDb().collection(prefixCollection('booking_providers'));
}

function bookingsCollection() {
  return adminDb().collection(prefixCollection('bookings'));
}

function timeSlotRef(id: string) {
  return timeSlotsCollection().doc(id);
}

function slotTemplateRef(id: string) {
  return slotTemplatesCollection().doc(id);
}

export async function listServices(): Promise<BookingService[]> {
  const snapshot = await servicesCollection().orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => doc.data() as BookingService);
}

export async function getServiceById(id: string): Promise<BookingService | null> {
  const snap = await servicesCollection().doc(id).get();
  return snap.exists ? (snap.data() as BookingService) : null;
}

export async function createService(service: BookingService): Promise<void> {
  await servicesCollection().doc(service.id).set(service);
}

export async function updateService(
  id: string,
  patch: Partial<Omit<BookingService, 'id' | 'createdAt'>>,
): Promise<void> {
  await servicesCollection().doc(id).update(patch);
}

// Sorted in-memory rather than `.orderBy('startAt')` combined with the `where` equality
// filter — that pairing needs a composite (serviceId, startAt) Firestore index; time slot
// counts per service are expected to stay small (same assumption as events/coupons in this
// codebase), so avoid the index for now.
export async function listTimeSlotsByService(serviceId: string): Promise<BookingTimeSlot[]> {
  const snapshot = await timeSlotsCollection().where('serviceId', '==', serviceId).get();
  return snapshot.docs
    .map((doc) => doc.data() as BookingTimeSlot)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export async function getTimeSlotById(id: string): Promise<BookingTimeSlot | null> {
  const snap = await timeSlotRef(id).get();
  return snap.exists ? (snap.data() as BookingTimeSlot) : null;
}

export async function createTimeSlot(slot: BookingTimeSlot): Promise<void> {
  await timeSlotRef(slot.id).set(slot);
}

export async function updateTimeSlot(
  id: string,
  patch: Partial<Omit<BookingTimeSlot, 'id' | 'serviceId' | 'createdAt'>>,
): Promise<void> {
  await timeSlotRef(id).update(patch);
}

export async function deleteTimeSlot(id: string): Promise<void> {
  await timeSlotRef(id).delete();
}

/**
 * Creates one time slot per input entry, skipping any whose exact (startAt, endAt) pair
 * already exists for this service — a cheap safety net so re-applying the same template
 * twice doesn't spam duplicate slots. Uses a single batch write (Firestore batches cap at
 * 500 writes; template date ranges are expected to stay well under that per apply).
 */
export async function bulkCreateTimeSlots(
  serviceId: string,
  slots: Array<{ startAt: string; endAt: string; capacity: number }>,
): Promise<{ created: BookingTimeSlot[]; skippedCount: number }> {
  const existing = await listTimeSlotsByService(serviceId);
  const existingKeys = new Set(existing.map((slot) => `${slot.startAt}|${slot.endAt}`));

  const now = new Date().toISOString();
  const batch = adminDb().batch();
  const created: BookingTimeSlot[] = [];
  let skippedCount = 0;

  for (const input of slots) {
    const key = `${input.startAt}|${input.endAt}`;
    if (existingKeys.has(key)) {
      skippedCount += 1;
      continue;
    }
    existingKeys.add(key);

    const slot: BookingTimeSlot = {
      id: randomUUID(),
      serviceId,
      startAt: input.startAt,
      endAt: input.endAt,
      capacity: input.capacity,
      confirmedCount: 0,
      pendingCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(timeSlotRef(slot.id), slot);
    created.push(slot);
  }

  if (created.length > 0) await batch.commit();
  return { created, skippedCount };
}

export async function listSlotTemplates(): Promise<BookingSlotTemplate[]> {
  const snapshot = await slotTemplatesCollection().orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => doc.data() as BookingSlotTemplate);
}

export async function getSlotTemplateById(id: string): Promise<BookingSlotTemplate | null> {
  const snap = await slotTemplateRef(id).get();
  return snap.exists ? (snap.data() as BookingSlotTemplate) : null;
}

export async function createSlotTemplate(template: BookingSlotTemplate): Promise<void> {
  await slotTemplateRef(template.id).set(template);
}

export async function updateSlotTemplate(
  id: string,
  patch: Partial<Omit<BookingSlotTemplate, 'id' | 'createdAt'>>,
): Promise<void> {
  await slotTemplateRef(id).update(patch);
}

export async function deleteSlotTemplate(id: string): Promise<void> {
  await slotTemplateRef(id).delete();
}

export async function listProviders(): Promise<BookingProvider[]> {
  const snapshot = await providersCollection().orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => doc.data() as BookingProvider);
}

export async function getProviderById(id: string): Promise<BookingProvider | null> {
  const snap = await providersCollection().doc(id).get();
  return snap.exists ? (snap.data() as BookingProvider) : null;
}

export async function createProvider(provider: BookingProvider): Promise<void> {
  await providersCollection().doc(provider.id).set(provider);
}

export async function updateProvider(
  id: string,
  patch: {
    name?: string;
    workingHours?: BookingProviderWorkingHours | null;
    enabled?: boolean;
    serviceIds?: string[];
  },
): Promise<void> {
  await providersCollection().doc(id).update(patch);
}

export async function getBookingById(id: string): Promise<Booking | null> {
  const snap = await bookingsCollection().doc(id).get();
  return snap.exists ? (snap.data() as Booking) : null;
}

// All filters are plain equality `where` clauses, so Firestore can combine any subset of
// them without a composite index (composite indexes are only required once an inequality
// or `orderBy` on a different field joins the mix — see queryOverduePendingBookings below).
export async function listBookings(filter: {
  serviceId?: string;
  timeSlotId?: string;
  status?: Booking['status'];
  memberId?: string;
  providerId?: string;
}): Promise<Booking[]> {
  let query: Query = bookingsCollection();
  if (filter.serviceId) query = query.where('serviceId', '==', filter.serviceId);
  if (filter.timeSlotId) query = query.where('timeSlotId', '==', filter.timeSlotId);
  if (filter.status) query = query.where('status', '==', filter.status);
  if (filter.memberId) query = query.where('memberId', '==', filter.memberId);
  if (filter.providerId) query = query.where('providerId', '==', filter.providerId);

  const snapshot = await query.get();
  return snapshot.docs
    .map((doc) => doc.data() as Booking)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Offset-paginated, `createdAt` descending version of `listBookings` for the admin bookings
 * list — supports jumping directly to any page (unlike cursor pagination), which is what lets
 * the admin UI use Vuetify's own default `v-data-table-server` pager (page numbers, first/last,
 * exact "X-Y of Z"). Combining any of `serviceId`/`status`/`memberId` with `orderBy('createdAt')`
 * needs a composite index per combination (unlike `listBookings` above, which has no `orderBy`
 * and so needs none) — see `firebase.indexes.json` for the `bookings` collection. `timeSlotId`/
 * `providerId` are intentionally not covered by a composite index here (not exposed by the
 * admin filter UI); combining either with pagination will surface Firestore's own
 * failed-precondition error with a direct link to create the missing index on demand.
 *
 * `.offset()` still reads and discards the skipped documents server-side, so cost grows with
 * page depth — an accepted tradeoff for an internal admin list at modest volume, not something
 * to reach for on a large public-facing collection.
 */
type BookingListFilter = {
  serviceId?: string;
  timeSlotId?: string;
  status?: Booking['status'];
  memberId?: string;
  providerId?: string;
};

function buildBookingsQuery(filter: BookingListFilter): Query {
  let query: Query = bookingsCollection();
  if (filter.serviceId) query = query.where('serviceId', '==', filter.serviceId);
  if (filter.timeSlotId) query = query.where('timeSlotId', '==', filter.timeSlotId);
  if (filter.status) query = query.where('status', '==', filter.status);
  if (filter.memberId) query = query.where('memberId', '==', filter.memberId);
  if (filter.providerId) query = query.where('providerId', '==', filter.providerId);
  return query;
}

export async function listBookingsPage(
  filter: BookingListFilter,
  page: number,
  pageSize: number,
): Promise<{ items: Booking[]; total: number }> {
  const baseQuery = buildBookingsQuery(filter);

  const [snapshot, countSnapshot] = await Promise.all([
    baseQuery
      .orderBy('createdAt', 'desc')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .get(),
    baseQuery.count().get(),
  ]);

  return {
    items: snapshot.docs.map((doc) => doc.data() as Booking),
    total: countSnapshot.data().count,
  };
}

// Requires a composite index (status ASC, reviewDeadlineAt ASC) once this is wired up to a
// scheduler — Firestore does not auto-index equality+range across two different fields
// (same caveat as level.repo.ts's queryDuePeriodsPage).
export async function queryOverduePendingBookings(now: string): Promise<Booking[]> {
  const snapshot = await bookingsCollection()
    .where('status', '==', 'pendingReview')
    .where('reviewDeadlineAt', '<=', now)
    .get();
  return snapshot.docs.map((doc) => doc.data() as Booking);
}

/**
 * Reads the target time slot, lets `compute` (pure decision logic owned by the service
 * layer — capacity check, approvalMode → initial status, reviewDeadlineAt derivation) build
 * the new booking + slot count patch, then writes both atomically so concurrent bookings
 * against the same slot cannot both succeed past capacity (D2).
 */
export async function createBookingTransaction(
  timeSlotId: string,
  compute: (slot: BookingTimeSlot) => {
    booking: Booking;
    slotPatch: Partial<Pick<BookingTimeSlot, 'confirmedCount' | 'pendingCount' | 'updatedAt'>>;
  },
): Promise<Booking> {
  return adminDb().runTransaction(async (tx) => {
    const slotRef = timeSlotRef(timeSlotId);
    const slotSnap = await tx.get(slotRef);
    if (!slotSnap.exists) {
      throw Object.assign(new Error(`time slot ${timeSlotId} not found`), {
        code: 'booking-time-slot-not-found',
      });
    }

    const { booking, slotPatch } = compute(slotSnap.data() as BookingTimeSlot);
    tx.set(bookingsCollection().doc(booking.id), booking);
    tx.update(slotRef, slotPatch);
    return booking;
  });
}

/**
 * Reads the booking and its time slot, lets `compute` (pure decision logic owned by the
 * service layer — ownership/status-machine checks, slot count adjustment) derive the
 * updated booking + slot count patch, then writes both atomically. Shared by review
 * (approve/reject) and cancel, since both are "booking status transition + slot count
 * release" operations.
 */
export async function transitionBookingTransaction(
  bookingId: string,
  compute: (
    booking: Booking,
    slot: BookingTimeSlot,
  ) => {
    updatedBooking: Booking;
    slotPatch: Partial<Pick<BookingTimeSlot, 'confirmedCount' | 'pendingCount' | 'updatedAt'>>;
  },
): Promise<Booking> {
  return adminDb().runTransaction(async (tx) => {
    const bookingRef = bookingsCollection().doc(bookingId);
    const bookingSnap = await tx.get(bookingRef);
    if (!bookingSnap.exists) {
      throw Object.assign(new Error(`booking ${bookingId} not found`), {
        code: 'booking-not-found',
      });
    }

    const booking = bookingSnap.data() as Booking;
    const slotRef = timeSlotRef(booking.timeSlotId);
    const slotSnap = await tx.get(slotRef);
    if (!slotSnap.exists) {
      throw Object.assign(new Error(`time slot ${booking.timeSlotId} not found`), {
        code: 'booking-time-slot-not-found',
      });
    }

    const { updatedBooking, slotPatch } = compute(booking, slotSnap.data() as BookingTimeSlot);
    tx.set(bookingRef, updatedBooking);
    tx.update(slotRef, slotPatch);
    return updatedBooking;
  });
}
