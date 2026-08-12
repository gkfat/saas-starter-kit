import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { FeatureFlag } from '@saas-starter-kit/shared';
import { DUE_PERIOD_PAGE_SIZE, LEVEL_PERIOD_LENGTH } from './level.constants';
import {
  createMemberState,
  createTier,
  deleteTier,
  finalizePeriodTransaction,
  getMemberState,
  getMemberStatesByUserIds,
  hasMemberWithLevelNumber,
  listTiers as listTiersFromRepo,
  queryDuePeriodsPage,
  recordMetricTransaction,
  updateTier as updateTierInRepo,
} from './level.repo';
import { CreateLevelTierSchema, RecordMetricSchema, UpdateLevelTierSchema } from './level.schema';
import type {
  EvaluateDuePeriodsResult,
  GetLevelResult,
  LevelHistoryEntry,
  LevelMetricEntry,
  LevelTier,
  MemberLevelState,
} from './level.types';

dayjs.extend(utc);

function isLevelEnabled(): boolean {
  return useRuntimeConfig().public.featureFlags[FeatureFlag.Level];
}

function requireLevelEnabled(): void {
  if (!isLevelEnabled()) {
    throw Object.assign(new Error('Level module is disabled'), { code: 'level-disabled' });
  }
}

function nextPeriodBoundary(from: string): { startDate: string; endDate: string } {
  const startDate = dayjs.utc(from).startOf('day');
  const endDate = startDate.add(LEVEL_PERIOD_LENGTH.amount, LEVEL_PERIOD_LENGTH.unit);
  return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
}

function resolveLevelForTotal(tiers: LevelTier[], total: number, floorLevelNumber: number): number {
  const eligible = tiers
    .filter((tier) => tier.metricThreshold <= total)
    .sort((a, b) => b.levelNumber - a.levelNumber)[0];
  if (!eligible) return floorLevelNumber;
  return Math.max(eligible.levelNumber, floorLevelNumber);
}

export async function initializeMemberPeriod(userId: string, joinedAt: string): Promise<void> {
  const { startDate, endDate } = nextPeriodBoundary(joinedAt);
  const state: MemberLevelState = {
    userId,
    startDate,
    endDate,
    currentPeriodTotal: 0,
    currentLevelNumber: 1,
  };
  await createMemberState(state);
}

export async function recordMetric(input: {
  userId: string;
  amount: number;
  reason: string;
  source: string;
  refId?: string;
}): Promise<MemberLevelState> {
  requireLevelEnabled();
  const { userId, amount, reason, source, refId } = RecordMetricSchema.parse(input);
  const tiers = await listTiersFromRepo();
  const occurredAt = new Date().toISOString();

  return recordMetricTransaction(userId, (current) => {
    const newTotal = current.currentPeriodTotal + amount;
    const newLevelNumber = resolveLevelForTotal(tiers, newTotal, current.currentLevelNumber);
    const updatedState: MemberLevelState = {
      ...current,
      currentPeriodTotal: newTotal,
      currentLevelNumber: newLevelNumber,
    };
    const entry: LevelMetricEntry = { userId, amount, reason, source, refId, occurredAt };
    return { updatedState, entry };
  });
}

function findNextTierThreshold(tiers: LevelTier[], currentLevelNumber: number): number | null {
  const nextTier = tiers
    .filter((t) => t.levelNumber > currentLevelNumber)
    .sort((a, b) => a.levelNumber - b.levelNumber)[0];
  return nextTier?.metricThreshold ?? null;
}

export async function getLevel(userId: string): Promise<GetLevelResult | null> {
  requireLevelEnabled();
  const state = await getMemberState(userId);
  if (!state) return null;

  const tiers = await listTiersFromRepo();
  const tier = tiers.find((t) => t.levelNumber === state.currentLevelNumber);
  return {
    levelNumber: state.currentLevelNumber,
    levelName: tier?.name ?? '',
    currentPeriodTotal: state.currentPeriodTotal,
    startDate: state.startDate,
    endDate: state.endDate,
    nextTierThreshold: findNextTierThreshold(tiers, state.currentLevelNumber),
  };
}

