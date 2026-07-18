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

export type UserGrowthStats = {
  today: number;
  thisWeek: number;
  thisMonth: number;
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
  userGrowth: UserGrowthStats;
  activeUsers: ActiveUsersStats;
};
