/**
 * Day-boundary (timezone) logic. Pure functions, no database needed.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  dayKeyInTz,
  dayRange,
  diffDays,
  isValidDayKey,
  isValidTimeZone,
  msUntilNextDay,
  startOfMonth,
  startOfWeek,
} from '../src/utils/date.js';

describe('dayKeyInTz – the day is the USER’s day, not the server’s', () => {
  test('Lagos (UTC+1): 23:30 UTC is already the next day', () => {
    const instant = new Date('2024-03-10T23:30:00Z');
    assert.equal(dayKeyInTz('Africa/Lagos', instant), '2024-03-11');
    assert.equal(dayKeyInTz('UTC', instant), '2024-03-10');
  });

  test('Lagos: midnight boundary is exactly 23:00 UTC', () => {
    assert.equal(dayKeyInTz('Africa/Lagos', new Date('2024-06-01T22:59:59.999Z')), '2024-06-01');
    assert.equal(dayKeyInTz('Africa/Lagos', new Date('2024-06-01T23:00:00.000Z')), '2024-06-02');
  });

  test('timezones behind UTC are still on the previous day', () => {
    const instant = new Date('2024-01-01T03:00:00Z');
    assert.equal(dayKeyInTz('America/New_York', instant), '2023-12-31');
    assert.equal(dayKeyInTz('Asia/Tokyo', instant), '2024-01-01');
  });

  test('half-hour offsets (India, UTC+5:30)', () => {
    assert.equal(dayKeyInTz('Asia/Kolkata', new Date('2024-05-05T18:29:00Z')), '2024-05-05');
    assert.equal(dayKeyInTz('Asia/Kolkata', new Date('2024-05-05T18:30:00Z')), '2024-05-06');
  });

  test('DST transition day in New York keeps correct boundaries', () => {
    // 2024-03-10 is the spring-forward day (UTC-5 -> UTC-4).
    assert.equal(dayKeyInTz('America/New_York', new Date('2024-03-10T04:59:00Z')), '2024-03-09');
    assert.equal(dayKeyInTz('America/New_York', new Date('2024-03-10T05:00:00Z')), '2024-03-10');
    assert.equal(dayKeyInTz('America/New_York', new Date('2024-03-11T03:59:00Z')), '2024-03-10');
    assert.equal(dayKeyInTz('America/New_York', new Date('2024-03-11T04:00:00Z')), '2024-03-11');
  });

  test('invalid timezone falls back to the default (Africa/Lagos)', () => {
    const instant = new Date('2024-03-10T23:30:00Z');
    assert.equal(dayKeyInTz('Not/AZone', instant), '2024-03-11');
  });
});

describe('day-key arithmetic', () => {
  test('addDays crosses month, year and leap-day boundaries', () => {
    assert.equal(addDays('2024-02-28', 1), '2024-02-29');
    assert.equal(addDays('2024-02-29', 1), '2024-03-01');
    assert.equal(addDays('2023-12-31', 1), '2024-01-01');
    assert.equal(addDays('2024-01-01', -1), '2023-12-31');
  });

  test('addDays is unaffected by DST days', () => {
    assert.equal(addDays('2024-03-09', 1), '2024-03-10');
    assert.equal(addDays('2024-03-10', 1), '2024-03-11');
    assert.equal(addDays('2024-11-03', 1), '2024-11-04');
  });

  test('diffDays and dayRange', () => {
    assert.equal(diffDays('2024-01-30', '2024-02-02'), 3);
    assert.deepEqual(dayRange('2024-01-30', '2024-02-02'), ['2024-01-30', '2024-01-31', '2024-02-01', '2024-02-02']);
    assert.deepEqual(dayRange('2024-01-01', '2024-01-01'), ['2024-01-01']);
  });

  test('startOfWeek is Monday; startOfMonth is the 1st', () => {
    assert.equal(startOfWeek('2024-06-05'), '2024-06-03'); // Wed -> Mon
    assert.equal(startOfWeek('2024-06-03'), '2024-06-03'); // Mon -> Mon
    assert.equal(startOfWeek('2024-06-09'), '2024-06-03'); // Sun -> previous Mon
    assert.equal(startOfMonth('2024-06-09'), '2024-06-01');
  });

  test('validation helpers', () => {
    assert.ok(isValidDayKey('2024-02-29'));
    assert.ok(!isValidDayKey('2023-02-29'));
    assert.ok(!isValidDayKey('2024-2-1'));
    assert.ok(isValidTimeZone('Africa/Lagos'));
    assert.ok(!isValidTimeZone('Mars/Olympus'));
  });

  test('msUntilNextDay counts down to local midnight', () => {
    // 22:00 UTC = 23:00 Lagos -> 1 hour left.
    assert.equal(msUntilNextDay('Africa/Lagos', new Date('2024-06-01T22:00:00Z')), 3600 * 1000);
  });
});
