export type LoginProvider = 'email' | 'google' | 'phone';

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  tenantId: string;
  role: string;
  permissions: string[];
};
