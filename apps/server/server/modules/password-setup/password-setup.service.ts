import { randomBytes } from 'crypto';
import { createSetupToken, findSetupToken, markSetupTokenUsed } from './password-setup.repo';

const TOKEN_TTL_HOURS = 24;

export async function generateSetupToken(data: {
  userId: string;
  firebaseUid: string;
}): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString();
  await createSetupToken({ token, userId: data.userId, firebaseUid: data.firebaseUid, expiresAt });
  return token;
}

export async function consumeSetupToken(token: string): Promise<{
  userId: string;
  firebaseUid: string;
}> {
  const record = await findSetupToken(token);
  if (!record || record.used || new Date(record.expiresAt).getTime() < Date.now()) {
    throw Object.assign(new Error('連結無效或已過期'), { code: 'invalid-token' });
  }
  await markSetupTokenUsed(token);
  return { userId: record.userId, firebaseUid: record.firebaseUid };
}
