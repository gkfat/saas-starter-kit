import { getAuth, signOut } from 'firebase/auth';
import { getClientApp } from '~/utils/firebase-client';
import { useAuthStore } from '~/stores/auth';

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const store = useAuthStore();

  const apiFetch = $fetch.create({
    baseURL: config.public.apiBaseUrl,
    async onResponseError({ response }) {
      if (response.status !== 401 || !store.isLoggedIn) return;

      store.clearSession();
      if (import.meta.client) {
        await signOut(getAuth(getClientApp())).catch(() => {});
        await navigateTo('/login');
      }
    },
  });

  return { provide: { api: apiFetch } };
});
