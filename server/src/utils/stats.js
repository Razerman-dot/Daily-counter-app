/**
 * Pure statistics over a counter's daily records. No DB access, so it's easy
 * to unit test. `days` is an array of { date: 'YYYY-MM-DD', count } (any order,
 * days with no record are simply absent and count as 0).
 */
import { addDays, diffDays, startOfMonth, startOfWeek } from './date.js';

export function computeStats(days, today) {
  const byDate = new Map(days.map((d) => [d.date, d.count]));
  const countOn = (date) => byDate.get(date) ?? 0;

  // Ignore anything dated after "today" (shouldn't happen, but be defensive).
  const past = days.filter((d) => d.date <= today);

  const weekStart = startOfWeek(today);
  const monthStart = startOfMonth(today);

  let allTime = 0;
  let week = 0;
  let month = 0;
  let best = null;
  let firstDate = null;

  for (const { date, count } of past) {
    allTime += count;
    if (date >= weekStart) week += count;
    if (date >= monthStart) month += count;
    if (count > 0 && (!best || count > best.count || (count === best.count && date > best.date))) {
      best = { date, count };
    }
    if (count > 0 && (!firstDate || date < firstDate)) firstDate = date;
  }

  // Average over the span from the first active day up to today (inclusive),
  // so quiet days in between pull the average down as you'd expect.
  const trackedDays = firstDate ? diffDays(firstDate, today) + 1 : 0;
  const dailyAverage = trackedDays ? round1(allTime / trackedDays) : 0;

  return {
    today: countOn(today),
    week,
    month,
    allTime,
    dailyAverage,
    trackedDays,
    bestDay: best,
    currentStreak: currentStreak(countOn, today),
    longestStreak: longestStreak(past),
  };
}

/**
 * Consecutive days with count > 0 ending today. If today has nothing yet the
 * streak is measured up to yesterday, so it doesn't "break" first thing in
 * the morning before the user has had a chance to count.
 */
export function currentStreak(countOn, today) {
  let day = countOn(today) > 0 ? today : addDays(today, -1);
  let streak = 0;
  while (countOn(day) > 0) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

export function longestStreak(days) {
  const active = days
    .filter((d) => d.count > 0)
    .map((d) => d.date)
    .sort();
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const date of active) {
    run = prev && diffDays(prev, date) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = date;
  }
  return longest;
}

const round1 = (n) => Math.round(n * 10) / 10;
