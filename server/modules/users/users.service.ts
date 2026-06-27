import { listUsers, updateUserPhone, upsertUser } from './users.repo';
import type { User } from './users.types';

export async function saveUser(
  tenantId: string,
  data: { uid: string; email: string | null; displayName: string | null; phone: string | null },
): Promise<void> {
  return upsertUser(tenantId, data);
}

export async function syncUserPhone(tenantId: string, uid: string, phone: string): Promise<void> {
  return updateUserPhone(tenantId, uid, phone);
}

export async function getAllUsers(tenantId: string): Promise<User[]> {
  return listUsers(tenantId);
}
