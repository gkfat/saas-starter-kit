export type User = {
  userId: string;
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  memberNo: string;
  passwordSetupPending: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};
