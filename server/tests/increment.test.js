/**
 * Increment / upsert logic against a real (in-memory) MongoDB.
 */
import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { DailyCount } from '../src/models/DailyCount.js';
import { getDayCount, incrementDay, resetDay } from '../src/services/countService.js';
import { clearDb, startDb, stopDb } from './helpers.js';

const userId = new mongoose.Types.ObjectId();
const counterId = new mongoose.Types.ObjectId();
const key = { userId, counterId, date: '2024-06-05' };

before(startDb);
after(stopDb);
beforeEach(clearDb);

describe('incrementDay', () => {
  test('first +1 of the day creates exactly one record', async () => {
    const r = await incrementDay({ ...key, amount: 1 });
    assert.deepEqual(r, { date: '2024-06-05', count: 1, applied: true });
    assert.equal(await DailyCount.countDocuments(), 1);
  });

  test('100 concurrent +1 taps -> count 100, still ONE record', async () => {
    await Promise.all(Array.from({ length: 100 }, () => incrementDay({ ...key, amount: 1 })));
    assert.equal(await getDayCount(key), 100);
    assert.equal(await DailyCount.countDocuments(key), 1);
  });

  test('-1 never goes below zero, even with concurrent decrements', async () => {
    await incrementDay({ ...key, amount: 1 });
    await incrementDay({ ...key, amount: 1 });
    const results = await Promise.all(Array.from({ length: 10 }, () => incrementDay({ ...key, amount: -1 })));
    assert.equal(results.filter((r) => r.applied).length, 2);
    assert.equal(await getDayCount(key), 0);
  });

  test('-1 on a day with no record is a no-op (and creates nothing)', async () => {
    const r = await incrementDay({ ...key, amount: -1 });
    assert.deepEqual(r, { date: '2024-06-05', count: 0, applied: false });
    assert.equal(await DailyCount.countDocuments(), 0);
  });

  test('mixed concurrent +1/-1 settle on the right total', async () => {
    await Promise.all(Array.from({ length: 20 }, () => incrementDay({ ...key, amount: 1 })));
    await Promise.all([
      ...Array.from({ length: 30 }, () => incrementDay({ ...key, amount: 1 })),
      ...Array.from({ length: 10 }, () => incrementDay({ ...key, amount: -1 })),
    ]);
    assert.equal(await getDayCount(key), 40);
  });

  test('each day and each counter has its own record', async () => {
    const otherCounter = new mongoose.Types.ObjectId();
    await incrementDay({ ...key, amount: 1 });
    await incrementDay({ ...key, date: '2024-06-06', amount: 1 });
    await incrementDay({ ...key, date: '2024-06-06', amount: 1 });
    await incrementDay({ ...key, counterId: otherCounter, amount: 1 });

    assert.equal(await getDayCount(key), 1); // yesterday's total is untouched
    assert.equal(await getDayCount({ ...key, date: '2024-06-06' }), 2);
    assert.equal(await getDayCount({ ...key, counterId: otherCounter }), 1);
    assert.equal(await DailyCount.countDocuments(), 3);
  });

  test('rejects zero / non-integer amounts', async () => {
    await assert.rejects(() => incrementDay({ ...key, amount: 0 }), TypeError);
    await assert.rejects(() => incrementDay({ ...key, amount: 1.5 }), TypeError);
  });

  test('unique index forbids duplicate day records', async () => {
    await DailyCount.create({ ...key, count: 1 });
    await assert.rejects(() => DailyCount.create({ ...key, count: 2 }), (err) => err.code === 11000);
  });
});

describe('resetDay', () => {
  test('sets only the given day back to 0', async () => {
    await incrementDay({ ...key, amount: 1 });
    await incrementDay({ ...key, date: '2024-06-04', amount: 1 });
    assert.deepEqual(await resetDay(key), { date: '2024-06-05', count: 0 });
    assert.equal(await getDayCount(key), 0);
    assert.equal(await getDayCount({ ...key, date: '2024-06-04' }), 1);
  });
});
