import { randomUUID } from 'crypto';
import { Role } from '@saas-starter-kit/shared';
import { assignUserRole } from '../roles';
import { bindProvider, deleteAllProvidersForUser } from '../identity';
import type { ProviderType } from '../identity';
import {
  createUser,
  findUserById,
  findUserByUsername,
  touchLogin,
  updateUserPhone,
  updateUserDisplayName,
  markPasswordSetupComplete,
  listUsers,
  deleteUser,
} from './users.repo';
import type { User } from './users.types';

export async function registerUserWithProvider(data: {
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  providerType: ProviderType;
  providerUserId: string;
  firebaseUid: string;
  role?: string;
  passwordSetupPending?: boolean;
}): Promise<User> {
  const existing = await findUserByUsername(data.username);
  if (existing) {
    throw Object.assign(new Error('此帳號名稱已被使用'), { code: 'username-taken' });
  }

  const userId = randomUUID();

  await bindProvider({
    userId,
    providerType: data.providerType,
    providerUserId: data.providerUserId,
    firebaseUid: data.firebaseUid,
  });

  await createUser({
    userId,
    username: data.username,
    displayName: data.displayName,
    email: data.email,
    phone: data.phone,
    passwordSetupPending: data.passwordSetupPending ?? false,
  });

  await assignUserRole(userId, data.role ?? Role.Member);

  return (await findUserById(userId))!;
}

export async function getUserById(userId: string): Promise<User | null> {
  return findUserById(userId);
}

export async function touchUserOnLogin(data: {
  userId: string;
  displayName: string | null;
  phone: string | null;
}): Promise<User | null> {
  return touchLogin(data);
}

export async function syncUserPhone(userId: string, phone: string): Promise<void> {
  return updateUserPhone(userId, phone);
}

export async function syncUserDisplayName(userId: string, displayName: string): Promise<void> {
  return updateUserDisplayName(userId, displayName);
}

export async function completePasswordSetup(userId: string): Promise<void> {
  return markPasswordSetupComplete(userId);
}

export async function getAllUsers(): Promise<User[]> {
  return listUsers();
}

export async function deleteUserAccount(userId: string): Promise<void> {
  await deleteAllProvidersForUser(userId);
  await deleteUser(userId);
}
