/**
 * Category architecture migration (client/src/content/taxonomy.js → MongoDB).
 *
 *   node src/seed/categoryArchitecture.js                      → DRY RUN (read-only): prints what it would create
 *   node src/seed/categoryArchitecture.js --apply              → backs up all categories to JSON, then creates the missing ones
 *   node src/seed/categoryArchitecture.js --apply --include-optional   → also creates fashion items marked optional
 *
 * Safety
 * - Only CREATES categories that don't exist. Never renames, moves, deactivates or deletes an existing
 *   category, and never touches products (assign products in Admin → Products afterwards).
 * - New categories are active but stay invisible on the storefront until a product is assigned
 *   (the storefront hides empty categories).
 * - Writes server/src/seed/backups/categories-<timestamp>.json before the first write.
 * - Max depth 3 (department → category → subcategory), the same rule the admin API enforces.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import env from '../config/env.js';
import Category from '../models/Category.js';
import { plannedCategories } from '../../../client/src/content/taxonomy.js';

const APPLY = process.argv.includes('--apply');
const OPTIONAL = process.argv.includes('--include-optional');
const here = path.dirname(fileURLToPath(import.meta.url));

await mongoose.connect(env.mongoUri);
const existing = await Category.find({}).lean();
const bySlug = new Map(existing.map((c) => [c.slug, c]));
const levelOf = (c) => (c ? c.level || (c.parent ? 2 : 1) : 0);

const plan = [];
const skipped = [];
const planned = new Map(); // slug → { slug, name, parentSlug, department, level }

function resolveParent(slug) {
  return bySlug.get(slug) || planned.get(slug) || null;
}

for (const entry of plannedCategories()) {
  if (bySlug.has(entry.slug) || planned.has(entry.slug)) continue;
  if (entry.optional && !OPTIONAL) {
    skipped.push(`${entry.slug} (optional fashion item — use --include-optional)`);
    continue;
  }
  let parentSlug = null;
  if (entry.isGroup) {
    // Group heading: top level for its department, or under the category named in parentOf.
    parentSlug = entry.parentOf && !['women', 'men'].includes(entry.parentOf) ? entry.parentOf : null;
  } else {
    parentSlug = entry.parent;
  }
  const parent = parentSlug ? resolveParent(parentSlug) : null;
  if (parentSlug && !parent) {
    skipped.push(`${entry.slug} (parent ${parentSlug} missing)`);
    continue;
  }
  const level = parent ? levelOf(parent) + 1 : 1;
  if (level > 3) {
    skipped.push(`${entry.slug} (would be level ${level}; max is 3)`);
    continue;
  }
  const department = parent?.department && parent.department !== 'all' ? parent.department : entry.department;
  const row = { slug: entry.slug, name: entry.label, parentSlug, department, level };
  planned.set(entry.slug, row);
  plan.push(row);
}

console.log(`\nExisting categories: ${existing.length}`);
console.log(`To create: ${plan.length}`);
for (const r of plan) console.log(`  + [L${r.level} ${r.department}] ${r.name}  /shop/${r.slug}${r.parentSlug ? `  (under ${r.parentSlug})` : '  (top level)'}`);
if (skipped.length) {
  console.log(`Skipped: ${skipped.length}`);
  skipped.forEach((s) => console.log(`  - ${s}`));
}

if (!APPLY) {
  console.log('\nDRY RUN — nothing was written. Re-run with --apply to create these categories.');
} else if (plan.length) {
  const dir = path.join(here, 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `categories-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(existing, null, 2));
  console.log(`\nBackup written: ${file}`);
  let order = 900;
  for (const r of plan) {
    const parent = r.parentSlug ? await Category.findOne({ slug: r.parentSlug }).select('_id') : null;
    // eslint-disable-next-line no-await-in-loop
    await Category.create({
      name: r.name,
      slug: r.slug,
      parent: parent?._id || null,
      department: r.department,
      level: r.level,
      sortOrder: order++,
      isActive: true,
      showInMenu: true,
    });
    console.log(`  created ${r.slug}`);
  }
  console.log('\nDone. Assign products to the new categories in Admin → Products; empty ones stay hidden on the storefront.');
}

await mongoose.disconnect();
process.exit(0);
