import type { Event } from '@saas-starter-kit/shared';
import { apiFetch } from './api-client';
import { getFreshIdToken } from './auth-token';

async function authHeaders(): Promise<Record<string, string>> {
  const idToken = await getFreshIdToken();
  return { Authorization: `Bearer ${idToken ?? ''}` };
}

export async function fetchVisibleEvents(): Promise<Event[]> {
  return apiFetch<Event[]>('/api/liff/events/active', {
    headers: await authHeaders(),
  });
}

export async function fetchEventDetail(id: string): Promise<Event> {
  return apiFetch<Event>(`/api/liff/events/${id}`, {
    headers: await authHeaders(),
  });
}
