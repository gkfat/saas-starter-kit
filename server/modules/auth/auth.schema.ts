import { z } from 'zod';

export const LoginDto = z.object({
  idToken: z.string().min(1),
  provider: z.enum(['email', 'google']).default('email'),
});
export type LoginDto = z.infer<typeof LoginDto>;
