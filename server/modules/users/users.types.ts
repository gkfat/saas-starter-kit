export type User = {
  uid: string;
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  providers: string[];
  createdAt: string;
};

export type UserWithHash = User & { passwordHash: string | null };
