import { z } from 'zod';
import {
  listAdminBookingsPage,
  listBookingProviders,
  listBookingServices,
  listBookingTimeSlots,
} from '~/modules/booking';
import { getAllUsers } from '~/modules/users';
import { requirePermission } from '~/shared/rbac';
import { parseOrBadRequest } from '~/shared/validation';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';
import type { PaginatedAdminBookingsResponse } from '@saas-starter-kit/shared';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const QuerySchema = z.object({
  serviceId: z.string().min(1).optional(),
  timeSlotId: z.string().min(1).optional(),
  status: z.enum(['pendingReview', 'confirmed', 'rejected', 'cancelled']).optional(),
  memberId: z.string().min(1).optional(),
  providerId: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
});

export default defineEventHandler(async (event): Promise<PaginatedAdminBookingsResponse> => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Booking]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.Bookings.Read);
  const { page, pageSize, ...filter } = parseOrBadRequest(QuerySchema, getQuery(event));

  const { items: bookings, total } = await listAdminBookingsPage(
    filter,
    page ?? 1,
    pageSize ?? DEFAULT_PAGE_SIZE,
  );

  const [services, users, providers] = await Promise.all([
    listBookingServices(),
    getAllUsers(),
    listBookingProviders(),
  ]);
  const servicesById = new Map(services.map((service) => [service.id, service]));
  const usersById = new Map(users.map((user) => [user.userId, user]));
  const providersById = new Map(providers.map((provider) => [provider.id, provider]));

  const uniqueServiceIds = [...new Set(bookings.map((booking) => booking.serviceId))];
  const slotLists = await Promise.all(
    uniqueServiceIds.map((serviceId) => listBookingTimeSlots(serviceId).catch(() => [])),
  );
  const slotsById = new Map(slotLists.flat().map((slot) => [slot.id, slot]));

  const items = bookings.map((booking) => {
    const user = usersById.get(booking.memberId);
    const slot = slotsById.get(booking.timeSlotId);
    return {
      id: booking.id,
      memberId: booking.memberId,
      memberNo: user?.memberNo ?? booking.memberId,
      memberDisplayName: user?.displayName ?? booking.memberId,
      serviceId: booking.serviceId,
      serviceName: servicesById.get(booking.serviceId)?.name ?? booking.serviceId,
      timeSlotId: booking.timeSlotId,
      timeSlotStartAt: slot?.startAt ?? '',
      timeSlotEndAt: slot?.endAt ?? '',
      ...(booking.providerId
        ? {
            providerId: booking.providerId,
            providerName: providersById.get(booking.providerId)?.name ?? booking.providerId,
          }
        : {}),
      ...(booking.note ? { note: booking.note } : {}),
      status: booking.status,
      createdAt: booking.createdAt,
    };
  });

  return { items, total };
});
