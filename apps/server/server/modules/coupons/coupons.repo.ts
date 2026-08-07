import { adminDb } from '../../shared/firebase-admin';
import { prefixCollection } from '../../shared/firestore-prefix';
import type { CouponInstance, CouponTemplate } from './coupons.types';

function templatesCollection() {
  return adminDb().collection(prefixCollection('coupon_templates'));
}

function instancesCollection() {
  return adminDb().collection(prefixCollection('coupon_instances'));
}

export async function listTemplates(): Promise<CouponTemplate[]> {
  const snapshot = await templatesCollection().orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => doc.data() as CouponTemplate);
}

export async function getTemplateById(id: string): Promise<CouponTemplate | null> {
  const snap = await templatesCollection().doc(id).get();
  return snap.exists ? (snap.data() as CouponTemplate) : null;
}

export async function createTemplate(template: CouponTemplate): Promise<void> {
  await templatesCollection().doc(template.id).set(template);
}

export async function updateTemplate(
  id: string,
  patch: Partial<Omit<CouponTemplate, 'id' | 'createdAt'>>,
): Promise<void> {
  await templatesCollection().doc(id).update(patch);
}

export async function createInstances(instances: CouponInstance[]): Promise<void> {
  const batch = adminDb().batch();
  for (const instance of instances) {
    batch.set(instancesCollection().doc(instance.id), instance);
  }
  await batch.commit();
}

function sortByIssuedAtDesc(instances: CouponInstance[]): CouponInstance[] {
  return [...instances].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

// Sorted in-memory rather than via `.orderBy('issuedAt')` — combining it with the
// `where` equality filter above would require a composite Firestore index per query,
// and instance counts per template/member stay small enough (see design.md) for this.
export async function listInstancesByTemplate(templateId: string): Promise<CouponInstance[]> {
  const snapshot = await instancesCollection().where('templateId', '==', templateId).get();
  return sortByIssuedAtDesc(snapshot.docs.map((doc) => doc.data() as CouponInstance));
}

export async function listInstancesByMember(memberId: string): Promise<CouponInstance[]> {
  const snapshot = await instancesCollection().where('memberId', '==', memberId).get();
  return sortByIssuedAtDesc(snapshot.docs.map((doc) => doc.data() as CouponInstance));
}

export async function getInstanceById(id: string): Promise<CouponInstance | null> {
  const snap = await instancesCollection().doc(id).get();
  return snap.exists ? (snap.data() as CouponInstance) : null;
}

async function findInstanceRefByCode(code: string) {
  const snapshot = await instancesCollection().where('code', '==', code).limit(1).get();
  return snapshot.docs[0]?.ref ?? null;
}

/**
 * Looks up the instance by `code` outside the transaction (Firestore transactions
 * require a document reference, not a query), then re-reads and mutates that exact
 * doc inside the transaction so the redeemed-check and write stay atomic.
 */
export async function redeemInstanceByCodeTransaction(
  code: string,
  redeemedBy: string,
): Promise<
  | { status: 'redeemed'; instance: CouponInstance }
  | { status: 'not-found' }
  | { status: 'already-redeemed'; instance: CouponInstance }
  | { status: 'expired'; instance: CouponInstance }
> {
  const ref = await findInstanceRefByCode(code);
  if (!ref) return { status: 'not-found' };

  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { status: 'not-found' };

    const instance = snap.data() as CouponInstance;
    if (instance.redeemedAt) {
      return { status: 'already-redeemed', instance };
    }
    if (new Date(instance.expiresAt).getTime() < Date.now()) {
      return { status: 'expired', instance };
    }

    const redeemedAt = new Date().toISOString();
    const updatedInstance: CouponInstance = { ...instance, redeemedAt, redeemedBy };
    tx.update(ref, { redeemedAt, redeemedBy });
    return { status: 'redeemed', instance: updatedInstance };
  });
}
