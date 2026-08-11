import dayjs from './dayjs';
import { useTimezoneStore } from '~/stores/timezone';

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const store = useTimezoneStore();
  return dayjs(value).tz(store.selected).format('YYYY-MM-DD HH:mm');
}

export function formatRelativeTime(value: string | null | undefined, locale: string): string {
  if (!value) return '-';
  return dayjs(value)
    .locale(locale === 'zh-TW' ? 'zh-tw' : 'en')
    .fromNow();
}
