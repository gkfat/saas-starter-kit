export type LoginProvider = 'password' | 'google' | 'phone';

export type AuthUser = {
  uid: string;
  username: string | null;
  email: string | null;
  displayName: string | null;
  phone: string | null;
  providers: string[];
  tenantId: string;
  role: string;
  permissions: string[];
};
