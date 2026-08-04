export type ProviderType = 'password' | 'google' | 'line';

export type UserAuth = {
  userId: string;
  providerType: ProviderType;
  providerUserId: string;
  firebaseUid: string;
  createdAt: string;
};
