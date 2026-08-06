import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { adminDb } from '../../shared/firebase-admin';
import { prefixCollection } from '../../shared/firestore-prefix';
import type {
  LevelHistoryEntry,
  LevelMetricEntry,
  LevelTier,
  MemberLevelState,
} from './level.types';

function tiersCollection() {
  return adminDb().collection(prefixCollection('level_tiers'));
}

function memberStatesCollection() {
  return adminDb().collection(prefixCollection('level_member_states'));
}

function metricEntriesCollection() {
  return adminDb().collection(prefixCollection('level_metric_entries'));
}

function historyCollection() {
  return adminDb().collection(prefixCollection('level_history'));
}

function tierRef(levelNumber: number) {
  return tiersCollection().doc(String(levelNumber));
}

function memberStateRef(userId: string) {
  return memberStatesCollection().doc(userId);
}

export async function listTiers(): Promise<LevelTier[]> {
  const snapshot = await tiersCollection().orderBy('levelNumber', 'asc').get();
  return snapshot.docs.map((doc) => doc.data() as LevelTier);
}

export async function createTier(tier: LevelTier): Promise<void> {
  await tierRef(tier.levelNumber).set(tier);
}

export async function updateTier(
  levelNumber: number,
  patch: Partial<Pick<LevelTier, 'name' | 'metricThreshold'>>,
): Promise<void> {
  await tierRef(levelNumber).update(patch);
}

export async function deleteTier(levelNumber: number): Promise<void> {
  await tierRef(levelNumber).delete();
}

export async function hasMemberWithLevelNumber(levelNumber: number): Promise<boolean> {
  const snapshot = await memberStatesCollection()
    .where('currentLevelNumber', '==', levelNumber)
    .limit(1)
    .get();
  return !snapshot.empty;
}

export async function getMemberState(userId: string): Promise<MemberLevelState | null> {
  const snap = await memberStateRef(userId).get();
  return snap.exists ? (snap.data() as MemberLevelState) : null;
}

export async function createMemberState(state: MemberLevelState): Promise<void> {
  await memberStateRef(state.userId).set(state);
}

export async function getMemberStatesByUserIds(
  userIds: string[],
): Promise<Map<string, MemberLevelState>> {
  if (userIds.length === 0) return new Map();

  const snapshots = await Promise.all(userIds.map((userId) => memberStateRef(userId).get()));
  const result = new Map<string, MemberLevelState>();
  for (const snap of snapshots) {
    if (snap.exists) {
      const state = snap.data() as MemberLevelState;
      result.set(state.userId, state);
    }
  }
  return result;
}

/**
 * Reads the member's current state, lets `compute` (pure decision logic owned by the
 * service layer) derive the updated state + ledger entry, then writes both atomically.
 */
export async function recordMetricTransaction(
  userId: string,
  compute: (current: MemberLevelState) => {
    updatedState: MemberLevelState;
    entry: LevelMetricEntry;
  },
): Promise<MemberLevelState> {
  return adminDb().runTransaction(async (tx) => {
    const stateRef = memberStateRef(userId);
    const snap = await tx.get(stateRef);
    if (!snap.exists) {
      throw Object.assign(new Error(`level state not found for user ${userId}`), {
        code: 'level-state-not-found',
      });
    }

    const { updatedState, entry } = compute(snap.data() as MemberLevelState);
    tx.set(stateRef, updatedState);
    tx.set(metricEntriesCollection().doc(), entry);
    return updatedState;
  });
}

// Requires a composite index (userId ASC, occurredAt DESC) once this is wired up to a
// caller — Firestore does not auto-index equality+order across two different fields.
export async function listMetricEntriesForMember(userId: string): Promise<LevelMetricEntry[]> {
  const snapshot = await metricEntriesCollection()
    .where('userId', '==', userId)
    .orderBy('occurredAt', 'desc')
    .get();
  return snapshot.docs.map((doc) => doc.data() as LevelMetricEntry);
}

/**
 * Cursor-based pagination (rather than always re-querying `endDate <= now` from
 * scratch) so pages advance monotonically within one invocation regardless of
 * per-member success/failure — a member whose processing keeps failing would
 * otherwise never leave the due set and get requeried forever (poison-pill).
 */
export async function queryDuePeriodsPage(
  now: string,
  pageSize: number,
  cursor?: QueryDocumentSnapshot,
): Promise<{ items: MemberLevelState[]; lastDoc: QueryDocumentSnapshot | null }> {
  let query = memberStatesCollection()
    .where('endDate', '<=', now)
    .orderBy('endDate', 'asc')
    .limit(pageSize);
  if (cursor) query = query.startAfter(cursor);

  const snapshot = await query.get();
  return {
    items: snapshot.docs.map((doc) => doc.data() as MemberLevelState),
    lastDoc: snapshot.docs.at(-1) ?? null,
  };
}

/**
 * Reads the member's current state, lets `compute` derive the history entry + reset
 * state, then writes both atomically (period-end evaluation).
 */
export async function finalizePeriodTransaction(
  userId: string,
  compute: (current: MemberLevelState) => {
    updatedState: MemberLevelState;
    historyEntry: LevelHistoryEntry;
  },
): Promise<void> {
  await adminDb().runTransaction(async (tx) => {
    const stateRef = memberStateRef(userId);
    const snap = await tx.get(stateRef);
    if (!snap.exists) {
      throw Object.assign(new Error(`level state not found for user ${userId}`), {
        code: 'level-state-not-found',
      });
    }

    const { updatedState, historyEntry } = compute(snap.data() as MemberLevelState);
    tx.set(stateRef, updatedState);
    tx.set(historyCollection().doc(), historyEntry);
  });
}
