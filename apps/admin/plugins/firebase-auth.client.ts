import { getAuth, onIdTokenChanged } from 'firebase/auth';
import { getClientApp } from '~/utils/firebase-client';
import { useAuthStore } from '~/stores/auth';

export default defineNuxtPlugin(() => {
  const store = useAuthStore();
  const { $api } = useNuxtApp();

  return new Promise<void>((resolve) => {
    const auth = getAuth(getClientApp());
    let isInitial = true;

    /**
     * onIdTokenChanged 除了初次登入狀態外，也會在 Firebase SDK 自動換發
     * ID token（每小時到期前）時觸發，藉此持續同步 store.idToken，
     * 避免使用者因 token 過期被強制登出。
     */
    onIdTokenChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        if (isInitial) {
          isInitial = false;
          store.setReady();
          resolve();
        }
        return;
      }

      const idToken = await firebaseUser.getIdToken();

      if (!isInitial) {
        store.updateIdToken(idToken);
        return;
      }

      isInitial = false;
      try {
        const user = await $api('/api/auth/me', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        store.rehydrate(user as Parameters<typeof store.rehydrate>[0], idToken);
      } catch {
        // token invalid; treat as logged out
      }
      store.setReady();
      resolve();
    });
  });
});
