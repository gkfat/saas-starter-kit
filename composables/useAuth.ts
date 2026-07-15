import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  getAuth,
  linkWithPhoneNumber,
  linkWithPopup,
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

export function useAuth() {
  const store = useAuthStore();
  let recaptchaVerifier: RecaptchaVerifier | null = null;

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
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: { username, password, email, phone },
    });
  }

  async function login(identifier: string, password: string): Promise<void> {
    const auth = getFirebaseAuth();
    const { customToken, ...userData } = await $fetch<
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

    const result = await $fetch<{
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
    await $fetch('/api/auth/google-register', {
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

    await $fetch('/api/profile/phone', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${freshToken}` },
    });
  }

  async function linkGoogleProvider(): Promise<void> {
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Must be logged in to link Google');

    await linkWithPopup(currentUser, new GoogleAuthProvider());

    const freshToken = await currentUser.getIdToken(true);
    store.updateIdToken(freshToken);

    await $fetch('/api/profile/google-provider', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${freshToken}` },
    });

    const user = await $fetch('/api/auth/me', {
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

    await $fetch('/api/profile/google-provider', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${freshToken}` },
    });

    const user = await $fetch('/api/auth/me', {
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
        await $fetch('/api/auth/logout', {
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
  };
}
