import { randomBytes } from 'crypto';
import { createSetupToken, findSetupToken, markSetupTokenUsed } from './password-setup.repo';

const TOKEN_TTL_HOURS = 24;

export async function generateSetupToken(uid: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString();
  await createSetupToken({ token, uid, expiresAt });
  return token;
}

export async function consumeSetupToken(token: string): Promise<{ uid: string }> {
  const record = await findSetupToken(token);
  if (!record || record.used || new Date(record.expiresAt).getTime() < Date.now()) {
    throw Object.assign(new Error('連結無效或已過期'), { code: 'invalid-token' });
  }
  await markSetupTokenUsed(token);
  return { uid: record.uid };
}
