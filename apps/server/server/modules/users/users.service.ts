import { randomUUID } from 'crypto';
import { Role } from '@saas-starter-kit/shared';
import { assignUserRole } from '../roles';
import { bindProvider, deleteAllProvidersForUser } from '../identity';
import { initializeMemberPeriod } from '../level';
import type { ProviderType } from '../identity';
import {
  createUser,
  findUserById,
  findUserByMemberNo,
  findUserByUsername,
  findUserByEmail,
  findUserByPhone,
  touchLogin,
  updateUserPhone,
  updateUserEmail,
  updateUserDisplayName,
  markPasswordSetupComplete,
  listUsers,
  deleteUser,
} from './users.repo';
import type { User } from './users.types';

const MEMBER_NO_MAX_ATTEMPTS = 5;
const MEMBER_NO_SUFFIX_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomMemberNoSuffix(): string {
  let result = '';
  for (let i = 0; i < 2; i++) {
    result += MEMBER_NO_SUFFIX_CHARS[Math.floor(Math.random() * MEMBER_NO_SUFFIX_CHARS.length)];
  }
  return result;
}

async function generateMemberNo(): Promise<string> {
  for (let attempt = 0; attempt < MEMBER_NO_MAX_ATTEMPTS; attempt++) {
    const candidate = `M${Date.now()}${randomMemberNoSuffix()}`;
    if (!(await findUserByMemberNo(candidate))) return candidate;
  }
  throw new Error('Failed to generate a unique memberNo after retries');
}

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

  const [existingEmail, existingPhone] = await Promise.all([
    data.email ? findUserByEmail(data.email) : null,
    data.phone ? findUserByPhone(data.phone) : null,
  ]);
  if (existingEmail || existingPhone) {
    throw Object.assign(new Error('此帳號資料已被使用'), { code: 'contact-taken' });
  }

  const userId = randomUUID();

  await bindProvider({
    userId,
    providerType: data.providerType,
    providerUserId: data.providerUserId,
    firebaseUid: data.firebaseUid,
  });

  const memberNo = await generateMemberNo();

  await createUser({
    userId,
    username: data.username,
    displayName: data.displayName,
    email: data.email,
    phone: data.phone,
    memberNo,
    passwordSetupPending: data.passwordSetupPending ?? false,
  });

  await assignUserRole(userId, data.role ?? Role.Member);

  const user = (await findUserById(userId))!;
  // Failure here fails registration, same as assignUserRole above — this shares the
  // pre-existing registration non-atomicity risk, not a new one. See docs/known-issues.md.
  await initializeMemberPeriod(userId, user.createdAt);

  return user;
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
  const existing = await findUserByPhone(phone);
  if (existing && existing.userId !== userId) {
    throw Object.assign(new Error('此帳號資料已被使用'), { code: 'contact-taken' });
  }
  return updateUserPhone(userId, phone);
}

export async function syncUserEmail(userId: string, email: string): Promise<void> {
  const existing = await findUserByEmail(email);
  if (existing && existing.userId !== userId) {
    throw Object.assign(new Error('此帳號資料已被使用'), { code: 'contact-taken' });
  }
  return updateUserEmail(userId, email);
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
