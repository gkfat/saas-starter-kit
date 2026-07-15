import { z } from 'zod';

export const UserSchema = z.object({
  uid: z.string(),
  username: z.string(),
  displayName: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  providers: z.array(z.string()),
  tenantId: z.string(),
  createdAt: z.string(),
});

export const UserListSchema = z.array(UserSchema);
