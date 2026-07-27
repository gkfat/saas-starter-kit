import { z } from 'zod';
import { FEATURE_MODULES, type FeatureModule } from '~/shared/feature-modules';

export const FeatureRequestDto = z.object({
  name: z.string().min(1, '請填寫姓名'),
  business: z.string().optional(),
  email: z.string().email('Email 格式不正確'),
  modules: z
    .array(z.string())
    .min(1)
    .refine((modules) => modules.every((m) => FEATURE_MODULES.includes(m as FeatureModule)), {
      message: '功能模組參數不正確',
    }),
});
export type FeatureRequestDto = z.infer<typeof FeatureRequestDto>;
