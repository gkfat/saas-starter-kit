import { z } from 'zod';
import { isValidUsername, isValidPassword } from '../../../shared/utils/validation';

export const PasswordLoginDto = z.object({
  provider: z.literal('password'),
  identifier: z.string().min(1),
  password: z.string().min(1),
});
export type PasswordLoginDto = z.infer<typeof PasswordLoginDto>;

export const OAuthLoginDto = z.object({
  provider: z.enum(['google', 'phone']),
  idToken: z.string().min(1),
});
export type OAuthLoginDto = z.infer<typeof OAuthLoginDto>;

export const LoginDto = z.discriminatedUnion('provider', [PasswordLoginDto, OAuthLoginDto]);
export type LoginDto = z.infer<typeof LoginDto>;

export const RegisterDto = z.object({
  username: z.string().refine(isValidUsername, '帳號須為 6–8 碼英數字'),
  password: z.string().refine(isValidPassword, '密碼須為 6–8 碼英數字'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});
export type RegisterDto = z.infer<typeof RegisterDto>;

export const GoogleRegisterDto = z.object({
  username: z.string().refine(isValidUsername, '帳號須為 6–8 碼英數字'),
  idToken: z.string().min(1),
});
export type GoogleRegisterDto = z.infer<typeof GoogleRegisterDto>;

export const GoogleLoginDto = z.object({
  idToken: z.string().min(1),
});
export type GoogleLoginDto = z.infer<typeof GoogleLoginDto>;
