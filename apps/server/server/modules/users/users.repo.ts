import { adminDb } from '../../shared/firebase-admin';
import { prefixCollection } from '../../shared/firestore-prefix';
import type { User } from './users.types';

function userRef(userId: string) {
  return adminDb().doc(`${prefixCollection('users')}/${userId}`);
}

function usersCollection() {
  return adminDb().collection(prefixCollection('users'));
}

export async function findUserById(userId: string): Promise<User | null> {
  const doc = await userRef(userId).get();
  if (!doc.exists) return null;
  return doc.data() as User;
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const snapshot = await usersCollection().where('username', '==', username).limit(1).get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as User;
}

export async function findUserByMemberNo(memberNo: string): Promise<User | null> {
  const snapshot = await usersCollection().where('memberNo', '==', memberNo).limit(1).get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as User;
}

export async function createUser(data: {
  userId: string;
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  memberNo: string;
  passwordSetupPending?: boolean;
}): Promise<void> {
  await userRef(data.userId).set({
    userId: data.userId,
    username: data.username,
    displayName: data.displayName,
    email: data.email,
    phone: data.phone,
    memberNo: data.memberNo,
    passwordSetupPending: data.passwordSetupPending ?? false,
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
  });
}

export async function touchLogin(data: {
  userId: string;
  displayName: string | null;
  phone: string | null;
}): Promise<User | null> {
  const ref = userRef(data.userId);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const update: Record<string, string> = { lastLoginAt: new Date().toISOString() };
  if (data.displayName) update.displayName = data.displayName;
  if (data.phone) update.phone = data.phone;

  await ref.update(update);

  return { ...(doc.data() as User), ...update };
}

export async function updateUserPhone(userId: string, phone: string): Promise<void> {
  await userRef(userId).update({ phone });
}

export async function updateUserDisplayName(userId: string, displayName: string): Promise<void> {
  await userRef(userId).update({ displayName });
}

export async function markPasswordSetupComplete(userId: string): Promise<void> {
  await userRef(userId).update({ passwordSetupPending: false });
}

export async function listUsers(): Promise<User[]> {
  const snapshot = await usersCollection().orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => doc.data() as User);
}

export async function deleteUser(userId: string): Promise<void> {
  await userRef(userId).delete();
}
