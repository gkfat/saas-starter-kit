import { useAuthStore } from '~/stores/auth';

export function useAuthFetch<T>(url: string, options: Parameters<typeof useFetch<T>>[1] = {}) {
  const store = useAuthStore();

  return useFetch<T>(url, {
    ...options,
    headers: computed(() => ({
      Authorization: `Bearer ${store.idToken ?? ''}`,
      ...(options.headers as Record<string, string> | undefined),
    })),
  });
}
