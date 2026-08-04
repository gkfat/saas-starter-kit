import { adminAuth } from '../../shared/firebase-admin';
import {
  createUserAuth,
  deleteUserAuth,
  findUserAuth,
  listUserAuthsByUserId,
} from './identity.repo';
import type { ProviderType, UserAuth } from './identity.types';

export async function resolveUserIdByProvider(
  providerType: ProviderType,
  providerUserId: string,
): Promise<string | null> {
  const record = await findUserAuth(providerType, providerUserId);
  return record?.userId ?? null;
}

export async function findUserAuthRecord(
  providerType: ProviderType,
  providerUserId: string,
): Promise<UserAuth | null> {
  return findUserAuth(providerType, providerUserId);
}

export async function bindProvider(data: {
  userId: string;
  providerType: ProviderType;
  providerUserId: string;
  firebaseUid: string;
}): Promise<void> {
  await createUserAuth({ ...data, createdAt: new Date().toISOString() });
  await adminAuth().setCustomUserClaims(data.firebaseUid, { userId: data.userId });
}

export async function unbindProvider(userId: string, providerType: ProviderType): Promise<void> {
  const records = await listUserAuthsByUserId(userId);
  const target = records.find((record) => record.providerType === providerType);
  if (!target) return;
  if (records.length <= 1) {
    throw Object.assign(new Error('無法移除唯一的登入方式'), { code: 'last-provider' });
  }
  await deleteUserAuth(providerType, target.providerUserId);
  await adminAuth()
    .revokeRefreshTokens(target.firebaseUid)
    .catch(() => {});
}

export async function listProvidersForUser(userId: string): Promise<ProviderType[]> {
  const records = await listUserAuthsByUserId(userId);
  return records.map((record) => record.providerType);
}

export async function listFirebaseUidsForUser(userId: string): Promise<string[]> {
  const records = await listUserAuthsByUserId(userId);
  return records.map((record) => record.firebaseUid);
}

export async function getAccountStatus(userId: string): Promise<{ disabled: boolean }> {
  const firebaseUids = await listFirebaseUidsForUser(userId);
  if (firebaseUids.length === 0) return { disabled: false };

  const statuses = await Promise.all(
    firebaseUids.map(async (firebaseUid) => {
      try {
        return (await adminAuth().getUser(firebaseUid)).disabled;
      } catch (err) {
        if ((err as { code?: string }).code === 'auth/user-not-found') return true;
        throw err;
      }
    }),
  );

  return { disabled: statuses.every((disabled) => disabled) };
}

export async function setAccountDisabled(userId: string, disabled: boolean): Promise<void> {
  const firebaseUids = await listFirebaseUidsForUser(userId);
  await Promise.all(
    firebaseUids.map((firebaseUid) => adminAuth().updateUser(firebaseUid, { disabled })),
  );
}

export async function revokeSessionsForUser(userId: string): Promise<void> {
  const firebaseUids = await listFirebaseUidsForUser(userId);
  await Promise.all(
    firebaseUids.map((firebaseUid) => adminAuth().revokeRefreshTokens(firebaseUid)),
  );
}

export async function deleteAllProvidersForUser(userId: string): Promise<void> {
  const records = await listUserAuthsByUserId(userId);
  await Promise.all([
    ...records.map((record) => deleteUserAuth(record.providerType, record.providerUserId)),
    ...records.map((record) =>
      adminAuth()
        .deleteUser(record.firebaseUid)
        .catch(() => {}),
    ),
  ]);
}
