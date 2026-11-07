import { Counter } from '../models/Counter.js';
import { DailyCount } from '../models/DailyCount.js';
import { getDayCount, incrementDay, listDays, resetDay } from '../services/countService.js';
import { computeStats } from '../utils/stats.js';
import { addDays, dayRange, diffDays, todayInTz } from '../utils/date.js';
import { slugify, toCsv } from '../utils/csv.js';
import { HttpError, asyncHandler } from '../utils/http.js';

const MAX_COUNTERS_PER_USER = 25;
const MAX_HISTORY_DAYS = 366;

/**
 * Route middleware: load the counter in :id and make sure it belongs to the
 * logged-in user. A counter owned by someone else returns 404 (not 403) so
 * we don't confirm that the id exists.
 */
export const loadCounter = asyncHandler(async (req, _res, next) => {
  const counter = await Counter.findOne({ _id: req.valid.params.id, userId: req.user._id });
  if (!counter) throw new HttpError(404, 'Counter not found');
  req.counter = counter;
  next();
});

/** Key identifying today's record for the current request. */
const todayKey = (req) => ({
  userId: req.user._id,
  counterId: req.counter._id,
  date: todayInTz(req.user.timezone),
});

// ---------------------------------------------------------------------------
// Counter CRUD
// ---------------------------------------------------------------------------

/** GET /api/counters – the user's counters, each with today's count. */
export async function listCounters(req, res) {
  const today = todayInTz(req.user.timezone);
  const counters = await Counter.find({ userId: req.user._id }).sort({ createdAt: 1 });
  const todays = await DailyCount.find(
    { userId: req.user._id, date: today, counterId: { $in: counters.map((c) => c._id) } },
    { counterId: 1, count: 1 }
  ).lean();
  const byCounter = new Map(todays.map((d) => [d.counterId.toString(), d.count]));

  res.json({
    date: today,
    timezone: req.user.timezone,
    counters: counters.map((c) => ({ ...c.toPublic(), today: byCounter.get(c._id.toString()) ?? 0 })),
  });
}

/** POST /api/counters */
export async function createCounter(req, res) {
  const total = await Counter.countDocuments({ userId: req.user._id });
  if (total >= MAX_COUNTERS_PER_USER) {
    throw new HttpError(400, `You can have at most ${MAX_COUNTERS_PER_USER} counters`);
  }
  const counter = await Counter.create({ userId: req.user._id, name: req.valid.body.name });
  res.status(201).json({ counter: { ...counter.toPublic(), today: 0 } });
}

/** PATCH /api/counters/:id – rename. */
export async function renameCounter(req, res) {
  req.counter.name = req.valid.body.name;
  await req.counter.save();
  res.json({ counter: req.counter.toPublic() });
}

/** DELETE /api/counters/:id – removes the counter and its whole history. */
export async function deleteCounter(req, res) {
  await DailyCount.deleteMany({ userId: req.user._id, counterId: req.counter._id });
  await req.counter.deleteOne();
  res.json({ ok: true });
}

// ---------------------------------------------------------------------------
// Today
// ---------------------------------------------------------------------------

/** GET /api/counters/:id/today */
export async function getToday(req, res) {
  const key = todayKey(req);
  const count = await getDayCount(key);
  res.json({ counterId: req.counter.id, date: key.date, timezone: req.user.timezone, count });
}

/** POST /api/counters/:id/increment  { amount: 1 | -1 } */
export async function increment(req, res) {
  const key = todayKey(req);
  const result = await incrementDay({ ...key, amount: req.valid.body.amount });
  res.json({ counterId: req.counter.id, timezone: req.user.timezone, ...result });
}

/** POST /api/counters/:id/reset-today */
export async function resetToday(req, res) {
  const result = await resetDay(todayKey(req));
  res.json({ counterId: req.counter.id, timezone: req.user.timezone, ...result });
}

// ---------------------------------------------------------------------------
// History, stats, export
// ---------------------------------------------------------------------------

/**
 * GET /api/counters/:id/history?from&to
 * Returns every day in the range (gaps filled with 0) so charts/calendars
 * don't need to do it. Defaults to the last 30 days.
 */
export async function history(req, res) {
  const today = todayInTz(req.user.timezone);
  const to = req.valid.query.to || today;
  const from = req.valid.query.from || addDays(to, -29);

  if (diffDays(from, to) + 1 > MAX_HISTORY_DAYS) {
    throw new HttpError(400, `Range too large (max ${MAX_HISTORY_DAYS} days)`);
  }

  const records = await listDays({ userId: req.user._id, counterId: req.counter._id, from, to });
  const byDate = new Map(records.map((r) => [r.date, r.count]));
  const days = dayRange(from, to).map((date) => ({ date, count: byDate.get(date) ?? 0 }));

  res.json({
    counterId: req.counter.id,
    timezone: req.user.timezone,
    today,
    from,
    to,
    total: days.reduce((sum, d) => sum + d.count, 0),
    days,
  });
}

/** GET /api/counters/:id/stats */
export async function stats(req, res) {
  const today = todayInTz(req.user.timezone);
  const records = await listDays({ userId: req.user._id, counterId: req.counter._id, to: today });
  res.json({
    counterId: req.counter.id,
    timezone: req.user.timezone,
    date: today,
    ...computeStats(records, today),
  });
}

/** GET /api/counters/:id/export.csv – full history (or ?from&to) as CSV. */
export async function exportCsv(req, res) {
  const { from, to } = req.valid.query;
  const records = await listDays({ userId: req.user._id, counterId: req.counter._id, from, to });
  const csv = toCsv(
    ['date', 'count', 'counter'],
    records.map((r) => [r.date, r.count, req.counter.name])
  );
  const filename = `${slugify(req.counter.name)}-history-${todayInTz(req.user.timezone)}.csv`;

  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
  });
  // BOM so Excel opens UTF-8 labels (e.g. emoji, accents) correctly.
  res.send('﻿' + csv);
}
