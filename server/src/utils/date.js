/**
 * Day-boundary helpers.
 *
 * The app stores counts per *calendar day in the user's timezone*, as a plain
 * "YYYY-MM-DD" string. Two rules keep this robust:
 *
 *  1. Converting an instant -> day key always goes through the user's IANA
 *     timezone (never the server's local time, never raw UTC).
 *  2. Arithmetic on day keys (add days, ranges, week/month starts) is done on
 *     the key itself, treated as a UTC date at midnight. Day keys have no time
 *     component, so this is pure calendar math and can't be broken by DST.
 */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

export const DAY_FORMAT = 'YYYY-MM-DD';
export const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || 'Africa/Lagos';

/** True when `tz` is an IANA timezone the runtime understands. */
export function isValidTimeZone(tz) {
  if (typeof tz !== 'string' || !tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** True when `str` is a real calendar date in strict YYYY-MM-DD form. */
export function isValidDayKey(str) {
  return typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str) && dayjs(str, DAY_FORMAT, true).isValid();
}

/**
 * The day key ("YYYY-MM-DD") for instant `now` as seen in timezone `tz`.
 * Example: 2024-03-10T23:30:00Z is "2024-03-11" in Africa/Lagos (UTC+1).
 */
export function dayKeyInTz(tz = DEFAULT_TIMEZONE, now = new Date()) {
  const zone = isValidTimeZone(tz) ? tz : DEFAULT_TIMEZONE;
  return dayjs(now).tz(zone).format(DAY_FORMAT);
}

/** Alias that reads better at call sites. */
export const todayInTz = dayKeyInTz;

/** Add (or subtract) whole days to a day key. */
export function addDays(dayKey, n) {
  return dayjs.utc(dayKey, DAY_FORMAT).add(n, 'day').format(DAY_FORMAT);
}

/** Whole days from `a` to `b` (b - a). */
export function diffDays(a, b) {
  return dayjs.utc(b, DAY_FORMAT).diff(dayjs.utc(a, DAY_FORMAT), 'day');
}

/** Inclusive list of day keys from `from` to `to`. */
export function dayRange(from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Monday of the ISO week containing `dayKey`. */
export function startOfWeek(dayKey) {
  const d = dayjs.utc(dayKey, DAY_FORMAT);
  const offset = (d.day() + 6) % 7; // Sun=0 -> 6, Mon=1 -> 0, ...
  return d.subtract(offset, 'day').format(DAY_FORMAT);
}

/** First day of the month containing `dayKey`. */
export function startOfMonth(dayKey) {
  return `${dayKey.slice(0, 7)}-01`;
}

/** Milliseconds from `now` until the next midnight in `tz`. */
export function msUntilNextDay(tz = DEFAULT_TIMEZONE, now = new Date()) {
  const zone = isValidTimeZone(tz) ? tz : DEFAULT_TIMEZONE;
  const local = dayjs(now).tz(zone);
  const next = local.add(1, 'day').startOf('day');
  return next.valueOf() - local.valueOf();
}
