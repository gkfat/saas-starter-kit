import { defineStore } from 'pinia';
import { DEFAULT_TIMEZONE, TimezoneOptions, type TimezoneValue } from '~/shared/timezones';

const STORAGE_KEY = 'timezone_preference';

function readStoredTimezone(): TimezoneValue {
  if (typeof localStorage === 'undefined') return DEFAULT_TIMEZONE;
  const stored = localStorage.getItem(STORAGE_KEY);
  const isValid = TimezoneOptions.some((tz) => tz.value === stored);
  return isValid ? (stored as TimezoneValue) : DEFAULT_TIMEZONE;
}

export const useTimezoneStore = defineStore('timezone', {
  state: () => ({
    selected: readStoredTimezone() as TimezoneValue,
  }),

  actions: {
    setTimezone(value: TimezoneValue) {
      this.selected = value;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, value);
      }
    },
  },
});
