import { adminDb } from '../../shared/firebase-admin';
import { prefixCollection } from '../../shared/firestore-prefix';
import type { User, UserWithHash } from './users.types';

function stripHash(raw: UserWithHash): User {
  const { passwordHash: _, ...user } = raw;
  return user;
}

function userRef(uid: string) {
  return adminDb().doc(`${prefixCollection('users')}/${uid}`);
}

function usersCollection() {
  return adminDb().collection(prefixCollection('users'));
}

export async function findUserByUid(uid: string): Promise<User | null> {
  const doc = await userRef(uid).get();
  if (!doc.exists) return null;
  return stripHash(doc.data() as UserWithHash);
}

export async function findUserWithHashByUid(uid: string): Promise<UserWithHash | null> {
  const doc = await userRef(uid).get();
  if (!doc.exists) return null;
  return doc.data() as UserWithHash;
}

export async function findUserWithHashByUsername(username: string): Promise<UserWithHash | null> {
  const snapshot = await usersCollection().where('username', '==', username).limit(1).get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as UserWithHash;
}

export async function findUserWithHashByEmail(email: string): Promise<UserWithHash | null> {
  const snapshot = await usersCollection().where('email', '==', email).limit(1).get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as UserWithHash;
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const raw = await findUserWithHashByUsername(username);
  return raw ? stripHash(raw) : null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const raw = await findUserWithHashByEmail(email);
  return raw ? stripHash(raw) : null;
}

export async function createUser(data: {
  uid: string;
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  providers: string[];
  passwordHash: string | null;
  passwordSetupPending?: boolean;
}): Promise<void> {
  const ref = userRef(data.uid);
  await ref.set({
    uid: data.uid,
    username: data.username,
    displayName: data.displayName,
    email: data.email,
    phone: data.phone,
    providers: data.providers,
    passwordHash: data.passwordHash,
    passwordSetupPending: data.passwordSetupPending ?? false,
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
  });
}

export async function syncUserOnLogin(data: {
  uid: string;
  displayName: string | null;
  phone: string | null;
}): Promise<User | null> {
  const ref = userRef(data.uid);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const update: Record<string, string> = { lastLoginAt: new Date().toISOString() };
  if (data.displayName) update.displayName = data.displayName;
  if (data.phone) update.phone = data.phone;

  await ref.update(update);

  return { ...(doc.data() as User), ...update };
}

export async function addProviderToUser(uid: string, provider: string): Promise<void> {
  const ref = userRef(uid);
  const doc = await ref.get();
  if (!doc.exists) return;

  const user = doc.data() as User;
  if (!user.providers.includes(provider)) {
    await ref.update({ providers: [...user.providers, provider] });
  }
}

export async function removeProviderFromUser(uid: string, provider: string): Promise<void> {
  const ref = userRef(uid);
  const doc = await ref.get();
  if (!doc.exists) return;

  const user = doc.data() as User;
  if (user.providers.includes(provider)) {
    await ref.update({ providers: user.providers.filter((p) => p !== provider) });
  }
}

export async function updateUserPhone(uid: string, phone: string): Promise<void> {
  await userRef(uid).update({ phone });
}

export async function updateUserDisplayName(uid: string, displayName: string): Promise<void> {
  await userRef(uid).update({ displayName });
}

export async function updateUserPassword(uid: string, passwordHash: string): Promise<void> {
  const ref = userRef(uid);
  const doc = await ref.get();
  if (!doc.exists) return;

  const user = doc.data() as User;
  const providers = user.providers.includes('password')
    ? user.providers
    : [...user.providers, 'password'];

  await ref.update({ passwordHash, providers, passwordSetupPending: false });
}

export async function listUsers(): Promise<User[]> {
  const snapshot = await usersCollection().orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => stripHash(doc.data() as UserWithHash));
}

export async function deleteUser(uid: string): Promise<void> {
  await userRef(uid).delete();
}
