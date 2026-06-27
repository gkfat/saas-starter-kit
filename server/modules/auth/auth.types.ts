export type LoginProvider = 'email' | 'google';

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  phone: string | null;
  tenantId: string;
  role: string;
  permissions: string[];
};
