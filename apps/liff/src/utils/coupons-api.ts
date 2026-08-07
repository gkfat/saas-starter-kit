import type { CouponInstanceDetail } from '@saas-starter-kit/shared';
import { apiFetch } from './api-client';
import { getFreshIdToken } from './auth-token';

async function authHeaders(): Promise<Record<string, string>> {
  const idToken = await getFreshIdToken();
  return { Authorization: `Bearer ${idToken ?? ''}` };
}

export async function fetchMyCoupons(): Promise<CouponInstanceDetail[]> {
  return apiFetch<CouponInstanceDetail[]>('/api/liff/coupons', {
    headers: await authHeaders(),
  });
}

export async function fetchCouponDetail(id: string): Promise<CouponInstanceDetail> {
  return apiFetch<CouponInstanceDetail>(`/api/liff/coupons/${id}`, {
    headers: await authHeaders(),
  });
}
