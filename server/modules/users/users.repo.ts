import { adminDb } from '../../shared/firebase-admin';
import { prefixCollection } from '../../shared/firestore-prefix';
import type { User, UserWithHash } from './users.types';

function stripHash(raw: UserWithHash): User {
  const { passwordHash: _, ...user } = raw;
  return user;
}

function userRef(tenantId: string, uid: string) {
  return adminDb().doc(`tenants/${tenantId}/${prefixCollection('users')}/${uid}`);
}

function usersCollection(tenantId: string) {
  return adminDb().collection(`tenants/${tenantId}/${prefixCollection('users')}`);
}

export async function findUserByUid(tenantId: string, uid: string): Promise<User | null> {
  const doc = await userRef(tenantId, uid).get();
  if (!doc.exists) return null;
  return stripHash(doc.data() as UserWithHash);
}

export async function findUserWithHashByUid(
  tenantId: string,
  uid: string,
): Promise<UserWithHash | null> {
  const doc = await userRef(tenantId, uid).get();
  if (!doc.exists) return null;
  return doc.data() as UserWithHash;
}

export async function findUserWithHashByUsername(
  tenantId: string,
  username: string,
): Promise<UserWithHash | null> {
  const snapshot = await usersCollection(tenantId).where('username', '==', username).limit(1).get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as UserWithHash;
}

export async function findUserWithHashByEmail(
  tenantId: string,
  email: string,
): Promise<UserWithHash | null> {
  const snapshot = await usersCollection(tenantId).where('email', '==', email).limit(1).get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as UserWithHash;
}

export async function findUserByUsername(tenantId: string, username: string): Promise<User | null> {
  const raw = await findUserWithHashByUsername(tenantId, username);
  return raw ? stripHash(raw) : null;
}

export async function findUserByEmail(tenantId: string, email: string): Promise<User | null> {
  const raw = await findUserWithHashByEmail(tenantId, email);
  return raw ? stripHash(raw) : null;
}

export async function createUser(
  tenantId: string,
  data: {
    uid: string;
    username: string;
    displayName: string;
    email: string | null;
    phone: string | null;
    providers: string[];
    passwordHash: string | null;
  },
): Promise<void> {
  const ref = userRef(tenantId, data.uid);
  await ref.set({
    uid: data.uid,
    username: data.username,
    displayName: data.displayName,
    email: data.email,
    phone: data.phone,
    providers: data.providers,
    passwordHash: data.passwordHash,
    tenantId,
    createdAt: new Date().toISOString(),
  });
}

export async function syncUserOnLogin(
  tenantId: string,
  data: { uid: string; displayName: string | null; phone: string | null },
): Promise<User | null> {
  const ref = userRef(tenantId, data.uid);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const update: Record<string, string> = {};
  if (data.displayName) update.displayName = data.displayName;
  if (data.phone) update.phone = data.phone;

  if (Object.keys(update).length > 0) {
    await ref.update(update);
  }

  return { ...(doc.data() as User), ...update };
}

export async function addProviderToUser(
  tenantId: string,
  uid: string,
  provider: string,
): Promise<void> {
  const ref = userRef(tenantId, uid);
  const doc = await ref.get();
  if (!doc.exists) return;

  const user = doc.data() as User;
  if (!user.providers.includes(provider)) {
    await ref.update({ providers: [...user.providers, provider] });
  }
}

export async function removeProviderFromUser(
  tenantId: string,
  uid: string,
  provider: string,
): Promise<void> {
  const ref = userRef(tenantId, uid);
  const doc = await ref.get();
  if (!doc.exists) return;

  const user = doc.data() as User;
  if (user.providers.includes(provider)) {
    await ref.update({ providers: user.providers.filter((p) => p !== provider) });
  }
}

export async function updateUserPhone(tenantId: string, uid: string, phone: string): Promise<void> {
  await userRef(tenantId, uid).update({ phone });
}

export async function updateUserDisplayName(
  tenantId: string,
  uid: string,
  displayName: string,
): Promise<void> {
  await userRef(tenantId, uid).update({ displayName });
}

export async function listUsers(tenantId: string): Promise<User[]> {
  const snapshot = await usersCollection(tenantId).orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => stripHash(doc.data() as UserWithHash));
}
