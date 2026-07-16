import { assignUserRole } from '../roles';
import { Role } from '~/shared/roles';
import {
  createUser,
  findUserByUid,
  findUserByUsername,
  findUserByEmail,
  findUserWithHashByUsername,
  findUserWithHashByEmail,
  syncUserOnLogin,
  addProviderToUser,
  removeProviderFromUser,
  updateUserPhone,
  updateUserDisplayName,
  listUsers,
} from './users.repo';
import type { User, UserWithHash } from './users.types';

export async function registerUser(data: {
  uid: string;
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  providers: string[];
  passwordHash: string | null;
}): Promise<void> {
  const existing = await findUserByUsername(data.username);
  if (existing) {
    throw Object.assign(new Error('此帳號名稱已被使用'), { code: 'username-taken' });
  }
  await createUser(data);
  await assignUserRole(data.uid, Role.Member);
}

export async function getUserWithHashByIdentifier(
  identifier: string,
): Promise<UserWithHash | null> {
  return identifier.includes('@')
    ? findUserWithHashByEmail(identifier)
    : findUserWithHashByUsername(identifier);
}

export async function getUserByUid(uid: string): Promise<User | null> {
  return findUserByUid(uid);
}

export async function getUserByUsername(username: string): Promise<User | null> {
  return findUserByUsername(username);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return findUserByEmail(email);
}

export async function touchUserOnLogin(data: {
  uid: string;
  displayName: string | null;
  phone: string | null;
}): Promise<User | null> {
  return syncUserOnLogin(data);
}

export async function bindGoogleProvider(uid: string): Promise<void> {
  return addProviderToUser(uid, 'google');
}

export async function unbindGoogleProvider(uid: string): Promise<void> {
  const user = await findUserByUid(uid);
  if (!user) return;
  if (user.providers.length <= 1) {
    throw Object.assign(new Error('無法移除唯一的登入方式'), { code: 'last-provider' });
  }
  return removeProviderFromUser(uid, 'google');
}

export async function syncUserPhone(uid: string, phone: string): Promise<void> {
  return updateUserPhone(uid, phone);
}

export async function syncUserDisplayName(uid: string, displayName: string): Promise<void> {
  return updateUserDisplayName(uid, displayName);
}

export async function getAllUsers(): Promise<User[]> {
  return listUsers();
}
