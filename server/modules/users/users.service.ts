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

export async function registerUser(
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
  const existing = await findUserByUsername(tenantId, data.username);
  if (existing) {
    throw Object.assign(new Error('此帳號名稱已被使用'), { code: 'username-taken' });
  }
  await createUser(tenantId, data);
  await assignUserRole(tenantId, data.uid, Role.Member);
}

export async function getUserWithHashByIdentifier(
  tenantId: string,
  identifier: string,
): Promise<UserWithHash | null> {
  return identifier.includes('@')
    ? findUserWithHashByEmail(tenantId, identifier)
    : findUserWithHashByUsername(tenantId, identifier);
}

export async function getUserByUid(tenantId: string, uid: string): Promise<User | null> {
  return findUserByUid(tenantId, uid);
}

export async function getUserByUsername(tenantId: string, username: string): Promise<User | null> {
  return findUserByUsername(tenantId, username);
}

export async function getUserByEmail(tenantId: string, email: string): Promise<User | null> {
  return findUserByEmail(tenantId, email);
}

export async function touchUserOnLogin(
  tenantId: string,
  data: { uid: string; displayName: string | null; phone: string | null },
): Promise<User | null> {
  return syncUserOnLogin(tenantId, data);
}

export async function bindGoogleProvider(tenantId: string, uid: string): Promise<void> {
  return addProviderToUser(tenantId, uid, 'google');
}

export async function unbindGoogleProvider(tenantId: string, uid: string): Promise<void> {
  const user = await findUserByUid(tenantId, uid);
  if (!user) return;
  if (user.providers.length <= 1) {
    throw Object.assign(new Error('無法移除唯一的登入方式'), { code: 'last-provider' });
  }
  return removeProviderFromUser(tenantId, uid, 'google');
}

export async function syncUserPhone(tenantId: string, uid: string, phone: string): Promise<void> {
  return updateUserPhone(tenantId, uid, phone);
}

export async function syncUserDisplayName(
  tenantId: string,
  uid: string,
  displayName: string,
): Promise<void> {
  return updateUserDisplayName(tenantId, uid, displayName);
}

export async function getAllUsers(tenantId: string): Promise<User[]> {
  return listUsers(tenantId);
}
