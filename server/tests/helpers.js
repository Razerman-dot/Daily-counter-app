/** Spin up an in-memory MongoDB for integration tests. */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';

let mongod;

export async function startDb() {
  mongod = await MongoMemoryServer.create();
  await connectDB(mongod.getUri('daily-counter-test'));
}

export async function stopDb() {
  await mongoose.disconnect();
  await mongod?.stop();
}

export async function clearDb() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}
