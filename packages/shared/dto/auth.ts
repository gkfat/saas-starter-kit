export type LoginProvider = 'password' | 'google' | 'phone' | 'line';
export type ProviderType = 'password' | 'google' | 'line';

export type AuthUser = {
  userId: string;
  username: string | null;
  email: string | null;
  displayName: string | null;
  phone: string | null;
  providers: ProviderType[];
  role: string;
  permissions: string[];
};
