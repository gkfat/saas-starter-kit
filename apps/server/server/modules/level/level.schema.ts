import { z } from 'zod';

export const RecordMetricSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().nonnegative(),
  reason: z.string().min(1),
  source: z.string().min(1),
  refId: z.string().optional(),
});

export const CreateLevelTierSchema = z.object({
  levelNumber: z.number().int().positive(),
  name: z.string().min(1),
  metricThreshold: z.number().nonnegative(),
});

export const UpdateLevelTierSchema = z.object({
  name: z.string().min(1).optional(),
  metricThreshold: z.number().nonnegative().optional(),
});
