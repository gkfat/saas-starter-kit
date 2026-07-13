import { adminDb } from '../../shared/firebase-admin';
import { prefixCollection } from '../../shared/firestore-prefix';
import type { User } from './users.types';

function userRef(tenantId: string, uid: string) {
  return adminDb().doc(`tenants/${tenantId}/${prefixCollection('users')}/${uid}`);
}

function usersCollection(tenantId: string) {
  return adminDb().collection(`tenants/${tenantId}/${prefixCollection('users')}`);
}

export async function upsertUser(
  tenantId: string,
  data: { uid: string; email: string | null; displayName: string | null; phone: string | null },
): Promise<void> {
  const ref = userRef(tenantId, data.uid);
  const doc = await ref.get();

  const mutableFields: Record<string, string> = {
    email: data.email ?? '',
    displayName: data.displayName ?? '',
  };
  if (data.phone) {
    mutableFields.phone = data.phone;
  }

  if (!doc.exists) {
    await ref.set({
      uid: data.uid,
      tenantId,
      createdAt: new Date().toISOString(),
      ...mutableFields,
    });
  } else {
    await ref.update(mutableFields);
  }
}

export async function updateUserPhone(tenantId: string, uid: string, phone: string): Promise<void> {
  await userRef(tenantId, uid).update({ phone });
}

export async function listUsers(tenantId: string): Promise<User[]> {
  const snapshot = await usersCollection(tenantId).orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => doc.data() as User);
}
