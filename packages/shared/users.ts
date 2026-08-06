import type { GetLevelResult } from './dto/level';

export type UserRow = {
  userId: string;
  username: string;
  email: string | null;
  phone: string | null;
  memberNo: string;
  displayName: string;
  role: string | null;
  disabled: boolean;
  passwordSetupPending: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  level?: GetLevelResult | null;
};
