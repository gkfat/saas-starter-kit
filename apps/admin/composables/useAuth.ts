import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { getClientApp } from '~/utils/firebase-client';
import { useAuthStore } from '~/stores/auth';
import { ROUTES } from '~/config/app-routes';
import { toSyntheticEmail } from '@saas-starter-kit/shared';

type GoogleLoginResult =
  | { status: 'ready' }
  | { status: 'quick-register'; googleEmail: string; displayName: string | null; idToken: string };

type LineLoginResult =
  | { status: 'ready' }
  | { status: 'quick-register'; displayName: string | null; idToken: string };

export function useAuth() {
  const store = useAuthStore();
  const router = useRouter();
  const { t } = useI18n();
  const { $api } = useNuxtApp();

  function getLoginErrorMessage(e: unknown): string {
    const code = (e as { code?: string }).code ?? '';
    const map: Record<string, string> = {
      'auth/invalid-credential': t('auth.error.invalidCredential'),
      'auth/wrong-password': t('auth.error.invalidCredential'),
      'auth/user-not-found': t('auth.error.invalidCredential'),
      'auth/invalid-email': t('auth.error.invalidCredential'),
      'auth/user-disabled': t('auth.error.userDisabled'),
      'auth/too-many-requests': t('auth.error.tooManyRequests'),
    };
    return map[code] ?? t('auth.error.default');
  }

  function getFirebaseAuth() {
    if (!import.meta.client) throw new Error('Firebase Auth is browser-only');
    return getAuth(getClientApp());
  }

  async function register(
    username: string,
    password: string,
    email?: string,
    phone?: string,
  ): Promise<void> {
    const auth = getFirebaseAuth();
    const credential = await createUserWithEmailAndPassword(
      auth,
      toSyntheticEmail(username),
      password,
    );
    const idToken = await credential.user.getIdToken();
    try {
      await $api('/api/auth/register', {
        method: 'POST',
        body: { idToken, username, email, phone },
      });
    } finally {
      await signOut(auth);
    }
  }

  async function login(username: string, password: string): Promise<void> {
    const auth = getFirebaseAuth();
    const credential = await signInWithEmailAndPassword(auth, toSyntheticEmail(username), password);
    const idToken = await credential.user.getIdToken();
    await store.setSession(idToken, 'password');
  }

  async function loginWithGoogle(): Promise<GoogleLoginResult> {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    const googleCredential = await signInWithPopup(auth, provider);
    const googleIdToken = await googleCredential.user.getIdToken();

    const result = await $api<{
      status: string;
      googleEmail?: string;
      displayName?: string | null;
    }>('/api/auth/google-login', { method: 'POST', body: { idToken: googleIdToken } });

    if (result.status === 'ready') {
      await store.setSession(googleIdToken, 'google');
      return { status: 'ready' };
    }

    return {
      status: 'quick-register',
      googleEmail: result.googleEmail ?? '',
      displayName: result.displayName ?? null,
      idToken: googleIdToken,
    };
  }

  async function googleRegister(username: string, idToken: string): Promise<void> {
    await $api('/api/auth/google-register', {
      method: 'POST',
      body: { username, idToken },
    });
    await store.setSession(idToken, 'google');
  }

  /**
   * Admin 是一般瀏覽器頁面（非 LIFF app-embedded），無法用 liff.getIDToken()，改導向
   * LINE Login Web OAuth 的 authorize 頁面；state 存 sessionStorage 供 callback 頁比對防 CSRF。
   */
  function loginWithLineRedirect(): void {
    const config = useRuntimeConfig();
    const state = crypto.randomUUID();
    const redirectUri = `${window.location.origin}${ROUTES.lineCallback}`;
    sessionStorage.setItem('line_oauth_state', state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.public.lineChannelId,
      redirect_uri: redirectUri,
      state,
      scope: 'openid profile email',
    });
    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
  }

  async function completeLineLogin(code: string, redirectUri: string): Promise<LineLoginResult> {
    const result = await $api<{
      status: string;
      customToken?: string;
      displayName?: string | null;
      idToken?: string;
    }>('/api/auth/line-callback', { method: 'POST', body: { code, redirectUri } });

    if (result.status === 'ready') {
      const auth = getFirebaseAuth();
      const credential = await signInWithCustomToken(auth, result.customToken as string);
      const idToken = await credential.user.getIdToken();
      await store.setSession(idToken, 'line');
      return { status: 'ready' };
    }

    return {
      status: 'quick-register',
      displayName: result.displayName ?? null,
      idToken: result.idToken as string,
    };
  }

  async function lineRegister(username: string, idToken: string): Promise<void> {
    const result = await $api<{ customToken: string }>('/api/auth/line-register', {
      method: 'POST',
      body: { username, idToken },
    });
    const auth = getFirebaseAuth();
    const credential = await signInWithCustomToken(auth, result.customToken);
    const freshIdToken = await credential.user.getIdToken();
    await store.setSession(freshIdToken, 'line');
  }

  async function linkGoogleProvider(): Promise<void> {
    const ownerIdToken = store.idToken;
    if (!ownerIdToken) throw new Error('Must be logged in to link Google');

    const auth = getFirebaseAuth();
    const googleCredential = await signInWithPopup(auth, new GoogleAuthProvider());
    const googleIdToken = await googleCredential.user.getIdToken();

    await $api('/api/profile/google-provider', {
      method: 'PATCH',
      body: { idToken: googleIdToken },
      headers: { Authorization: `Bearer ${ownerIdToken}` },
    });

    await signOut(auth);
    store.clearSession();
    router.push(ROUTES.login);
  }

  async function unlinkGoogleProvider(): Promise<void> {
    const ownerIdToken = store.idToken;
    if (!ownerIdToken) throw new Error('Must be logged in to unlink Google');

    await $api('/api/profile/google-provider', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerIdToken}` },
    });

    const auth = getFirebaseAuth();
    await signOut(auth);
    store.clearSession();
    router.push(ROUTES.login);
  }

  async function generateLineBindCode(): Promise<{
    code: string;
    expiresInSeconds: number;
    liffUrl: string | null;
  }> {
    const ownerIdToken = store.idToken;
    if (!ownerIdToken) throw new Error('Must be logged in to bind LINE');

    return $api('/api/profile/line-bind-code', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerIdToken}` },
    });
  }

  async function changePassword(newPassword: string, currentPassword?: string): Promise<void> {
    const ownerIdToken = store.idToken;
    if (!ownerIdToken) throw new Error('Must be logged in to change password');

    const auth = getFirebaseAuth();
    const body: { newPassword: string; currentIdToken?: string } = { newPassword };

    if (store.user?.providers.includes('password')) {
      if (!currentPassword) throw new Error('Current password is required');
      const credential = await signInWithEmailAndPassword(
        auth,
        toSyntheticEmail(store.user.username ?? ''),
        currentPassword,
      );
      body.currentIdToken = await credential.user.getIdToken();
    }

    await $api('/api/profile/password', {
      method: 'PATCH',
      body,
      headers: { Authorization: `Bearer ${ownerIdToken}` },
    });

    await signOut(auth);
    store.clearSession();
    router.push(ROUTES.login);
  }

  async function unlinkLineProvider(): Promise<void> {
    const ownerIdToken = store.idToken;
    if (!ownerIdToken) throw new Error('Must be logged in to unlink LINE');

    await $api('/api/profile/line-provider', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerIdToken}` },
    });

    const auth = getFirebaseAuth();
    await signOut(auth);
    store.clearSession();
    router.push(ROUTES.login);
  }

  async function logout() {
    const auth = getFirebaseAuth();
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const freshToken = await currentUser.getIdToken();
        await $api('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${freshToken}` },
        });
      }
    } finally {
      await signOut(auth);
      store.clearSession();
    }
  }

  return {
    register,
    login,
    loginWithGoogle,
    googleRegister,
    loginWithLineRedirect,
    completeLineLogin,
    lineRegister,
    linkGoogleProvider,
    unlinkGoogleProvider,
    changePassword,
    generateLineBindCode,
    unlinkLineProvider,
    logout,
    getLoginErrorMessage,
  };
}
