/**
 * Seed a demo user with two counters and 30 days of sample history.
 *
 *   npm run seed
 *
 * Safe to re-run: the demo user (and all of their data) is wiped first.
 * Login: demo@example.com / demo12345
 */
import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Counter } from '../src/models/Counter.js';
import { DailyCount } from '../src/models/DailyCount.js';
import { addDays, todayInTz } from '../src/utils/date.js';

const DEMO = { name: 'Demo User', email: 'demo@example.com', password: 'demo12345', timezone: 'Africa/Lagos' };
const DAYS = 30;

/** Deterministic pseudo-random numbers so every seed looks the same. */
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  if (!env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  await connectDB(env.MONGODB_URI);

  // Remove any previous demo data.
  const existing = await User.findOne({ email: DEMO.email });
  if (existing) {
    await DailyCount.deleteMany({ userId: existing._id });
    await Counter.deleteMany({ userId: existing._id });
    await existing.deleteOne();
  }

  const user = new User({ name: DEMO.name, email: DEMO.email, timezone: DEMO.timezone });
  await user.setPassword(DEMO.password);
  await user.save();

  const pushups = await Counter.create({ userId: user._id, name: 'Push-ups' });
  const water = await Counter.create({ userId: user._id, name: 'Glasses of water' });

  const rand = mulberry32(42);
  const today = todayInTz(user.timezone);
  const docs = [];

  for (let i = DAYS - 1; i >= 1; i--) {
    const date = addDays(today, -i);
    // Push-ups: mostly 20–80, with the occasional rest day.
    const rest = rand() < 0.12;
    docs.push({ userId: user._id, counterId: pushups._id, date, count: rest ? 0 : 20 + Math.floor(rand() * 61) });
    // Water: 4–10 glasses every day.
    docs.push({ userId: user._id, counterId: water._id, date, count: 4 + Math.floor(rand() * 7) });
  }
  // A bit of progress already "today".
  docs.push({ userId: user._id, counterId: pushups._id, date: today, count: 15 });
  docs.push({ userId: user._id, counterId: water._id, date: today, count: 3 });

  await DailyCount.insertMany(docs);

  console.log(`🌱 Seeded ${docs.length} daily records for ${DEMO.email} (${DAYS} days, 2 counters)`);
  console.log(`   Log in with ${DEMO.email} / ${DEMO.password}`);
  await disconnectDB();
}

main().catch(async (err) => {
  console.error('❌ Seed failed:', err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
