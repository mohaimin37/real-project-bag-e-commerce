import mongoose from 'mongoose';
import GiftCard from './src/models/GiftCard.js';
import dotenv from 'dotenv';
dotenv.config();

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const cards = [
    { code: 'WILDGIFT500', initialBalance: 500, currentBalance: 500, pin: '1234' },
    { code: 'WILDGIFT1000', initialBalance: 1000, currentBalance: 1000, pin: '1234' },
    { code: 'WILDGIFT2000', initialBalance: 2000, currentBalance: 2000, pin: '1234' },
  ];

  for (const c of cards) {
    const existing = await GiftCard.findOne({ code: c.code });
    if (!existing) {
      await GiftCard.create(c);
      console.log(`Created gift card: ${c.code} (₹${c.initialBalance})`);
    } else {
      console.log(`Gift card ${c.code} already exists (Balance: ₹${existing.currentBalance})`);
    }
  }

  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
