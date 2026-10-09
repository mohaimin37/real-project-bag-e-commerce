import mongoose from 'mongoose';

/*
 * Signed-in users, kept for a few seconds so each API call doesn't re-read the user first.
 * On the live site the API (USA) and database (Mumbai) are far apart, so every skipped read
 * saves ~200ms. Stored as BSON so each request gets its own copy to change and save.
 * Any save/update of a user clears its entry (hooks in models/User.js).
 */
const TTL_MS = 15 * 1000;
const MAX = 5000;
const users = new Map();
const { BSON } = mongoose.mongo;

export function cachedUser(id) {
  const hit = users.get(id);
  if (!hit) return null;
  if (hit.exp < Date.now()) {
    users.delete(id);
    return null;
  }
  return BSON.deserialize(hit.bson);
}

export function cacheUser(id, raw) {
  if (users.size >= MAX) users.clear();
  users.set(id, { bson: BSON.serialize(raw), exp: Date.now() + TTL_MS });
}

export const forgetUser = (id) => users.delete(String(id));
export const forgetAllUsers = () => users.clear();
