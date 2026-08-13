export type UserOverviewStats = {
  total: number;
  active: number;
  pendingPassword: number;
  disabled: number;
  byRole: {
    admin: number;
    member: number;
  };
};

export type ActiveUsersStats = {
  dau: number;
  wau: number;
  mau: number;
  todayLogins: {
    success: number;
    failure: number;
  };
  activeRate: number;
};

export type DashboardStats = {
  userOverview: UserOverviewStats;
  activeUsers: ActiveUsersStats;
};

export const GrowthRange = {
  All: 'all',
  Today: 'today',
  Yesterday: 'yesterday',
  Week: 'week',
  Month: 'month',
  HalfYear: 'halfYear',
  Year: 'year',
} as const;

export type GrowthRange = (typeof GrowthRange)[keyof typeof GrowthRange];

export type UserGrowthPoint = {
  label: string;
  count: number;
};

export type UserGrowthSeries = {
  range: GrowthRange;
  points: UserGrowthPoint[];
};
