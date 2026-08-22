import { randomUUID } from 'node:crypto';
import { FeatureFlag } from '@saas-starter-kit/shared';
import { notifyBookingEvent } from './booking.notifier';
import {
  bulkCreateTimeSlots as bulkCreateTimeSlotsInRepo,
  createBookingTransaction,
  createProvider as createProviderInRepo,
  createService as createServiceInRepo,
  createSlotTemplate as createSlotTemplateInRepo,
  createTimeSlot as createTimeSlotInRepo,
  deleteSlotTemplate as deleteSlotTemplateInRepo,
  deleteTimeSlot as deleteTimeSlotInRepo,
  getProviderById,
  getServiceById,
  getSlotTemplateById,
  getTimeSlotById,
  listBookings as listBookingsFromRepo,
  listBookingsPage as listBookingsPageFromRepo,
  listProviders as listProvidersFromRepo,
  listServices as listServicesFromRepo,
  listSlotTemplates as listSlotTemplatesFromRepo,
  listTimeSlotsByService as listTimeSlotsByServiceFromRepo,
  queryOverduePendingBookings,
  transitionBookingTransaction,
  updateProvider as updateProviderInRepo,
  updateService as updateServiceInRepo,
  updateSlotTemplate as updateSlotTemplateInRepo,
  updateTimeSlot as updateTimeSlotInRepo,
} from './booking.repo';
import {
  BulkCreateBookingTimeSlotsSchema,
  CreateBookingProviderSchema,
  CreateBookingSchema,
  CreateBookingServiceSchema,
  CreateBookingSlotTemplateSchema,
  CreateBookingTimeSlotSchema,
  ReviewBookingSchema,
  UpdateBookingProviderSchema,
  UpdateBookingServiceSchema,
  UpdateBookingSlotTemplateSchema,
  UpdateBookingTimeSlotSchema,
} from './booking.schema';
import type {
  Booking,
  BookingProvider,
  BookingProviderWorkingHours,
  BookingService,
  BookingSlotTemplate,
  BookingTimeSlot,
  BookingWeekday,
} from './booking.types';

function isBookingEnabled(): boolean {
  return useRuntimeConfig().public.featureFlags[FeatureFlag.Booking];
}

export function requireBookingEnabled(): void {
  if (!isBookingEnabled()) {
    throw Object.assign(new Error('Booking module is disabled'), { code: 'booking-disabled' });
  }
}

function assertSchedule(startAt: string, endAt: string): void {
  if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    throw Object.assign(new Error('endAt must be later than startAt'), {
      code: 'booking-time-slot-invalid-schedule',
    });
  }
}

/**
 * A provider must be explicitly opted in on every axis to be assignable to a given time slot:
 * `enabled` must not be `false`, the slot's service must be in `serviceIds`, and `workingHours`
 * must be set and cover the slot's weekday/time. Unset `workingHours` or `serviceIds` means
 * "not bookable for anything" — admins must configure both before a provider can take bookings.
 */
