import { adminDb } from '../../shared/firebase-admin';
import type { User } from './users.types';

function userRef(tenantId: string, uid: string) {
  return adminDb().doc(`tenants/${tenantId}/users/${uid}`);
}

function usersCollection(tenantId: string) {
  return adminDb().collection(`tenants/${tenantId}/users`);
}

export async function upsertUser(
  tenantId: string,
  data: { uid: string; email: string | null; displayName: string | null },
): Promise<void> {
  const ref = userRef(tenantId, data.uid);
  const doc = await ref.get();

  if (!doc.exists) {
    await ref.set({
      uid: data.uid,
      email: data.email ?? '',
      displayName: data.displayName ?? '',
      tenantId,
      createdAt: new Date().toISOString(),
    });
  } else {
    await ref.update({
      email: data.email ?? '',
      displayName: data.displayName ?? '',
    });
  }
}

export async function listUsers(tenantId: string): Promise<User[]> {
  const snapshot = await usersCollection(tenantId).orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => doc.data() as User);
}
