import mongoose from 'mongoose';

/**
 * ONE document per (user, counter, calendar day).
 *
 * `date` is the day key "YYYY-MM-DD" in the *user's* timezone at the moment
 * the count happened. Storing a string (not a Date) makes the day boundary
 * explicit and immune to server timezone / DST surprises.
 */
const dailyCountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    counterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Counter', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    count: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true }
);

// The heart of the data model: at most one record per user/counter/day.
// Combined with atomic upserts this makes concurrent taps safe.
dailyCountSchema.index({ userId: 1, counterId: 1, date: 1 }, { unique: true });

export const DailyCount = mongoose.models.DailyCount || mongoose.model('DailyCount', dailyCountSchema);
