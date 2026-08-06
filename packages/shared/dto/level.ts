export type LevelTier = {
  levelNumber: number;
  name: string;
  metricThreshold: number;
};

export type MemberLevelState = {
  userId: string;
  startDate: string;
  endDate: string;
  currentPeriodTotal: number;
  currentLevelNumber: number;
};

export type LevelMetricEntry = {
  userId: string;
  amount: number;
  reason: string;
  source: string;
  refId?: string;
  occurredAt: string;
};

export type LevelHistoryEntry = {
  userId: string;
  levelNumber: number;
  periodStartDate: string;
  periodEndDate: string;
  tierSnapshot: LevelTier[];
  evaluatedAt: string;
};

export type GetLevelResult = {
  levelNumber: number;
  levelName: string;
  currentPeriodTotal: number;
  startDate: string;
  endDate: string;
  /** Metric threshold of the next tier above the current one; null when already at the highest tier. */
  nextTierThreshold: number | null;
};

export type EvaluateDuePeriodsResult = {
  processed: number;
  failed: number;
  failedUserIds: string[];
};

export type CreateLevelTierRequest = {
  levelNumber: number;
  name: string;
  metricThreshold: number;
};

export type UpdateLevelTierRequest = {
  name?: string;
  metricThreshold?: number;
};
