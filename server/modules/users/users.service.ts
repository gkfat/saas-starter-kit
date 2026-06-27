import { listUsers, upsertUser } from './users.repo';
import type { User } from './users.types';

export async function saveUser(
  tenantId: string,
  data: { uid: string; email: string | null; displayName: string | null },
): Promise<void> {
  return upsertUser(tenantId, data);
}

export async function getAllUsers(tenantId: string): Promise<User[]> {
  return listUsers(tenantId);
}
