import { adminDb } from '../../shared/firebase-admin';
import { prefixCollection } from '../../shared/firestore-prefix';
import type { PointsLedgerEntry, PointsMemberState, PointsSettings } from './points.types';

const SETTINGS_DOC_ID = 'default';

function settingsCollection() {
  return adminDb().collection(prefixCollection('points_settings'));
}

function memberStatesCollection() {
  return adminDb().collection(prefixCollection('points_member_states'));
}

function ledgerEntriesCollection() {
  return adminDb().collection(prefixCollection('points_ledger_entries'));
}

function memberStateRef(userId: string) {
  return memberStatesCollection().doc(userId);
}

export async function getSettings(): Promise<PointsSettings | null> {
  const snap = await settingsCollection().doc(SETTINGS_DOC_ID).get();
  return snap.exists ? (snap.data() as PointsSettings) : null;
}

export async function updateSettings(settings: PointsSettings): Promise<void> {
  await settingsCollection().doc(SETTINGS_DOC_ID).set(settings);
}

export async function getMemberState(userId: string): Promise<PointsMemberState | null> {
  const snap = await memberStateRef(userId).get();
  return snap.exists ? (snap.data() as PointsMemberState) : null;
}

export async function getMemberStatesByUserIds(
  userIds: string[],
): Promise<Map<string, PointsMemberState>> {
  if (userIds.length === 0) return new Map();

  const snapshots = await Promise.all(userIds.map((userId) => memberStateRef(userId).get()));
  const result = new Map<string, PointsMemberState>();
  for (const snap of snapshots) {
    if (snap.exists) {
      const state = snap.data() as PointsMemberState;
      result.set(state.userId, state);
    }
  }
  return result;
}

/**
 * Reads the member's current state (defaulting to a zero balance when the member has
 * no prior adjustment), lets `compute` (business logic owned by the service layer)
 * derive the updated state + ledger entry, then writes both atomically. `compute`
 * receives a pre-allocated ledger entry id so it can build a complete `entry` without
 * this repo layer needing to know the entry's shape.
 */
export async function recordPointsAdjustmentTransaction(
  userId: string,
  compute: (
    current: PointsMemberState,
    entryId: string,
  ) => { updatedState: PointsMemberState; entry: PointsLedgerEntry },
): Promise<PointsMemberState> {
  return adminDb().runTransaction(async (tx) => {
    const stateRef = memberStateRef(userId);
    const entryRef = ledgerEntriesCollection().doc();
    const snap = await tx.get(stateRef);
    const current: PointsMemberState = snap.exists
      ? (snap.data() as PointsMemberState)
      : { userId, balance: 0, updatedAt: new Date().toISOString() };

    const { updatedState, entry } = compute(current, entryRef.id);
    tx.set(stateRef, updatedState);
    tx.set(entryRef, entry);
    return updatedState;
  });
}

// Requires a composite index (userId ASC, createdAt DESC) once deployed against a real
// Firestore project — equality+order across two different fields is not auto-indexed.
export async function listLedgerEntriesForMember(userId: string): Promise<PointsLedgerEntry[]> {
  const snapshot = await ledgerEntriesCollection()
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();
  return snapshot.docs.map((doc) => doc.data() as PointsLedgerEntry);
}
