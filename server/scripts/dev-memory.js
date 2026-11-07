/**
 * Try the API without installing MongoDB: starts an in-memory MongoDB,
 * seeds the demo user, and runs the server against it. Data is lost on exit.
 *
 *   node scripts/dev-memory.js
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Always run from /server so the MongoDB binary cache (node_modules/.cache)
// and relative script paths resolve the same way however this is launched.
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
delete process.env.INIT_CWD; // set by `npm --prefix`; would move the binary cache elsewhere
const { MongoMemoryServer } = await import('mongodb-memory-server');

const mongod = await MongoMemoryServer.create();
const env = {
  ...process.env,
  MONGODB_URI: mongod.getUri('daily-counter'),
  JWT_SECRET: process.env.JWT_SECRET || 'dev-only-secret-dev-only-secret-dev-only',
};
console.log(`🧪 In-memory MongoDB at ${env.MONGODB_URI}`);

const run = (args) => spawn(process.execPath, args, { env, stdio: 'inherit' });

await new Promise((resolve, reject) =>
  run(['scripts/seed.js']).on('exit', (code) => (code === 0 ? resolve() : reject(new Error('seed failed'))))
);

const server = run(['src/server.js']);
const stop = async () => {
  server.kill();
  await mongod.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
