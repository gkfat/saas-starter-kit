export type User = {
  uid: string;
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  providers: string[];
  passwordSetupPending: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export type UserWithHash = User & { passwordHash: string | null };
