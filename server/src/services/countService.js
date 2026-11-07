/**
 * All reads/writes of DailyCount go through this module.
 *
 * Concurrency guarantees
 * ----------------------
 *  - +N uses a single findOneAndUpdate with `$inc` + `upsert: true`. MongoDB
 *    applies $inc atomically, so N parallel taps always add up to N.
 *  - Two first-taps-of-the-day racing each other may both try to insert. The
 *    unique index rejects the loser with E11000; MongoDB ≥4.2 retries that
 *    internally, and we also retry once ourselves as a belt-and-braces measure.
 *  - −N only matches documents whose count is ≥ N (`count: { $gte: N }`), so
 *    the floor of 0 is enforced *inside* the atomic update – no read/modify/
 *    write window where two decrements could push the count negative.
 */
import { DailyCount } from '../models/DailyCount.js';

const DUPLICATE_KEY = 11000;

/**
 * Add `amount` (positive or negative) to the given day's count.
 * @returns {{ date: string, count: number, applied: boolean }}
 *   `applied` is false when a decrement was refused because it would go < 0.
 */
export async function incrementDay({ userId, counterId, date, amount }) {
  if (!Number.isInteger(amount) || amount === 0) {
    throw new TypeError('amount must be a non-zero integer');
  }
  const key = { userId, counterId, date };

  if (amount > 0) {
    const doc = await withDuplicateRetry(() =>
      DailyCount.findOneAndUpdate(
        key,
        { $inc: { count: amount } },
        { upsert: true, new: true, setDefaultsOnInsert: true, lean: true }
      )
    );
    return { date, count: doc.count, applied: true };
  }

  // Decrement: only succeeds if it won't go below zero.
  const doc = await DailyCount.findOneAndUpdate(
    { ...key, count: { $gte: -amount } },
    { $inc: { count: amount } },
    { new: true, lean: true }
  );
  if (doc) return { date, count: doc.count, applied: true };

  // Nothing (or not enough) to subtract – report the unchanged current value.
  const current = await getDayCount(key);
  return { date, count: current, applied: false };
}

/** Set a day's count back to 0 (keeps the record so the day stays visible). */
export async function resetDay({ userId, counterId, date }) {
  await DailyCount.updateOne({ userId, counterId, date }, { $set: { count: 0 } });
  return { date, count: 0 };
}

/** Current count for a day (0 when no record exists yet). */
export async function getDayCount({ userId, counterId, date }) {
  const doc = await DailyCount.findOne({ userId, counterId, date }, { count: 1 }).lean();
  return doc?.count ?? 0;
}

/** All records for a counter, optionally within [from, to], oldest first. */
export async function listDays({ userId, counterId, from, to }) {
  const filter = { userId, counterId };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }
  return DailyCount.find(filter, { _id: 0, date: 1, count: 1 }).sort({ date: 1 }).lean();
}

async function withDuplicateRetry(fn, attempts = 2) {
  try {
    return await fn();
  } catch (err) {
    if (err?.code === DUPLICATE_KEY && attempts > 1) return withDuplicateRetry(fn, attempts - 1);
    throw err;
  }
}
