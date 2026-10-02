/**
 * Makes the admin account match ADMIN_EMAIL / ADMIN_PASSWORD in server/.env.
 *
 *   npm run admin:sync
 *
 * - If an account already uses ADMIN_EMAIL (admin or customer), it becomes the admin
 *   with ADMIN_PASSWORD. Otherwise the single existing admin is moved to ADMIN_EMAIL.
 * - Any other admin accounts are disabled, so only ADMIN_EMAIL can enter the admin panel.
 * - Clears any failed-login lock and signs out existing admin sessions.
 * Never prints the password.
 */
import mongoose from 'mongoose';
import env from '../config/env.js';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exitCode = 1;
}

async function main() {
  const email = (env.admin.email || '').trim().toLowerCase();
  const password = env.admin.password || '';
  if (!email || !password) return fail('Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env first.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(`ADMIN_EMAIL "${email}" is not a valid email address.`);
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return fail('ADMIN_PASSWORD must be at least 8 characters and include a letter and a number.');
  }

  await connectDB();
  let user = await User.findOne({ email }).select('+password +tokenVersion');
  if (user && user.role !== 'admin') {
    // The email was registered as a shopper; promote that account (its orders and addresses stay).
    console.log(`Promoting existing customer account ${email} to admin`);
    user.role = 'admin';
  }
  if (!user) {
    const admins = await User.find({ role: 'admin' }).select('+password +tokenVersion');
    if (admins.length > 1) {
      return fail(`Found ${admins.length} admin accounts (${admins.map((a) => a.email).join(', ')}). Set ADMIN_EMAIL to the one to update.`);
    }
    user = admins[0];
    if (!user) {
      user = new User({ name: env.admin.name || 'Store Admin', email, password, role: 'admin' });
      await user.save();
      console.log(`\n✓ Created admin account ${email}`);
      return;
    }
    console.log(`Moving admin ${user.email} → ${email}`);
    user.email = email;
  }

  user.password = password; // hashed by the model on save
  user.isActive = true;
  user.failedLoginCount = 0;
  user.lockUntil = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1; // signs out old admin sessions
  await user.save();

  const check = await User.findById(user._id).select('+password');
  const ok = await check.comparePassword(password);
  if (!ok) return fail('Password was saved but did not verify. Try again.');

  // Only ADMIN_EMAIL may enter the admin panel: switch off any other admin logins.
  const others = await User.find({ role: 'admin', _id: { $ne: user._id } });
  for (const other of others) {
    // eslint-disable-next-line no-await-in-loop
    await User.updateOne({ _id: other._id }, { role: 'customer', isActive: false, $inc: { tokenVersion: 1 } });
    console.log(`  Disabled old admin login ${other.email}`);
  }

  console.log(`\n✓ Admin login is now ${email} with the password from server/.env`);
  console.log('  Sign in at /admin/login\n');
}

main()
  .catch((err) => fail(err.message))
  .finally(() => mongoose.disconnect());
