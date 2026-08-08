import { z } from 'zod';
import { PointsAdjustReason } from '@saas-starter-kit/shared';

export const UpdatePointsSettingsSchema = z.object({
  pointsPerUnit: z.number().int().positive(),
  currencyValue: z.number().positive(),
});

export const AdjustPointsSchema = z
  .object({
    amount: z
      .number()
      .int()
      .refine((value) => value !== 0, 'amount must not be zero'),
    reason: z.enum([
      PointsAdjustReason.ConsumptionReward,
      PointsAdjustReason.ComplaintCompensation,
      PointsAdjustReason.CampaignGift,
      PointsAdjustReason.BirthdayGift,
      PointsAdjustReason.Other,
    ]),
    reasonNote: z.string().trim().max(200).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.reason === PointsAdjustReason.Other && !value.reasonNote) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reasonNote'],
        message: 'reasonNote is required when reason is "other"',
      });
    }
  });
