import mongoose from 'mongoose';

/**
 * Connect to MongoDB. Indexes are built automatically by Mongoose
 * (autoIndex) in development; in production we call syncIndexes() once at
 * boot so the unique { userId, counterId, date } index is guaranteed to exist
 * before we start accepting increments.
 */
export async function connectDB(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });

  // Make sure the critical unique indexes exist (idempotent).
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
