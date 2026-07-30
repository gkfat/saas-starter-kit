import { useAuthStore } from '~/stores/auth';

export function useAuthFetch<T>(url: string, options: Parameters<typeof useFetch<T>>[1] = {}) {
  const store = useAuthStore();
  const { open: openSessionExpiredDialog } = useSessionExpiredDialog();

  return useFetch<T>(url, {
    ...options,
    headers: computed(() => ({
      Authorization: `Bearer ${store.idToken ?? ''}`,
      ...(options.headers as Record<string, string> | undefined),
    })),
    onResponseError({ response }) {
      if (isSessionExpired(response.status, response._data?.message)) {
        openSessionExpiredDialog();
      }
    },
  });
}
