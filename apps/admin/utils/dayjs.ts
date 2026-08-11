import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/zh-tw';
import 'dayjs/locale/en';

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

export default dayjs;
