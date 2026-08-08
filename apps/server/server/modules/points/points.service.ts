import { FeatureFlag } from '@saas-starter-kit/shared';
import {
  getMemberState,
  getMemberStatesByUserIds,
  getSettings as getSettingsFromRepo,
  listLedgerEntriesForMember,
  recordPointsAdjustmentTransaction,
  updateSettings as updateSettingsInRepo,
} from './points.repo';
import { AdjustPointsSchema, UpdatePointsSettingsSchema } from './points.schema';
import type {
  PointsLedgerEntry,
  PointsMemberState,
  PointsSettings,
  PointsWallet,
} from './points.types';

function isPointsEnabled(): boolean {
  return useRuntimeConfig().public.featureFlags[FeatureFlag.Points];
}

function requirePointsEnabled(): void {
  if (!isPointsEnabled()) {
    throw Object.assign(new Error('Points module is disabled'), { code: 'points-disabled' });
  }
}

function calculateRedeemableAmount(balance: number, settings: PointsSettings | null): number {
  if (!settings || settings.pointsPerUnit <= 0) return 0;
  return Math.floor(balance / settings.pointsPerUnit) * settings.currencyValue;
}

export async function getSettings(): Promise<PointsSettings | null> {
  requirePointsEnabled();
  return getSettingsFromRepo();
}

export async function updatePointsSettings(
  input: { pointsPerUnit: number; currencyValue: number },
  updatedBy: string,
): Promise<PointsSettings> {
  requirePointsEnabled();
  const parsed = UpdatePointsSettingsSchema.parse(input);
  const settings: PointsSettings = {
    ...parsed,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  await updateSettingsInRepo(settings);
  return settings;
}

export async function getWallet(userId: string): Promise<PointsWallet> {
  requirePointsEnabled();
  const [state, settings] = await Promise.all([getMemberState(userId), getSettingsFromRepo()]);
  const balance = state?.balance ?? 0;
  return { balance, redeemableAmount: calculateRedeemableAmount(balance, settings) };
}

export async function getMemberBalance(userId: string): Promise<number> {
  requirePointsEnabled();
  const state = await getMemberState(userId);
  return state?.balance ?? 0;
}

export async function getMemberBalancesForUsers(userIds: string[]): Promise<Map<string, number>> {
  if (!isPointsEnabled() || userIds.length === 0) return new Map();

  const states = await getMemberStatesByUserIds(userIds);
  const result = new Map<string, number>();
  for (const [userId, state] of states) {
    result.set(userId, state.balance);
  }
  return result;
}

export async function listLedgerForMember(userId: string): Promise<PointsLedgerEntry[]> {
  requirePointsEnabled();
  return listLedgerEntriesForMember(userId);
}

export async function adjustMemberPoints(input: {
  userId: string;
  amount: number;
  reason: string;
  reasonNote?: string;
  createdBy: string;
}): Promise<PointsMemberState> {
  requirePointsEnabled();
  const { userId, createdBy } = input;
  const { amount, reason, reasonNote } = AdjustPointsSchema.parse({
    amount: input.amount,
    reason: input.reason,
    reasonNote: input.reasonNote,
  });

  return recordPointsAdjustmentTransaction(userId, (current, entryId) => {
    const newBalance = current.balance + amount;
    if (newBalance < 0) {
      throw Object.assign(new Error('Adjustment would result in a negative balance'), {
        code: 'points-insufficient-balance',
      });
    }

    const updatedState: PointsMemberState = {
      userId,
      balance: newBalance,
      updatedAt: new Date().toISOString(),
    };
    const entry: PointsLedgerEntry = {
      id: entryId,
      userId,
      amount,
      reason,
      reasonNote,
      balanceAfter: newBalance,
      createdAt: new Date().toISOString(),
      createdBy,
    };
    return { updatedState, entry };
  });
}
