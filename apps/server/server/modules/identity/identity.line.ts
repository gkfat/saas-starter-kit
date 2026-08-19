import { adminAuth } from '../../shared/firebase-admin';
import { verifyLineIdToken, createCustomToken } from '../auth';
import { deleteUserAuth } from './identity.repo';
import { resolveUserIdByProvider, findUserAuthRecord } from './identity.service';

export type LineLoginResult =
  | { status: 'ready'; customToken: string }
  | { status: 'quick-register'; displayName: string | null; email: string | null };

/**
 * 解析一個已驗證來源的 LINE id_token：查有 user_auth 綁定則回傳可用來換 Firebase idToken 的
 * custom token，否則回傳 quick-register 所需資訊。供 LIFF（idToken 直接來自 SDK）與
 * admin Web OAuth（idToken 來自 server 端 code exchange）兩個 endpoint 共用，避免重複實作。
 */
export async function resolveLineLogin(idToken: string): Promise<LineLoginResult> {
  const identity = await verifyLineIdToken(idToken);
  const existingUserId = await resolveUserIdByProvider('line', identity.lineUserId);

  if (!existingUserId) {
    return {
      status: 'quick-register',
      displayName: identity.displayName,
      email: identity.email,
    };
  }

  const record = await findUserAuthRecord('line', identity.lineUserId);
  const firebaseUid = record!.firebaseUid;

  const accountExists = await adminAuth()
    .getUser(firebaseUid)
    .then(() => true)
    .catch((err) => {
      if ((err as { code?: string }).code === 'auth/user-not-found') return false;
      throw err;
    });

  if (!accountExists) {
    await deleteUserAuth('line', identity.lineUserId);
    return {
      status: 'quick-register',
      displayName: identity.displayName,
      email: identity.email,
    };
  }

  const customToken = await createCustomToken(firebaseUid);
  return { status: 'ready', customToken };
}
