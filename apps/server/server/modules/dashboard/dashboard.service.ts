import dayjs, { type Dayjs } from 'dayjs';
import { getAccountStatus } from '../identity';
import { getTodayLoginCounts } from '../logs';
import { getAllUsers } from '../users';
import { getRoleForUser } from '../roles';
import type {
  DashboardStats,
  GrowthRange,
  UserGrowthPoint,
  UserGrowthSeries,
} from './dashboard.types';
import { Role } from '@saas-starter-kit/shared';

export async function getDashboardStats(): Promise<DashboardStats> {
  const users = await getAllUsers();
  const details = await Promise.all(
    users.map(async (user) => ({
      user,
      status: await getAccountStatus(user.userId),
      role: await getRoleForUser(user.userId),
    })),
  );
  const members = details.map(({ user, status, role }) => ({
    ...user,
    disabled: status.disabled,
    role,
  }));

  const total = members.length;
  const disabled = members.filter((m) => m.disabled).length;
  const pendingPassword = members.filter((m) => !m.disabled && m.passwordSetupPending).length;
  const active = total - disabled - pendingPassword;
  const byRole = {
    admin: members.filter((m) => m.role === Role.Admin).length,
    member: members.filter((m) => m.role === Role.Member).length,
  };

  const startOfDay = dayjs().startOf('day');
  const wauSince = dayjs().subtract(7, 'day');
  const mauSince = dayjs().subtract(30, 'day');
  const dau = members.filter(
    (m) => m.lastLoginAt && !dayjs(m.lastLoginAt).isBefore(startOfDay),
  ).length;
  const wau = members.filter(
    (m) => m.lastLoginAt && !dayjs(m.lastLoginAt).isBefore(wauSince),
  ).length;
  const mau = members.filter(
    (m) => m.lastLoginAt && !dayjs(m.lastLoginAt).isBefore(mauSince),
  ).length;

  const todayLogins = await getTodayLoginCounts();
  const activeRate = total === 0 ? 0 : mau / total;

  return {
    userOverview: { total, active, pendingPassword, disabled, byRole },
    activeUsers: { dau, wau, mau, todayLogins, activeRate },
  };
}

type BucketUnit = 'hour' | 'day';

function getGrowthRangeConfig(
  range: GrowthRange,
  earliestCreatedAt: string | null,
): { start: Dayjs; end: Dayjs; unit: BucketUnit } {
  const now = dayjs();

  switch (range) {
    case 'today':
      return { start: now.startOf('day'), end: now, unit: 'hour' };
    case 'yesterday': {
      const yesterday = now.subtract(1, 'day');
      return { start: yesterday.startOf('day'), end: yesterday.endOf('day'), unit: 'hour' };
    }
    case 'week':
      return { start: now.subtract(6, 'day').startOf('day'), end: now, unit: 'day' };
    case 'month':
      return { start: now.subtract(29, 'day').startOf('day'), end: now, unit: 'day' };
    case 'halfYear':
      return { start: now.subtract(181, 'day').startOf('day'), end: now, unit: 'day' };
    case 'year':
      return { start: now.subtract(364, 'day').startOf('day'), end: now, unit: 'day' };
    case 'all':
    default: {
      const start = earliestCreatedAt
        ? dayjs(earliestCreatedAt).startOf('day')
        : now.startOf('day');
      return { start, end: now, unit: 'day' };
    }
  }
}

function bucketKey(date: Dayjs, unit: BucketUnit): string {
  return unit === 'hour' ? date.format('YYYY-MM-DDTHH') : date.format('YYYY-MM-DD');
}

function bucketLabel(date: Dayjs, unit: BucketUnit): string {
  return unit === 'hour' ? date.format('HH:00') : date.format('MM/DD');
}

export async function getUserGrowthSeries(range: GrowthRange): Promise<UserGrowthSeries> {
  const users = await getAllUsers();
  const earliestCreatedAt = users.reduce<string | null>(
    (earliest, u) => (!earliest || u.createdAt < earliest ? u.createdAt : earliest),
    null,
  );

  const { start, end, unit } = getGrowthRangeConfig(range, earliestCreatedAt);

  const points: UserGrowthPoint[] = [];
  const bucketIndexByKey = new Map<string, number>();
  for (let cursor = start; !cursor.isAfter(end); cursor = cursor.add(1, unit)) {
    bucketIndexByKey.set(bucketKey(cursor, unit), points.length);
    points.push({ label: bucketLabel(cursor, unit), count: 0 });
  }

  for (const user of users) {
    const createdAt = dayjs(user.createdAt);
    if (createdAt.isBefore(start) || createdAt.isAfter(end)) continue;
    const index = bucketIndexByKey.get(bucketKey(createdAt, unit));
    if (index !== undefined) points[index].count += 1;
  }

  return { range, points };
}