function isProviderAvailableForSlot(provider: BookingProvider, slot: BookingTimeSlot): boolean {
  if (provider.enabled === false) return false;
  if (!provider.serviceIds?.includes(slot.serviceId)) return false;

  const workingHours = provider.workingHours;
  if (!workingHours) return false;

  const pad = (n: number) => String(n).padStart(2, '0');
  const start = new Date(slot.startAt);
  const end = new Date(slot.endAt);
  const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
  const endTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`;

  return (
    workingHours.weekdays.includes(start.getDay() as BookingWeekday) &&
    startTime >= workingHours.dailyStartTime &&
    endTime <= workingHours.dailyEndTime
  );
}

// ---- Services ----

export async function listBookingServices(): Promise<BookingService[]> {
  requireBookingEnabled();
  return listServicesFromRepo();
}

export async function listVisibleBookingServices(): Promise<BookingService[]> {
  requireBookingEnabled();
  const services = await listServicesFromRepo();
  return services.filter((service) => service.enabled);
}

export async function createBookingService(input: {
  name: string;
  description?: string;
  approvalMode: 'auto' | 'manual';
  enabled?: boolean;
}): Promise<BookingService> {
  requireBookingEnabled();
  const parsed = CreateBookingServiceSchema.parse(input);
  const now = new Date().toISOString();
  const service: BookingService = {
    id: randomUUID(),
    name: parsed.name,
    ...(parsed.description !== undefined ? { description: parsed.description } : {}),
    approvalMode: parsed.approvalMode,
    enabled: parsed.enabled ?? true,
    createdAt: now,
    updatedAt: now,
  };
  await createServiceInRepo(service);
  return service;
}

export async function updateBookingService(
  id: string,
  input: {
    name?: string;
    description?: string;
    approvalMode?: 'auto' | 'manual';
    enabled?: boolean;
  },
): Promise<BookingService> {
  requireBookingEnabled();
  const patch = UpdateBookingServiceSchema.parse(input);
  const existing = await getServiceById(id);
  if (!existing) {
    throw Object.assign(new Error(`booking service ${id} not found`), {
      code: 'booking-service-not-found',
    });
  }

  const updatedAt = new Date().toISOString();
  await updateServiceInRepo(id, { ...patch, updatedAt });
  return { ...existing, ...patch, updatedAt };
}

// ---- Time slots ----

export async function listBookingTimeSlots(serviceId: string): Promise<BookingTimeSlot[]> {
  requireBookingEnabled();
  const service = await getServiceById(serviceId);
  if (!service) {
    throw Object.assign(new Error(`booking service ${serviceId} not found`), {
      code: 'booking-service-not-found',
    });
  }
  return listTimeSlotsByServiceFromRepo(serviceId);
}

export async function listVisibleBookingTimeSlots(serviceId: string): Promise<BookingTimeSlot[]> {
  requireBookingEnabled();
  const service = await getServiceById(serviceId);
  if (!service || !service.enabled) {
    throw Object.assign(new Error(`booking service ${serviceId} not found`), {
      code: 'booking-service-not-found',
    });
  }
  return listTimeSlotsByServiceFromRepo(serviceId);
}

export async function createBookingTimeSlot(
  serviceId: string,
  input: { startAt: string; endAt: string; capacity: number },
): Promise<BookingTimeSlot> {
  requireBookingEnabled();
  const parsed = CreateBookingTimeSlotSchema.parse(input);
  const service = await getServiceById(serviceId);
  if (!service) {
    throw Object.assign(new Error(`booking service ${serviceId} not found`), {
      code: 'booking-service-not-found',
    });
  }
  assertSchedule(parsed.startAt, parsed.endAt);

  const now = new Date().toISOString();
  const slot: BookingTimeSlot = {
    id: randomUUID(),
    serviceId,
    startAt: parsed.startAt,
    endAt: parsed.endAt,
    capacity: parsed.capacity,
    confirmedCount: 0,
    pendingCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await createTimeSlotInRepo(slot);
  return slot;
}

export async function updateBookingTimeSlot(
  serviceId: string,
  slotId: string,
  input: { startAt?: string; endAt?: string; capacity?: number },
): Promise<BookingTimeSlot> {
  requireBookingEnabled();
  const patch = UpdateBookingTimeSlotSchema.parse(input);
  const existing = await getTimeSlotById(slotId);
  if (!existing || existing.serviceId !== serviceId) {
    throw Object.assign(new Error(`time slot ${slotId} not found`), {
      code: 'booking-time-slot-not-found',
    });
  }

  const startAt = patch.startAt ?? existing.startAt;
  const endAt = patch.endAt ?? existing.endAt;
  assertSchedule(startAt, endAt);

  const capacity = patch.capacity ?? existing.capacity;
  const used = existing.confirmedCount + existing.pendingCount;
  if (capacity < used) {
    throw Object.assign(new Error('capacity cannot be lower than the current usage'), {
      code: 'booking-time-slot-capacity-below-usage',
    });
  }

  const updatedAt = new Date().toISOString();
  await updateTimeSlotInRepo(slotId, { ...patch, updatedAt });
  return { ...existing, ...patch, updatedAt };
}

export async function deleteBookingTimeSlot(serviceId: string, slotId: string): Promise<void> {
  requireBookingEnabled();
  const existing = await getTimeSlotById(slotId);
  if (!existing || existing.serviceId !== serviceId) {
    throw Object.assign(new Error(`time slot ${slotId} not found`), {
      code: 'booking-time-slot-not-found',
    });
  }
  if (existing.confirmedCount + existing.pendingCount > 0) {
    throw Object.assign(new Error('cannot delete a time slot that already has bookings'), {
      code: 'booking-time-slot-in-use',
    });
  }
  await deleteTimeSlotInRepo(slotId);
}

export async function bulkCreateBookingTimeSlots(
  serviceId: string,
  input: { slots: Array<{ startAt: string; endAt: string; capacity: number }> },
): Promise<{ created: BookingTimeSlot[]; skippedCount: number }> {
  requireBookingEnabled();
  const parsed = BulkCreateBookingTimeSlotsSchema.parse(input);
  const service = await getServiceById(serviceId);
  if (!service) {
    throw Object.assign(new Error(`booking service ${serviceId} not found`), {
      code: 'booking-service-not-found',
    });
  }
  for (const slot of parsed.slots) assertSchedule(slot.startAt, slot.endAt);

  return bulkCreateTimeSlotsInRepo(serviceId, parsed.slots);
}

// ---- Slot templates ----
// Reusable "generation recipes" (business days + daily hours + granularity + default
// capacity) applied to a Service via bulkCreateBookingTimeSlots above. Templates carry no
// reference to any Service — the slots they produce are independently editable afterward.

export async function listBookingSlotTemplates(): Promise<BookingSlotTemplate[]> {
  requireBookingEnabled();
  return listSlotTemplatesFromRepo();
}

export async function createBookingSlotTemplate(input: {
  name: string;
  weekdays: BookingWeekday[];
  dailyStartTime: string;
  dailyEndTime: string;
  granularityMinutes: 15 | 30 | 60;
  defaultCapacity: number;
}): Promise<BookingSlotTemplate> {
  requireBookingEnabled();
  const parsed = CreateBookingSlotTemplateSchema.parse(input);
  const now = new Date().toISOString();
  const template: BookingSlotTemplate = {
    id: randomUUID(),
    ...parsed,
    createdAt: now,
    updatedAt: now,
  };
  await createSlotTemplateInRepo(template);
  return template;
}

export async function updateBookingSlotTemplate(
  id: string,
  input: {
    name?: string;
    weekdays?: BookingWeekday[];
    dailyStartTime?: string;
    dailyEndTime?: string;
    granularityMinutes?: 15 | 30 | 60;
    defaultCapacity?: number;
  },
): Promise<BookingSlotTemplate> {
  requireBookingEnabled();
  const patch = UpdateBookingSlotTemplateSchema.parse(input);
  const existing = await getSlotTemplateById(id);
  if (!existing) {
    throw Object.assign(new Error(`slot template ${id} not found`), {
      code: 'booking-slot-template-not-found',
    });
  }

  const dailyStartTime = patch.dailyStartTime ?? existing.dailyStartTime;
  const dailyEndTime = patch.dailyEndTime ?? existing.dailyEndTime;
  if (dailyEndTime <= dailyStartTime) {
    throw Object.assign(new Error('dailyEndTime must be later than dailyStartTime'), {
      code: 'booking-slot-template-invalid-schedule',
    });
  }

  const updatedAt = new Date().toISOString();
  await updateSlotTemplateInRepo(id, { ...patch, updatedAt });
  return { ...existing, ...patch, updatedAt };
}

export async function deleteBookingSlotTemplate(id: string): Promise<void> {
  requireBookingEnabled();
  const existing = await getSlotTemplateById(id);
  if (!existing) {
    throw Object.assign(new Error(`slot template ${id} not found`), {
      code: 'booking-slot-template-not-found',
    });
  }
  await deleteSlotTemplateInRepo(id);
}

// ---- Providers ----

/** Admin-facing: returns every provider regardless of `enabled`/`workingHours`, for management. */
export async function listBookingProviders(): Promise<BookingProvider[]> {
  requireBookingEnabled();
  return listProvidersFromRepo();
}

/**
 * Member-facing: only providers that can actually be booked. Always excludes `enabled: false`
 * providers; additionally filters by attendance hours when `timeSlotId` is given.
 */
export async function listBookableBookingProviders(filter?: {
  timeSlotId?: string;
}): Promise<BookingProvider[]> {
  requireBookingEnabled();
  const providers = (await listProvidersFromRepo()).filter(
    (provider) => provider.enabled !== false,
  );
  if (!filter?.timeSlotId) return providers;

  const slot = await getTimeSlotById(filter.timeSlotId);
  // 時段不存在時不過濾——讓上層的預約流程照舊去處理「時段不存在」的錯誤，這裡不重複判斷。
  if (!slot) return providers;

  return providers.filter((provider) => isProviderAvailableForSlot(provider, slot));
}

export async function createBookingProvider(input: {
  name: string;
  workingHours?: BookingProviderWorkingHours;
  enabled?: boolean;
  serviceIds?: string[];
}): Promise<BookingProvider> {
  requireBookingEnabled();
  const parsed = CreateBookingProviderSchema.parse(input);
  const provider: BookingProvider = {
    id: randomUUID(),
    name: parsed.name,
    ...(parsed.workingHours ? { workingHours: parsed.workingHours } : {}),
    enabled: parsed.enabled ?? true,
    ...(parsed.serviceIds ? { serviceIds: parsed.serviceIds } : {}),
    createdAt: new Date().toISOString(),
  };
  await createProviderInRepo(provider);
  return provider;
}

export async function updateBookingProvider(
  id: string,
  input: {
    name?: string;
    workingHours?: BookingProviderWorkingHours | null;
    enabled?: boolean;
    serviceIds?: string[];
  },
): Promise<BookingProvider> {
  requireBookingEnabled();
  const patch = UpdateBookingProviderSchema.parse(input);
  const existing = await getProviderById(id);
  if (!existing) {
    throw Object.assign(new Error(`provider ${id} not found`), {
      code: 'booking-provider-not-found',
    });
  }

  await updateProviderInRepo(id, patch);
  return {
    ...existing,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
    ...(patch.serviceIds !== undefined ? { serviceIds: patch.serviceIds } : {}),
    workingHours:
      patch.workingHours === null ? undefined : (patch.workingHours ?? existing.workingHours),
  };
}

// ---- Bookings ----

export async function createBooking(
  memberId: string,
  input: { serviceId: string; timeSlotId: string; providerId?: string; note?: string },
): Promise<Booking> {
  requireBookingEnabled();
  const parsed = CreateBookingSchema.parse(input);

  const service = await getServiceById(parsed.serviceId);
  if (!service || !service.enabled) {
    throw Object.assign(new Error(`booking service ${parsed.serviceId} not found`), {
      code: 'booking-service-not-found',
    });
  }
  let provider: BookingProvider | null = null;
  if (parsed.providerId) {
    provider = await getProviderById(parsed.providerId);
    if (!provider) {
      throw Object.assign(new Error(`provider ${parsed.providerId} not found`), {
        code: 'booking-provider-not-found',
      });
    }
  }

  const createdAt = new Date().toISOString();
  const booking = await createBookingTransaction(parsed.timeSlotId, (slot) => {
    if (slot.serviceId !== parsed.serviceId) {
      throw Object.assign(new Error(`time slot ${parsed.timeSlotId} not found`), {
        code: 'booking-time-slot-not-found',
      });
    }
    const used = slot.confirmedCount + slot.pendingCount;
    if (used >= slot.capacity) {
      throw Object.assign(new Error('time slot capacity is full'), {
        code: 'booking-time-slot-full',
      });
    }
    // 前端已依出勤時間過濾人員清單，這裡是防止繞過前端直接打 API 指定不可用人員的最後防線。
    if (provider && !isProviderAvailableForSlot(provider, slot)) {
      throw Object.assign(
        new Error(`provider ${provider.id} is not available for this time slot`),
        {
          code: 'booking-provider-not-available',
        },
      );
    }

    const status = service.approvalMode === 'auto' ? 'confirmed' : 'pendingReview';
    const newBooking: Booking = {
      id: randomUUID(),
      memberId,
      serviceId: parsed.serviceId,
      timeSlotId: parsed.timeSlotId,
      ...(parsed.providerId ? { providerId: parsed.providerId } : {}),
      ...(parsed.note ? { note: parsed.note } : {}),
      status,
      createdAt,
      updatedAt: createdAt,
      ...(status === 'pendingReview' ? { reviewDeadlineAt: slot.startAt } : {}),
    };

    return {
      booking: newBooking,
      slotPatch:
        status === 'confirmed'
          ? { confirmedCount: slot.confirmedCount + 1, updatedAt: createdAt }
          : { pendingCount: slot.pendingCount + 1, updatedAt: createdAt },
    };
  });

  notifyBookingEvent(memberId, {
    type: booking.status === 'confirmed' ? 'confirmed' : 'pendingReview',
    booking,
  });
  return booking;
}

export async function listMemberBookings(memberId: string): Promise<Booking[]> {
  requireBookingEnabled();
  return listBookingsFromRepo({ memberId });
}

export async function cancelBooking(bookingId: string, memberId: string): Promise<Booking> {
  requireBookingEnabled();

  const updated = await transitionBookingTransaction(bookingId, (booking, slot) => {
    if (booking.memberId !== memberId) {
      throw Object.assign(new Error('booking does not belong to this member'), {
        code: 'booking-forbidden',
      });
    }
    if (booking.status !== 'confirmed' && booking.status !== 'pendingReview') {
      throw Object.assign(
        new Error(`booking ${bookingId} cannot be cancelled from its current status`),
        {
          code: 'booking-invalid-status-transition',
        },
      );
    }
    if (new Date(slot.startAt).getTime() <= Date.now()) {
      throw Object.assign(new Error('time slot has already started, cannot cancel'), {
        code: 'booking-cancellation-window-closed',
      });
    }

    const updatedAt = new Date().toISOString();
    const updatedBooking: Booking = { ...booking, status: 'cancelled', updatedAt };
    delete updatedBooking.reviewDeadlineAt;

    const slotPatch =
      booking.status === 'confirmed'
        ? { confirmedCount: Math.max(0, slot.confirmedCount - 1), updatedAt }
        : { pendingCount: Math.max(0, slot.pendingCount - 1), updatedAt };

    return { updatedBooking, slotPatch };
  });

  notifyBookingEvent(memberId, { type: 'cancelled', booking: updated });
  return updated;
}

export async function listAdminBookings(filter: {
  serviceId?: string;
  timeSlotId?: string;
  status?: Booking['status'];
  memberId?: string;
  providerId?: string;
}): Promise<Booking[]> {
  requireBookingEnabled();
  return listBookingsFromRepo(filter);
}

export async function listAdminBookingsPage(
  filter: {
    serviceId?: string;
    timeSlotId?: string;
    status?: Booking['status'];
    memberId?: string;
    providerId?: string;
  },
  page: number,
  pageSize: number,
): Promise<{ items: Booking[]; total: number }> {
  requireBookingEnabled();
  return listBookingsPageFromRepo(filter, page, pageSize);
}

export async function reviewBooking(
  bookingId: string,
  input: { status: 'confirmed' | 'rejected' },
): Promise<Booking> {
  requireBookingEnabled();
  const { status: decision } = ReviewBookingSchema.parse(input);

  const updated = await transitionBookingTransaction(bookingId, (booking, slot) => {
    if (booking.status !== 'pendingReview') {
      throw Object.assign(new Error(`booking ${bookingId} is not pending review`), {
        code: 'booking-invalid-status-transition',
      });
    }

    const updatedAt = new Date().toISOString();
    const updatedBooking: Booking = { ...booking, status: decision, updatedAt };
    delete updatedBooking.reviewDeadlineAt;

    const slotPatch =
      decision === 'confirmed'
        ? {
            pendingCount: Math.max(0, slot.pendingCount - 1),
            confirmedCount: slot.confirmedCount + 1,
            updatedAt,
          }
        : { pendingCount: Math.max(0, slot.pendingCount - 1), updatedAt };

    return { updatedBooking, slotPatch };
  });

  notifyBookingEvent(updated.memberId, { type: decision, booking: updated });
  return updated;
}

/**
 * Auto-rejects any `pendingReview` booking whose time slot has already started
 * (`reviewDeadlineAt <= now`), releasing its slot's `pendingCount`. Decision confirmed by
 * the user during /opsx:apply (2026-08-20): overdue reviews auto-reject rather than merely
 * being flagged, since a slot that already started can no longer be honored either way.
 */
export async function processOverdueBookings(now: string = new Date().toISOString()): Promise<{
  processedCount: number;
}> {
  requireBookingEnabled();
  const overdue = await queryOverduePendingBookings(now);

  let processedCount = 0;
  for (const booking of overdue) {
    try {
      const updated = await transitionBookingTransaction(booking.id, (current, slot) => {
        if (current.status !== 'pendingReview') {
          throw Object.assign(new Error(`booking ${booking.id} is no longer pending review`), {
            code: 'booking-invalid-status-transition',
          });
        }
        const updatedAt = new Date().toISOString();
        const updatedBooking: Booking = { ...current, status: 'rejected', updatedAt };
        delete updatedBooking.reviewDeadlineAt;
        return {
          updatedBooking,
          slotPatch: { pendingCount: Math.max(0, slot.pendingCount - 1), updatedAt },
        };
      });
      notifyBookingEvent(updated.memberId, { type: 'rejected', booking: updated });
      processedCount += 1;
    } catch (error) {
      console.error(
        JSON.stringify({
          type: 'api',
          severity: 'ERROR',
          message: 'booking.processOverdueBookings: failed to auto-reject booking',
          bookingId: booking.id,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  return { processedCount };
}
