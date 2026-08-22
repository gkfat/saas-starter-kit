import dayjs from './dayjs';

export function formatDateOnly(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatTimeOfDay(time: { hours: number; minutes: number }): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(time.hours)}:${pad(time.minutes)}`;
}

export function parseTimeOfDay(value: string): { hours: number; minutes: number } {
  const [hours, minutes] = value.split(':').map(Number);
  return { hours, minutes };
}

export type GeneratedTimeSlot = { startAt: string; endAt: string; capacity: number };

/**
 * Returns every date (as `YYYY-MM-DD`) in the given month (`month` is 0-indexed, JS `Date`
 * convention) whose day-of-week is in `weekdays` (`0`=Sunday..`6`=Saturday).
 */
export function weekdayDatesInMonth(year: number, month: number, weekdays: number[]): string[] {
  const weekdaySet = new Set(weekdays);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    if (weekdaySet.has(date.getDay())) dates.push(formatDateOnly(date));
  }
  return dates;
}

/**
 * Slices one business day's [dailyStartTime, dailyEndTime) wall-clock range into same-length
 * chunks of `granularityMinutes`, resolved against `timezone` into concrete ISO instants. A
 * trailing remainder shorter than one full chunk is dropped (e.g. a 09:00–17:05 range at
 * 30-minute granularity yields a last slot of 16:30–17:00, not a 5-minute one).
 */
export function generateDaySlots(
  date: string,
  dailyStartTime: string,
  dailyEndTime: string,
  granularityMinutes: number,
  timezone: string,
  capacity: number,
): GeneratedTimeSlot[] {
  const pad = (n: number) => String(n).padStart(2, '0');
  const [startHour, startMinute] = dailyStartTime.split(':').map(Number);
  const [endHour, endMinute] = dailyEndTime.split(':').map(Number);
  const dailyStartMinutes = startHour * 60 + startMinute;
  const dailyEndMinutes = endHour * 60 + endMinute;

  const slots: GeneratedTimeSlot[] = [];
  for (
    let minutes = dailyStartMinutes;
    minutes + granularityMinutes <= dailyEndMinutes;
    minutes += granularityMinutes
  ) {
    const slotStartTime = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
    const slotEndMinutes = minutes + granularityMinutes;
    const slotEndTime = `${pad(Math.floor(slotEndMinutes / 60))}:${pad(slotEndMinutes % 60)}`;

    slots.push({
      startAt: dayjs.tz(`${date}T${slotStartTime}:00`, timezone).toISOString(),
      endAt: dayjs.tz(`${date}T${slotEndTime}:00`, timezone).toISOString(),
      capacity,
    });
  }
  return slots;
}

/**
 * Expands a weekday-recurring template into concrete time slots for every matching date in
 * the given month (`month` is 0-indexed). The template carries no dates of its own — the
 * target month is supplied by the caller (the slot management page's currently viewed month).
 */
export function generateTimeSlotsForMonth(
  template: {
    weekdays: number[];
    dailyStartTime: string;
    dailyEndTime: string;
    granularityMinutes: number;
  },
  year: number,
  month: number,
  timezone: string,
  capacity: number,
): GeneratedTimeSlot[] {
  return weekdayDatesInMonth(year, month, template.weekdays).flatMap((date) =>
    generateDaySlots(
      date,
      template.dailyStartTime,
      template.dailyEndTime,
      template.granularityMinutes,
      timezone,
      capacity,
    ),
  );
}
