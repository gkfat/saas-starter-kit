import dayjs from '~/utils/dayjs';
import { useTimezoneStore } from '~/stores/timezone';

type TimeValue = { hours: number; minutes: number };

// VueDatePicker always reads/writes using the browser's local timezone.
// To make the split date/time pickers reflect the app's selected timezone
// instead, we translate the ISO instant into date/time parts equal to the
// wall-clock time in that timezone, and translate back the same way when
// either part changes.
export function useDateTimeParts(source: Ref<string | undefined>) {
  const timezoneStore = useTimezoneStore();

  const datePart = computed<Date | null>({
    get: () => {
      if (!source.value) return null;
      const zoned = dayjs(source.value).tz(timezoneStore.selected);
      return new Date(zoned.year(), zoned.month(), zoned.date());
    },
    set: (value) => writeParts(value, timePart.value),
  });

  const timePart = computed<TimeValue | null>({
    get: () => {
      if (!source.value) return null;
      const zoned = dayjs(source.value).tz(timezoneStore.selected);
      return { hours: zoned.hour(), minutes: zoned.minute() };
    },
    set: (value) => writeParts(datePart.value, value),
  });

  function writeParts(date: Date | null, time: TimeValue | null) {
    if (!date) {
      source.value = '';
      return;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    const hours = pad(Number(time?.hours ?? 0));
    const minutes = pad(Number(time?.minutes ?? 0));
    const wallClock = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${hours}:${minutes}:00`;
    source.value = dayjs.tz(wallClock, timezoneStore.selected).toISOString();
  }

  return { datePart, timePart };
}
