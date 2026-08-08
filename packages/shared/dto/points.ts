export const PointsAdjustReason = {
  ConsumptionReward: 'consumption_reward',
  ComplaintCompensation: 'complaint_compensation',
  CampaignGift: 'campaign_gift',
  BirthdayGift: 'birthday_gift',
  Other: 'other',
} as const;

export type PointsAdjustReason = (typeof PointsAdjustReason)[keyof typeof PointsAdjustReason];

export const PointsAdjustReasonMeta: Record<PointsAdjustReason, string> = {
  consumption_reward: '消費回饋',
  complaint_compensation: '客訴補償',
  campaign_gift: '活動贈送',
  birthday_gift: '生日禮',
  other: '其他',
};

export type PointsSettings = {
  pointsPerUnit: number;
  currencyValue: number;
  updatedAt: string;
  updatedBy: string;
};

export type PointsMemberState = {
  userId: string;
  balance: number;
  updatedAt: string;
};

export type PointsLedgerEntry = {
  id: string;
  userId: string;
  amount: number;
  reason: PointsAdjustReason;
  reasonNote?: string;
  balanceAfter: number;
  createdAt: string;
  createdBy: string;
};

export type PointsWallet = {
  balance: number;
  redeemableAmount: number;
};

export type PointsMemberRow = {
  userId: string;
  memberNo: string;
  displayName: string;
  email: string | null;
  balance: number;
};

export type PointsMemberDetail = {
  userId: string;
  balance: number;
  ledger: PointsLedgerEntry[];
};

export type UpdatePointsSettingsRequest = {
  pointsPerUnit: number;
  currencyValue: number;
};

export type AdjustPointsRequest = {
  amount: number;
  reason: PointsAdjustReason;
  reasonNote?: string;
};
