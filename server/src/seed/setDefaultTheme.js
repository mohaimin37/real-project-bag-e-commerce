import mongoose from 'mongoose';
import Setting from '../models/Setting.js';
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../../.env', import.meta.url) });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const updated = await Setting.findOneAndUpdate(
    { key: 'store' },
    { $set: { 'appearance.defaultTheme': 'default', 'appearance.defaultMode': 'dark' } },
    { returnDocument: 'after' }
  );
  console.log('Successfully updated default appearance in MongoDB:', updated?.appearance);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
