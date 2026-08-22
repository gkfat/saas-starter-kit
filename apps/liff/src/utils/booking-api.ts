import type {
  Booking,
  BookingProvider,
  BookingService,
  BookingTimeSlot,
} from '@saas-starter-kit/shared';
import { apiFetch } from './api-client';
import { getFreshIdToken } from './auth-token';

async function authHeaders(): Promise<Record<string, string>> {
  const idToken = await getFreshIdToken();
  return { Authorization: `Bearer ${idToken ?? ''}` };
}

export async function fetchBookingServices(): Promise<BookingService[]> {
  return apiFetch<BookingService[]>('/api/liff/booking/services', {
    headers: await authHeaders(),
  });
}

export async function fetchBookingTimeSlots(serviceId: string): Promise<BookingTimeSlot[]> {
  return apiFetch<BookingTimeSlot[]>(`/api/liff/booking/services/${serviceId}/slots`, {
    headers: await authHeaders(),
  });
}

export async function fetchMyBookings(): Promise<Booking[]> {
  return apiFetch<Booking[]>('/api/liff/booking/bookings', {
    headers: await authHeaders(),
  });
}

export async function fetchBookingProviders(timeSlotId?: string): Promise<BookingProvider[]> {
  const query = timeSlotId ? `?timeSlotId=${encodeURIComponent(timeSlotId)}` : '';
  return apiFetch<BookingProvider[]>(`/api/liff/booking/providers${query}`, {
    headers: await authHeaders(),
  });
}

export async function createBooking(input: {
  serviceId: string;
  timeSlotId: string;
  providerId?: string;
  note?: string;
}): Promise<Booking> {
  return apiFetch<Booking>('/api/liff/booking/bookings', {
    method: 'POST',
    body: input,
    headers: await authHeaders(),
  });
}

export async function cancelBooking(id: string): Promise<Booking> {
  return apiFetch<Booking>(`/api/liff/booking/bookings/${id}`, {
    method: 'PATCH',
    body: { status: 'cancelled' },
    headers: await authHeaders(),
  });
}
