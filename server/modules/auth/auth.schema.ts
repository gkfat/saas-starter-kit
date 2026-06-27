import { z } from 'zod';

export const LoginDto = z.object({
  idToken: z.string().min(1),
  provider: z.enum(['email', 'google', 'phone']).default('email'),
});
export type LoginDto = z.infer<typeof LoginDto>;

export const OtpVerifyDto = z.object({
  idToken: z.string().min(1),
  phone: z.string().min(8),
});
export type OtpVerifyDto = z.infer<typeof OtpVerifyDto>;
