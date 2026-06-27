import { z } from 'zod';

export const UserSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  phone: z.string().optional(),
  tenantId: z.string(),
  createdAt: z.string(),
});

export const UserListSchema = z.array(UserSchema);
