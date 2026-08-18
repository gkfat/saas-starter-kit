import { z } from 'zod';
import { isValidUsername, isValidPhone } from '@saas-starter-kit/shared';

export const LoginDto = z.object({
  idToken: z.string().min(1),
  provider: z.enum(['password', 'google', 'line']),
});
export type LoginDto = z.infer<typeof LoginDto>;

export const RegisterDto = z.object({
  idToken: z.string().min(1),
  username: z.string().refine(isValidUsername, '帳號須為 6–20 碼，全英文或英文加數字'),
  email: z.string().email().optional(),
  phone: z.string().refine(isValidPhone, '請輸入正確的手機號碼').optional(),
});
export type RegisterDto = z.infer<typeof RegisterDto>;

export const GoogleRegisterDto = z.object({
  username: z.string().refine(isValidUsername, '帳號須為 6–20 碼，全英文或英文加數字'),
  idToken: z.string().min(1),
});
export type GoogleRegisterDto = z.infer<typeof GoogleRegisterDto>;

export const GoogleLoginDto = z.object({
  idToken: z.string().min(1),
});
export type GoogleLoginDto = z.infer<typeof GoogleLoginDto>;
