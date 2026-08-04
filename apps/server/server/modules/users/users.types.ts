export type User = {
  userId: string;
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  passwordSetupPending: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};
