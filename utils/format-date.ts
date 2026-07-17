import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-tw';
import 'dayjs/locale/en';

dayjs.extend(relativeTime);

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD HH:mm');
}

export function formatRelativeTime(value: string | null | undefined, locale: string): string {
  if (!value) return '-';
  return dayjs(value)
    .locale(locale === 'zh-TW' ? 'zh-tw' : 'en')
    .fromNow();
}
