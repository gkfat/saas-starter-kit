export type RequestContext = {
  requestId: string;
  userId: string;
  tenantId: string;
  role: string;
  permissions: string[];
};
