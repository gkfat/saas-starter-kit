export type User = {
  uid: string;
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  providers: string[];
  tenantId: string;
  createdAt: string;
};

export type UserWithHash = User & { passwordHash: string | null };
