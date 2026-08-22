import { z } from 'zod';

export const BookingApprovalModeSchema = z.enum(['auto', 'manual']);

export const CreateBookingServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  approvalMode: BookingApprovalModeSchema,
  enabled: z.boolean().optional(),
});

export const UpdateBookingServiceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  approvalMode: BookingApprovalModeSchema.optional(),
  enabled: z.boolean().optional(),
});

export const CreateBookingTimeSlotSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  capacity: z.number().int().positive(),
});

export const UpdateBookingTimeSlotSchema = z.object({
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  capacity: z.number().int().positive().optional(),
});

export const BulkCreateBookingTimeSlotsSchema = z.object({
  slots: z
    .array(
      z.object({
        startAt: z.string().datetime(),
        endAt: z.string().datetime(),
        capacity: z.number().int().positive(),
      }),
    )
    .min(1),
});

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const BookingSlotGranularityMinutesSchema = z.union([
  z.literal(15),
  z.literal(30),
  z.literal(60),
]);

export const BookingWeekdaySchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

const WeekdaysArraySchema = z
  .array(BookingWeekdaySchema)
  .min(1)
  .refine((weekdays) => new Set(weekdays).size === weekdays.length, {
    message: 'weekdays must not contain duplicates',
  });

export const CreateBookingSlotTemplateSchema = z
  .object({
    name: z.string().min(1),
    weekdays: WeekdaysArraySchema,
    dailyStartTime: z.string().regex(HH_MM),
    dailyEndTime: z.string().regex(HH_MM),
    granularityMinutes: BookingSlotGranularityMinutesSchema,
    defaultCapacity: z.number().int().positive(),
  })
  .superRefine((value, ctx) => {
    if (value.dailyEndTime <= value.dailyStartTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dailyEndTime'],
        message: 'dailyEndTime must be later than dailyStartTime',
      });
    }
  });

export const UpdateBookingSlotTemplateSchema = z
  .object({
    name: z.string().min(1).optional(),
    weekdays: WeekdaysArraySchema.optional(),
    dailyStartTime: z.string().regex(HH_MM).optional(),
    dailyEndTime: z.string().regex(HH_MM).optional(),
    granularityMinutes: BookingSlotGranularityMinutesSchema.optional(),
    defaultCapacity: z.number().int().positive().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.dailyStartTime && value.dailyEndTime && value.dailyEndTime <= value.dailyStartTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dailyEndTime'],
        message: 'dailyEndTime must be later than dailyStartTime',
      });
    }
  });

export const BookingProviderWorkingHoursSchema = z
  .object({
    weekdays: WeekdaysArraySchema,
    dailyStartTime: z.string().regex(HH_MM),
    dailyEndTime: z.string().regex(HH_MM),
  })
  .superRefine((value, ctx) => {
    if (value.dailyEndTime <= value.dailyStartTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dailyEndTime'],
        message: 'dailyEndTime must be later than dailyStartTime',
      });
    }
  });

export const CreateBookingProviderSchema = z.object({
  name: z.string().min(1),
  workingHours: BookingProviderWorkingHoursSchema.optional(),
  enabled: z.boolean().optional(),
  serviceIds: z.array(z.string().min(1)).optional(),
});

export const UpdateBookingProviderSchema = z.object({
  name: z.string().min(1).optional(),
  workingHours: BookingProviderWorkingHoursSchema.nullable().optional(),
  enabled: z.boolean().optional(),
  serviceIds: z.array(z.string().min(1)).optional(),
});

export const CreateBookingSchema = z.object({
  serviceId: z.string().min(1),
  timeSlotId: z.string().min(1),
  providerId: z.string().min(1).optional(),
  note: z.string().trim().min(1).max(200).optional(),
});

export const ReviewBookingSchema = z.object({
  status: z.enum(['confirmed', 'rejected']),
});
