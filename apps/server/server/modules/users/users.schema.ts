import { z } from 'zod';
import { isValidUsername } from '@saas-starter-kit/shared';

export const CreateUserByAdminDto = z.object({
  username: z.string().refine(isValidUsername, '帳號須為 6–20 碼，全英文或英文加數字'),
  displayName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.string().min(1).optional(),
});
export type CreateUserByAdminDto = z.infer<typeof CreateUserByAdminDto>;

export const UserSchema = z.object({
  userId: z.string(),
  username: z.string(),
  displayName: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  passwordSetupPending: z.boolean(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
});

export const UserListSchema = z.array(UserSchema);
