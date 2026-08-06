import { getAuth } from 'firebase/auth';
import { getClientApp } from './firebase-client';

/**
 * Always fetches the current ID token via the Firebase SDK's own cache/refresh logic
 * (no forceRefresh) instead of reusing a token string captured once at login. A token
 * captured once goes stale ~1h after issuance even though the LIFF/LINE-side session is
 * still alive, causing spurious 401 "token expired" responses from the server.
 */
export async function getFreshIdToken(): Promise<string | null> {
  const user = getAuth(getClientApp()).currentUser;
  if (!user) return null;
  return user.getIdToken();
}
