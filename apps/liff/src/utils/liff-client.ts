import liff from '@line/liff';

let initialized = false;

async function initLiff(): Promise<void> {
  if (initialized) return;
  await liff.init({ liffId: import.meta.env.VITE_LIFF_ID });
  initialized = true;
}

/**
 * Resolves a LINE ID Token for the current user.
 *
 * In dev mode, VITE_LIFF_ACCESS_TOKEN can hold a manually-obtained LINE ID token so the
 * rest of the app can be tested without a real, HTTPS-registered LIFF endpoint URL
 * (liff.init() rejects plain http://localhost). Never set this in production.
 */
export async function getLineIdToken(): Promise<string> {
  const devToken = import.meta.env.VITE_LIFF_ACCESS_TOKEN;
  if (devToken) {
    return devToken;
  }

  await initLiff();

  if (!liff.isLoggedIn()) {
    liff.login();
    // liff.login() navigates the page away to LINE's login flow; execution resumes
    // on redirect back to this app, so nothing further runs here.
    return new Promise<string>(() => {});
  }

  const idToken = liff.getIDToken();
  if (!idToken) {
    throw new Error('無法取得 LINE ID Token');
  }
  return idToken;
}
