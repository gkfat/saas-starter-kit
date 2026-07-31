import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getClientApp } from '~/utils/firebase-client';
import { useAuthStore } from '~/stores/auth';

export default defineNuxtPlugin(() => {
  const store = useAuthStore();
  const { $api } = useNuxtApp();

  return new Promise<void>((resolve) => {
    const auth = getAuth(getClientApp());
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribe();
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          const user = await $api('/api/auth/me', {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          store.rehydrate(user as Parameters<typeof store.rehydrate>[0], idToken);
        } catch {
          // token invalid; treat as logged out
        }
      }
      store.setReady();
      resolve();
    });
  });
});
