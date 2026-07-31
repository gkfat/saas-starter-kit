import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/zh-tw';
import 'dayjs/locale/en';
import { useTimezoneStore } from '~/stores/timezone';

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

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
