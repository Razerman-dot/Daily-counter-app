import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats } from '../src/utils/stats.js';

const days = [
  { date: '2024-05-27', count: 5 }, // previous week
  { date: '2024-05-31', count: 10 }, // previous month
  { date: '2024-06-01', count: 4 },
  { date: '2024-06-02', count: 0 }, // explicit zero (e.g. reset)
  { date: '2024-06-03', count: 7 }, // Monday
  { date: '2024-06-04', count: 3 },
  { date: '2024-06-05', count: 6 }, // today (Wednesday)
];

test('computeStats aggregates today/week/month/all-time', () => {
  const s = computeStats(days, '2024-06-05');
  assert.equal(s.today, 6);
  assert.equal(s.week, 16); // Mon–Wed
  assert.equal(s.month, 20); // Jun 1–5
  assert.equal(s.allTime, 35);
  assert.deepEqual(s.bestDay, { date: '2024-05-31', count: 10 });
});

test('daily average spans from the first active day to today', () => {
  const s = computeStats(days, '2024-06-05');
  assert.equal(s.trackedDays, 10); // May 27 – Jun 5
  assert.equal(s.dailyAverage, 3.5);
});

test('streak counts consecutive non-zero days ending today', () => {
  assert.equal(computeStats(days, '2024-06-05').currentStreak, 3);
  assert.equal(computeStats(days, '2024-06-05').longestStreak, 3);
});

test('streak is not broken just because nothing was counted yet today', () => {
  assert.equal(computeStats(days, '2024-06-06').currentStreak, 3);
  assert.equal(computeStats(days, '2024-06-07').currentStreak, 0);
});

test('empty history', () => {
  const s = computeStats([], '2024-06-05');
  assert.equal(s.allTime, 0);
  assert.equal(s.dailyAverage, 0);
  assert.equal(s.bestDay, null);
  assert.equal(s.currentStreak, 0);
});
