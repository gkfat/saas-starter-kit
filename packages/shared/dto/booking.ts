export type BookingApprovalMode = 'auto' | 'manual';

export type BookingService = {
  id: string;
  name: string;
  description?: string;
  approvalMode: BookingApprovalMode;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateBookingServiceRequest = {
  name: string;
  description?: string;
  approvalMode: BookingApprovalMode;
  enabled?: boolean;
};

export type UpdateBookingServiceRequest = {
  name?: string;
  description?: string;
  approvalMode?: BookingApprovalMode;
  enabled?: boolean;
};

export type BookingTimeSlot = {
  id: string;
  serviceId: string;
  startAt: string;
  endAt: string;
  capacity: number;
  confirmedCount: number;
  pendingCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateBookingTimeSlotRequest = {
  startAt: string;
  endAt: string;
  capacity: number;
};

export type UpdateBookingTimeSlotRequest = {
  startAt?: string;
  endAt?: string;
  capacity?: number;
};

export type BulkCreateBookingTimeSlotsRequest = {
  slots: Array<{ startAt: string; endAt: string; capacity: number }>;
};

export type BulkCreateBookingTimeSlotsResult = {
  created: BookingTimeSlot[];
  skippedCount: number;
};

/** How finely a slot template's daily business hours are sliced into individual time slots. */
export type BookingSlotGranularityMinutes = 15 | 30 | 60;

/** Day of week, `0` = Sunday ... `6` = Saturday (JS `Date#getDay()` convention). */
export type BookingWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * A reusable "generation recipe" for bulk-creating time slots: a weekly recurring pattern
 * (which days of the week are business days), each sliced into same-length slots across the
 * same daily hours. The template carries no specific dates — applying it to a target month
 * expands `weekdays` into that month's matching dates. Templates are independent of any
 * Service — applying one to a Service's time slots produces concrete, independently editable
 * `BookingTimeSlot` records; the template itself is never referenced afterward.
 */
export type BookingSlotTemplate = {
  id: string;
  name: string;
  /** Business days of the week, at least one entry, no duplicates. */
  weekdays: BookingWeekday[];
  /** Daily start time, `HH:mm`, interpreted in whatever timezone the admin applies it in. */
  dailyStartTime: string;
  /** Daily end time, `HH:mm`; must be later than `dailyStartTime`. */
  dailyEndTime: string;
  granularityMinutes: BookingSlotGranularityMinutes;
  defaultCapacity: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateBookingSlotTemplateRequest = {
  name: string;
  weekdays: BookingWeekday[];
  dailyStartTime: string;
  dailyEndTime: string;
  granularityMinutes: BookingSlotGranularityMinutes;
  defaultCapacity: number;
};

export type UpdateBookingSlotTemplateRequest = Partial<CreateBookingSlotTemplateRequest>;

/** A provider's recurring weekly attendance hours — same shape as `BookingSlotTemplate`'s schedule fields. */
export type BookingProviderWorkingHours = {
  /** Weekdays the provider attends, at least one entry, no duplicates. */
  weekdays: BookingWeekday[];
  /** Daily attendance start time, `HH:mm`. */
  dailyStartTime: string;
  /** Daily attendance end time, `HH:mm`; must be later than `dailyStartTime`. */
  dailyEndTime: string;
};

export type BookingProvider = {
  id: string;
  name: string;
  /**
   * Weekly attendance hours. Unset means the provider is not bookable for ANY service or time
   * slot — attendance hours must be explicitly configured before a provider can take bookings.
   */
  workingHours?: BookingProviderWorkingHours;
  /**
   * Whether this provider can be booked at all. Defaults to `true`; older records created
   * before this field existed are also treated as `true`. Set `false` to permanently take a
   * provider out of rotation, independent of `workingHours`/`serviceIds` — e.g. someone on
   * long-term leave.
   */
  enabled?: boolean;
  /**
   * Service items this provider can be assigned to. Unset or empty means the provider cannot
   * be assigned to ANY service.
   */
  serviceIds?: string[];
  createdAt: string;
};

export type CreateBookingProviderRequest = {
  name: string;
  workingHours?: BookingProviderWorkingHours;
  enabled?: boolean;
  serviceIds?: string[];
};

export type UpdateBookingProviderRequest = {
  name?: string;
  /** `null` clears previously set attendance hours. */
  workingHours?: BookingProviderWorkingHours | null;
  enabled?: boolean;
  /** `[]` clears all service assignments. */
  serviceIds?: string[];
};

export type BookingStatus = 'pendingReview' | 'confirmed' | 'rejected' | 'cancelled';

export type Booking = {
  id: string;
  memberId: string;
  serviceId: string;
  timeSlotId: string;
  providerId?: string;
  /** Optional free-text note the member leaves when creating the booking. */
  note?: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  /** Set only while `status` is `pendingReview`; equals the time slot's `startAt`. */
  reviewDeadlineAt?: string;
};

export type CreateBookingRequest = {
  serviceId: string;
  timeSlotId: string;
  providerId?: string;
  note?: string;
};

export type ReviewBookingRequest = {
  status: 'confirmed' | 'rejected';
};

/**
 * A `Booking` enriched with member/service/time-slot display data, joined server-side for
 * the admin bookings list — `Booking` itself stays a pure Firestore-shaped record.
 */
export type AdminBookingRow = {
  id: string;
  memberId: string;
  memberNo: string;
  memberDisplayName: string;
  serviceId: string;
  serviceName: string;
  timeSlotId: string;
  timeSlotStartAt: string;
  timeSlotEndAt: string;
  providerId?: string;
  providerName?: string;
  note?: string;
  status: BookingStatus;
  createdAt: string;
};

/** `createdAt` descending, offset-paginated response for the admin bookings list. */
export type PaginatedAdminBookingsResponse = {
  items: AdminBookingRow[];
  /** Total count matching the current filters (not just the current page). */
  total: number;
};

export type ProcessOverdueBookingsResult = {
  processedCount: number;
};
