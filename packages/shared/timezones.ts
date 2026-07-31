export const TimezoneOptions = [
  { label: '(UTC-12:00) Baker Island', value: 'Etc/GMT+12' },
  { label: '(UTC-11:00) Pago Pago', value: 'Etc/GMT+11' },
  { label: '(UTC-10:00) Hawaii', value: 'Etc/GMT+10' },
  { label: '(UTC-09:00) Alaska', value: 'Etc/GMT+9' },
  { label: '(UTC-08:00) Los Angeles', value: 'Etc/GMT+8' },
  { label: '(UTC-07:00) Denver', value: 'Etc/GMT+7' },
  { label: '(UTC-06:00) Chicago', value: 'Etc/GMT+6' },
  { label: '(UTC-05:00) New York', value: 'Etc/GMT+5' },
  { label: '(UTC-04:00) Santiago', value: 'Etc/GMT+4' },
  { label: '(UTC-03:00) Buenos Aires', value: 'Etc/GMT+3' },
  { label: '(UTC-02:00) South Georgia', value: 'Etc/GMT+2' },
  { label: '(UTC-01:00) Azores', value: 'Etc/GMT+1' },
  { label: '(UTC+00:00) London', value: 'UTC' },
  { label: '(UTC+01:00) Berlin', value: 'Etc/GMT-1' },
  { label: '(UTC+02:00) Cairo', value: 'Etc/GMT-2' },
  { label: '(UTC+03:00) Moscow', value: 'Etc/GMT-3' },
  { label: '(UTC+04:00) Dubai', value: 'Etc/GMT-4' },
  { label: '(UTC+05:00) Karachi', value: 'Etc/GMT-5' },
  { label: '(UTC+06:00) Dhaka', value: 'Etc/GMT-6' },
  { label: '(UTC+07:00) Bangkok', value: 'Etc/GMT-7' },
  { label: '(UTC+08:00) Taipei', value: 'Asia/Taipei' },
  { label: '(UTC+09:00) Tokyo', value: 'Asia/Tokyo' },
  { label: '(UTC+10:00) Sydney', value: 'Etc/GMT-10' },
  { label: '(UTC+11:00) Solomon Islands', value: 'Etc/GMT-11' },
  { label: '(UTC+12:00) Auckland', value: 'Etc/GMT-12' },
] as const;

export type TimezoneValue = (typeof TimezoneOptions)[number]['value'];

export const DEFAULT_TIMEZONE: TimezoneValue = 'Asia/Taipei';
