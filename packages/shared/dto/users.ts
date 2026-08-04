export type CreateUserResponse = {
  userId: string;
  setupLink: string;
};

export type RegenerateSetupLinkResponse = {
  setupLink: string;
};

export type GenerateLineInviteResponse = {
  inviteLink: string;
};
