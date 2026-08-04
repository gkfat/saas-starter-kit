export type RequestContext = {
  requestId: string;
  userId?: string;
  firebaseUid?: string;
  role?: string;
  permissions?: string[];
  phone?: string;
  email?: string;
  displayName?: string;
};

// Narrowed type available after auth middleware has run
export type AuthenticatedContext = Required<
  Omit<RequestContext, 'phone' | 'email' | 'displayName'>
> & {
  phone?: string;
  email?: string;
  displayName?: string;
};
