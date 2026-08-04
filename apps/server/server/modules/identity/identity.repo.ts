import { adminDb } from '../../shared/firebase-admin';
import { prefixCollection } from '../../shared/firestore-prefix';
import type { ProviderType, UserAuth } from './identity.types';

function userAuthDocId(providerType: ProviderType, providerUserId: string): string {
  return `${providerType}_${providerUserId}`;
}

function userAuthRef(providerType: ProviderType, providerUserId: string) {
  return adminDb().doc(
    `${prefixCollection('user_auth')}/${userAuthDocId(providerType, providerUserId)}`,
  );
}

function userAuthCollection() {
  return adminDb().collection(prefixCollection('user_auth'));
}

export async function findUserAuth(
  providerType: ProviderType,
  providerUserId: string,
): Promise<UserAuth | null> {
  const doc = await userAuthRef(providerType, providerUserId).get();
  if (!doc.exists) return null;
  return doc.data() as UserAuth;
}

export async function createUserAuth(data: UserAuth): Promise<void> {
  const ref = userAuthRef(data.providerType, data.providerUserId);
  const existing = await ref.get();
  if (existing.exists) {
    throw Object.assign(new Error('此登入方式已被綁定'), { code: 'provider-taken' });
  }
  await ref.set(data);
}

export async function deleteUserAuth(
  providerType: ProviderType,
  providerUserId: string,
): Promise<void> {
  await userAuthRef(providerType, providerUserId).delete();
}

export async function listUserAuthsByUserId(userId: string): Promise<UserAuth[]> {
  const snapshot = await userAuthCollection().where('userId', '==', userId).get();
  return snapshot.docs.map((doc) => doc.data() as UserAuth);
}
