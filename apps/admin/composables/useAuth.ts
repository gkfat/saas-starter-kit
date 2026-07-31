import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  getAuth,
  linkWithPhoneNumber,
  linkWithPopup,
  onIdTokenChanged,
  signInWithCustomToken,
  signInWithPopup,
  signOut,
  unlink,
  type ConfirmationResult,
} from 'firebase/auth';
import { getClientApp } from '~/utils/firebase-client';
import { useAuthStore } from '~/stores/auth';

type GoogleLoginResult =
  | { status: 'ready' }
  | { status: 'quick-register'; googleEmail: string; displayName: string | null; idToken: string };

// linkWithPopup 內部的「popup 是否被手動關閉」偵測與實際 OAuth 回呼是非同步競態關係：
// 即使 promise 已回報 popup-closed-by-user，Firebase SDK 仍可能稍後才把 auth.currentUser
// 換成彈窗中選擇的 Google 帳號。這裡等待一段緩衝時間，讓該非同步事件有機會浮現後再檢查身份是否被置換。
const LINK_SESSION_CHECK_DELAY_MS = 500;

export function useAuth() {
  const store = useAuthStore();
  const { t } = useI18n();
  const { $api } = useNuxtApp();
  let recaptchaVerifier: RecaptchaVerifier | null = null;

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
    await $api('/api/auth/register', {
      method: 'POST',
      body: { username, password, email, phone },
    });
  }

  async function login(identifier: string, password: string): Promise<void> {
    const auth = getFirebaseAuth();
    const { customToken, ...userData } = await $api<
      { customToken: string } & Parameters<typeof store.rehydrate>[0]
    >('/api/auth/login', { method: 'POST', body: { provider: 'password', identifier, password } });
    const credential = await signInWithCustomToken(auth, customToken);
    const idToken = await credential.user.getIdToken();
    store.rehydrate(userData, idToken);
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

  async function sendPhoneLinkOtp(
    phone: string,
    recaptchaContainerId: string,
  ): Promise<ConfirmationResult> {
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Must be logged in to link phone');

    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
      recaptchaVerifier = null;
    }
    recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, { size: 'invisible' });
    return linkWithPhoneNumber(currentUser, phone, recaptchaVerifier);
  }

  async function confirmPhoneLinkOtp(
    confirmationResult: ConfirmationResult,
    otp: string,
  ): Promise<void> {
    const auth = getFirebaseAuth();
    await confirmationResult.confirm(otp);

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const freshToken = await currentUser.getIdToken(true);
    store.updateIdToken(freshToken);

    await $api('/api/profile/phone', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${freshToken}` },
    });
  }

  async function linkGoogleProvider(): Promise<void> {
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Must be logged in to link Google');

    const originalUid = currentUser.uid;
    let sessionSwapped = false;
    const unsubscribe = onIdTokenChanged(auth, (user) => {
      if (user && user.uid !== originalUid) sessionSwapped = true;
    });

    let linkError: unknown = null;
    try {
      await linkWithPopup(currentUser, new GoogleAuthProvider());
    } catch (e) {
      linkError = e;
    }

    await new Promise((resolve) => setTimeout(resolve, LINK_SESSION_CHECK_DELAY_MS));
    unsubscribe();

    if (sessionSwapped || auth.currentUser?.uid !== originalUid) {
      await signOut(auth);
      store.clearSession();
      throw new Error('auth/session-integrity-check-failed');
    }

    if (linkError) throw linkError;

    const freshToken = await currentUser.getIdToken(true);
    store.updateIdToken(freshToken);

    await $api('/api/profile/google-provider', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${freshToken}` },
    });

    const user = await $api('/api/auth/me', {
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    store.rehydrate(user as Parameters<typeof store.rehydrate>[0], freshToken);
  }

  async function unlinkGoogleProvider(): Promise<void> {
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Must be logged in to unlink Google');

    await unlink(currentUser, GoogleAuthProvider.PROVIDER_ID);

    const freshToken = await currentUser.getIdToken(true);
    store.updateIdToken(freshToken);

    await $api('/api/profile/google-provider', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${freshToken}` },
    });

    const user = await $api('/api/auth/me', {
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    store.rehydrate(user as Parameters<typeof store.rehydrate>[0], freshToken);
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
    sendPhoneLinkOtp,
    confirmPhoneLinkOtp,
    linkGoogleProvider,
    unlinkGoogleProvider,
    logout,
    getLoginErrorMessage,
  };
}