export async function getLevelsForUsers(userIds: string[]): Promise<Map<string, GetLevelResult>> {
  if (!isLevelEnabled() || userIds.length === 0) return new Map();

  const [states, tiers] = await Promise.all([
    getMemberStatesByUserIds(userIds),
    listTiersFromRepo(),
  ]);

  const result = new Map<string, GetLevelResult>();
  for (const [userId, state] of states) {
    const tier = tiers.find((t) => t.levelNumber === state.currentLevelNumber);
    result.set(userId, {
      levelNumber: state.currentLevelNumber,
      levelName: tier?.name ?? '',
      currentPeriodTotal: state.currentPeriodTotal,
      startDate: state.startDate,
      endDate: state.endDate,
      nextTierThreshold: findNextTierThreshold(tiers, state.currentLevelNumber),
    });
  }
  return result;
}

export async function evaluateDuePeriods(
  now: string = new Date().toISOString(),
): Promise<EvaluateDuePeriodsResult> {
  requireLevelEnabled();
  const tiers = await listTiersFromRepo();

  let processed = 0;
  const failedUserIds: string[] = [];
  let cursor: QueryDocumentSnapshot | undefined;

  while (true) {
    const { items: page, lastDoc } = await queryDuePeriodsPage(now, DUE_PERIOD_PAGE_SIZE, cursor);
    if (page.length === 0) break;

    for (const member of page) {
      try {
        await finalizePeriodTransaction(member.userId, (current) => {
          const { startDate, endDate } = nextPeriodBoundary(current.endDate);
          const historyEntry: LevelHistoryEntry = {
            userId: current.userId,
            levelNumber: current.currentLevelNumber,
            periodStartDate: current.startDate,
            periodEndDate: current.endDate,
            tierSnapshot: tiers,
            evaluatedAt: new Date().toISOString(),
          };
          const updatedState: MemberLevelState = {
            ...current,
            startDate,
            endDate,
            currentPeriodTotal: 0,
          };
          return { updatedState, historyEntry };
        });
        processed += 1;
      } catch (error) {
        failedUserIds.push(member.userId);
        console.error(
          JSON.stringify({
            type: 'api',
            severity: 'ERROR',
            message: 'level.evaluateDuePeriods: failed to evaluate member period',
            userId: member.userId,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    }

    if (!lastDoc) break;
    cursor = lastDoc;
  }

  return { processed, failed: failedUserIds.length, failedUserIds };
}

export async function listTiers(): Promise<LevelTier[]> {
  return listTiersFromRepo();
}

function validateTierOrdering(tiers: LevelTier[]): void {
  const sorted = [...tiers].sort((a, b) => a.levelNumber - b.levelNumber);
  const lowest = sorted[0];
  if (lowest && lowest.levelNumber === 1 && lowest.metricThreshold !== 0) {
    throw Object.assign(new Error('levelNumber 1 must have metricThreshold 0'), {
      code: 'level-tier-invalid-floor',
    });
  }
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].metricThreshold <= sorted[i - 1].metricThreshold) {
      throw Object.assign(
        new Error('metricThreshold must increase monotonically with levelNumber'),
        {
          code: 'level-tier-invalid-ordering',
        },
      );
    }
  }
}

export async function createLevelTier(input: {
  levelNumber: number;
  name: string;
  metricThreshold: number;
}): Promise<void> {
  const tier = CreateLevelTierSchema.parse(input);
  const existing = await listTiersFromRepo();
  if (existing.some((t) => t.levelNumber === tier.levelNumber)) {
    throw Object.assign(new Error(`levelNumber ${tier.levelNumber} already exists`), {
      code: 'level-tier-duplicate',
    });
  }

  validateTierOrdering([...existing, tier]);
  await createTier(tier);
}

export async function updateLevelTier(
  levelNumber: number,
  input: { name?: string; metricThreshold?: number },
): Promise<void> {
  const patch = UpdateLevelTierSchema.parse(input);
  const existing = await listTiersFromRepo();
  const target = existing.find((t) => t.levelNumber === levelNumber);
  if (!target) {
    throw Object.assign(new Error(`tier ${levelNumber} not found`), {
      code: 'level-tier-not-found',
    });
  }

  const updatedTier: LevelTier = { ...target, ...patch };
  validateTierOrdering(existing.map((t) => (t.levelNumber === levelNumber ? updatedTier : t)));
  await updateTierInRepo(levelNumber, patch);
}

export async function deleteLevelTier(levelNumber: number): Promise<void> {
  const inUse = await hasMemberWithLevelNumber(levelNumber);
  if (inUse) {
    throw Object.assign(new Error(`tier ${levelNumber} is currently held by a member`), {
      code: 'level-tier-in-use',
    });
  }
  await deleteTier(levelNumber);
}
