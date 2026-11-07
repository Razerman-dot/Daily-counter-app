/** Client-side day helpers (mirror of the server's day-key logic). */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const DAY_FORMAT = 'YYYY-MM-DD';

/** Today's day key in the user's timezone. */
export function todayIn(tz) {
  try {
    return dayjs().tz(tz).format(DAY_FORMAT);
  } catch {
    return dayjs().format(DAY_FORMAT);
  }
}

/** Format a day key for display without any timezone shifting. */
export function formatDay(dayKey, fmt = 'ddd, D MMM') {
  return dayjs.utc(dayKey, DAY_FORMAT).format(fmt);
}

export function addDays(dayKey, n) {
  return dayjs.utc(dayKey, DAY_FORMAT).add(n, 'day').format(DAY_FORMAT);
}

/** The browser's own IANA timezone (used as a sensible default at sign-up). */
export function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Lagos';
  } catch {
    return 'Africa/Lagos';
  }
}

/** All IANA timezones the browser knows, for the settings picker. */
export function allTimeZones() {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return ['Africa/Lagos', 'UTC', 'Europe/London', 'America/New_York', 'Asia/Tokyo'];
  }
}

export { dayjs };
