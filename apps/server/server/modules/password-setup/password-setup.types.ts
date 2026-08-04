export type PasswordSetupToken = {
  token: string;
  userId: string;
  firebaseUid: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
};
