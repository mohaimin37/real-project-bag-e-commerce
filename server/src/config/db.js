import mongoose from 'mongoose';
import env from './env.js';

// Filters on fields that aren't in a schema are dropped. Operator injection from
// request input is stripped earlier by middleware/sanitize.js.
mongoose.set('strictQuery', true);

export async function connectDB() {
  const conn = await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 15000,
    maxPoolSize: Number(process.env.MONGO_POOL_SIZE) || 50, // per process
    minPoolSize: 5, // keep warm connections so the first requests after idle aren't slow
    compressors: ['zlib'], // smaller responses over the network to Atlas
  });
  console.log(`MongoDB connected: ${conn.connection.name}`);
  return conn;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
