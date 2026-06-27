import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getClientApp } from '~/utils/firebase-client';
import { useAuthStore } from '~/stores/auth';

export default defineNuxtPlugin(() => {
  const store = useAuthStore();

  return new Promise<void>((resolve) => {
    const auth = getAuth(getClientApp());
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribe();
      if (firebaseUser) {
        try {
          const result = await firebaseUser.getIdTokenResult();
          const claims = result.claims;
          store.rehydrate(
            {
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? null,
              tenantId: (claims['tenantId'] as string) ?? 'default',
              role: (claims['role'] as string) ?? 'member',
              permissions: (claims['permissions'] as string[]) ?? [],
            },
            result.token,
          );
        } catch {
          // token invalid; treat as logged out
        }
      }
      store.setReady();
      resolve();
    });
  });
});
