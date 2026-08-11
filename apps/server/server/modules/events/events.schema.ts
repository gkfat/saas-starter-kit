import { z } from 'zod';

// Schedule ordering (endAt > startAt) is validated explicitly in events.service.ts
// rather than via `.superRefine` here, so both create and update paths raise the same
// domain error (`event-invalid-schedule`) that API handlers map to a 400 response —
// matching the domain-error pattern used elsewhere in this module (see coupons.service.ts).
export const CreateEventSchema = z.object({
  title: z.string().min(1),
  copyText: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  enabled: z.boolean().optional(),
});

export const UpdateEventSchema = z.object({
  title: z.string().min(1).optional(),
  copyText: z.string().min(1).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  enabled: z.boolean().optional(),
});

export const UploadBannerSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  size: z
    .number()
    .int()
    .positive()
    .max(5 * 1024 * 1024),
});
