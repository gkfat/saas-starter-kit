import { getAuth, signInWithCustomToken } from 'firebase/auth';
import type { AuthUser } from '@saas-starter-kit/shared';
import { getClientApp } from './firebase-client';
import { apiFetch } from './api-client';
import { useAuthStore } from '../stores/auth';

/**
 * Exchanges a Firebase custom token (minted server-side for a LINE identity) for a
 * real Firebase session, then completes login through the shared /api/auth/login
 * endpoint — the same one password/Google logins use — to fetch the AuthUser profile
 * and write the login_log entry.
 */
export async function completeLineSession(customToken: string): Promise<AuthUser> {
  const auth = getAuth(getClientApp());
  const credential = await signInWithCustomToken(auth, customToken);
  const idToken = await credential.user.getIdToken();

  const user = await apiFetch<AuthUser>('/api/auth/login', {
    method: 'POST',
    body: { idToken, provider: 'line' },
  });

  useAuthStore().setSession(user, idToken);
  return user;
}
