export type UserRow = {
  userId: string;
  username: string;
  email: string | null;
  displayName: string;
  role: string | null;
  disabled: boolean;
  passwordSetupPending: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};
