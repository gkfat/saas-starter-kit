import liff from '@line/liff';

let initPromise: Promise<void> | null = null;

/**
 * Caches the in-flight init Promise (not just a "did it happen" boolean) so that
 * concurrent callers on the same page load — e.g. a double tap on BindPage's submit
 * button before Vue removes it from the DOM — all await the same single
 * `liff.init()` call instead of racing to start it more than once.
 */
function initLiff(): Promise<void> {
  if (!initPromise) {
    initPromise = liff.init({ liffId: import.meta.env.VITE_LIFF_ID });
  }
  return initPromise;
}

/**
 * `liff.isLoggedIn()` reflects LIFF's own long-lived access-token session, which can
 * stay true long after the cached LINE ID token (a short-lived, one-time OIDC login
 * assertion) has expired — `liff.getIDToken()` does not auto-refresh it, so a stale
 * token gets reused and the server rejects it with "exp claim timestamp check failed"
 * even though the user still appears logged in. Decode (no verification needed
 * client-side) the `exp` claim to detect this before use.
 */
function isIdTokenExpired(idToken: string): boolean {
  try {
    let base64 = idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '='; // atob() requires padded base64, JWT segments omit it
    const payload = JSON.parse(atob(base64));
    return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

/**
 * Resolves a LINE ID Token for the current user.
 *
 * In dev mode, VITE_LIFF_ACCESS_TOKEN can hold a manually-obtained LINE ID token so the
 * rest of the app can be tested without a real, HTTPS-registered LIFF endpoint URL
 * (liff.init() rejects plain http://localhost). Never set this in production.
 */
// Set right before liff.login() redirects away, cleared on a successful token read.
// If we land back here and still can't produce a token, this tells us it's a repeat
// attempt so we surface an error instead of redirecting again — otherwise a LIFF/LINE
// session edge case (e.g. isLoggedIn() never flips true after auth) silently loops
// the user between this app and LINE's login screen forever with no feedback.
const REDIRECT_GUARD_KEY = 'liff_login_redirect_attempted';

export async function getLineIdToken(): Promise<string> {
  const devToken = import.meta.env.VITE_LIFF_ACCESS_TOKEN;
  if (devToken) {
    return devToken;
  }

  await initLiff();

  if (!liff.isLoggedIn()) {
    if (sessionStorage.getItem(REDIRECT_GUARD_KEY)) {
      sessionStorage.removeItem(REDIRECT_GUARD_KEY);
      throw new Error('LINE 登入失敗，請重新嘗試');
    }
    sessionStorage.setItem(REDIRECT_GUARD_KEY, '1');
    liff.login();
    // liff.login() navigates the page away to LINE's login flow; execution resumes
    // on redirect back to this app, so nothing further runs here.
    return new Promise<string>(() => {});
  }

  const idToken = liff.getIDToken();
  if (!idToken || isIdTokenExpired(idToken)) {
    if (sessionStorage.getItem(REDIRECT_GUARD_KEY)) {
      sessionStorage.removeItem(REDIRECT_GUARD_KEY);
      throw new Error('LINE 登入失敗，請重新嘗試');
    }
    sessionStorage.setItem(REDIRECT_GUARD_KEY, '1');
    // liff.isLoggedIn() can still report true off a stale cached accessToken, in which
    // case liff.login() silently reuses that same session instead of re-authenticating —
    // looping forever with the same expired ID token. logout() first forces a clean
    // re-authorization against LINE.
    liff.logout();
    liff.login();
    // liff.login() navigates the page away to LINE's login flow; execution resumes
    // on redirect back to this app, so nothing further runs here.
    return new Promise<string>(() => {});
  }

  sessionStorage.removeItem(REDIRECT_GUARD_KEY);
  return idToken;
}
