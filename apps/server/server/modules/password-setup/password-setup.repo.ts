import { adminDb } from '../../shared/firebase-admin';
import { prefixCollection } from '../../shared/firestore-prefix';
import type { PasswordSetupToken } from './password-setup.types';

function tokenRef(token: string) {
  return adminDb().doc(`${prefixCollection('password_setup_tokens')}/${token}`);
}

export async function createSetupToken(data: {
  token: string;
  userId: string;
  firebaseUid: string;
  expiresAt: string;
}): Promise<void> {
  await tokenRef(data.token).set({
    token: data.token,
    userId: data.userId,
    firebaseUid: data.firebaseUid,
    expiresAt: data.expiresAt,
    used: false,
    createdAt: new Date().toISOString(),
  });
}

export async function findSetupToken(token: string): Promise<PasswordSetupToken | null> {
  const doc = await tokenRef(token).get();
  if (!doc.exists) return null;
  return doc.data() as PasswordSetupToken;
}

export async function markSetupTokenUsed(token: string): Promise<void> {
  await tokenRef(token).update({ used: true });
}
