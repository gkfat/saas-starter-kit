import { z } from 'zod';

export const CouponDiscountTypeSchema = z.enum(['fixed', 'percentage', 'item']);
export const CouponTemplateStatusSchema = z.enum(['draft', 'published', 'disabled']);

export const CreateCouponTemplateSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    discountType: CouponDiscountTypeSchema,
    discountValue: z.number().positive().optional(),
    validDays: z.number().int().positive(),
    status: CouponTemplateStatusSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (
      (value.discountType === 'fixed' || value.discountType === 'percentage') &&
      value.discountValue === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discountValue'],
        message: 'discountValue is required for fixed/percentage discountType',
      });
    }
  });

export const UpdateCouponTemplateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  discountType: CouponDiscountTypeSchema.optional(),
  discountValue: z.number().positive().optional(),
  validDays: z.number().int().positive().optional(),
  status: CouponTemplateStatusSchema.optional(),
});

export const IssueCouponsSchema = z.object({
  memberIds: z.array(z.string().min(1)).min(1),
});

export const RedeemCouponSchema = z.object({
  code: z.string().min(1),
});
