import { useAuthStore } from '~/stores/auth';

type ApiFetchOptions = NonNullable<Parameters<typeof $fetch>[1]> & {
  /** 略過共用的一般錯誤 toast，讓呼叫端自行處理（401 仍會集中處理） */
  silent?: boolean;
};

export function useApi() {
  const auth = useAuthStore();
  const { showError } = useToast();
  const { open: openSessionExpiredDialog } = useSessionExpiredDialog();
  const { $api } = useNuxtApp();

  async function apiFetch<T>(url: string, options: ApiFetchOptions = {}): Promise<T | null> {
    const { silent, headers, ...rest } = options;
    try {
      const data = await $api(url, {
        ...rest,
        headers: {
          Authorization: `Bearer ${auth.idToken ?? ''}`,
          ...(headers as Record<string, string> | undefined),
        },
      });
      return data as T;
    } catch (e) {
      if (isSessionExpiredError(e)) {
        openSessionExpiredDialog();
        return null;
      }
      if (silent) throw e;
      showError(handleError(e));
      return null;
    }
  }

  return { apiFetch };
}
