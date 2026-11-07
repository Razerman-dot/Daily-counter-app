/** Entry point: connect to MongoDB, then start the HTTP server. */
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';

async function main() {
  if (!env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }

  await connectDB(env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const server = createApp().listen(env.PORT, () => {
    console.log(`🚀 API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  // Graceful shutdown so in-flight increments finish before the process exits.
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down…`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
