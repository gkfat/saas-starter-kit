import { useAuthStore } from '~/stores/auth';

export function useAuthFetch<T>(url: string, options: Parameters<typeof useFetch<T>>[1] = {}) {
  const store = useAuthStore();
  const { open: openSessionExpiredDialog } = useSessionExpiredDialog();
  const { $api } = useNuxtApp();

  return useFetch<T>(url, {
    ...options,
    $fetch: $api as typeof $fetch,
    headers: computed(() => ({
      Authorization: `Bearer ${store.idToken ?? ''}`,
      ...(options.headers as Record<string, string> | undefined),
    })),
    onRequest() {
      if (!store.isLoggedIn) {
        throw new Error('Not logged in');
      }
    },
    onResponseError({ response }) {
      if (isSessionExpired(response.status, response._data?.message)) {
        openSessionExpiredDialog();
      }
    },
  });
}
