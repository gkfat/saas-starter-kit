import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  getAuth,
  linkWithPhoneNumber,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type ConfirmationResult,
} from 'firebase/auth';
import { getClientApp } from '~/utils/firebase-client';
import { useAuthStore } from '~/stores/auth';

export function useAuth() {
  const store = useAuthStore();
  let recaptchaVerifier: RecaptchaVerifier | null = null;

  function getFirebaseAuth() {
    if (!import.meta.client) throw new Error('Firebase Auth is browser-only');
    return getAuth(getClientApp());
  }

  async function loginWithEmail(email: string, password: string) {
    const auth = getFirebaseAuth();
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await credential.user.getIdToken();
    await store.setSession(idToken, 'email');
  }

  async function loginWithGoogle() {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    const idToken = await credential.user.getIdToken();
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

    // Force refresh so idToken includes phone_number claim
    const freshToken = await currentUser.getIdToken(true);
    store.updateIdToken(freshToken);

    // Persist phone to Firestore user doc
    await $fetch('/api/profile/phone', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${freshToken}` },
    });
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

  return { loginWithEmail, loginWithGoogle, sendPhoneLinkOtp, confirmPhoneLinkOtp, logout };
}
