export type RequestContext = {
  requestId: string;
  userId?: string;
  tenantId?: string;
  role?: string;
  permissions?: string[];
};

// Narrowed type available after auth middleware has run
export type AuthenticatedContext = Required<RequestContext>;
