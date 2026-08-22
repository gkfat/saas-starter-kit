/**
 * Client-side only integration with the public Taiwan Calendar API
 * (https://github.com/880831ian/taiwan-calendar) — no server-side proxy, called directly
 * from the browser (the API sends `Access-Control-Allow-Origin: *`).
 */

type TaiwanCalendarDay = {
  date_format: string; // `YYYY/MM/DD`
  isHoliday: boolean;
  /** Non-empty only for named statutory holidays; ordinary weekends have `isHoliday: true` but an empty caption. */
  caption: string;
};

/** Date (`YYYY-MM-DD`) → holiday name, for named statutory holidays only (weekends excluded). */
export type HolidaysByDate = Record<string, string>;

const cache = new Map<string, Promise<HolidaysByDate>>();

/**
 * Fetches named statutory holidays for one month (`month` is 0-indexed, JS `Date`
 * convention). Resolves to an empty map on any failure (network error, unsupported year,
 * etc.) — holiday markers are a nice-to-have, never worth blocking or breaking the calendar.
 */
export function fetchTaiwanHolidays(year: number, month: number): Promise<HolidaysByDate> {
  const key = `${year}-${month}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const res = await fetch(`https://api.pin-yi.me/taiwan-calendar/${year}/${month + 1}/`);
      if (!res.ok) return {};
      const days = (await res.json()) as TaiwanCalendarDay[];

      const result: HolidaysByDate = {};
      for (const day of days) {
        if (!day.caption) continue;
        result[day.date_format.replaceAll('/', '-')] = day.caption;
      }
      return result;
    } catch {
      return {};
    }
  })();

  cache.set(key, promise);
  return promise;
}
