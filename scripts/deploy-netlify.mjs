// Publishes the whole store to Netlify (site linked in .netlify/state.json):
// storefront + product photos on the CDN, the Express API as a function, the SEO edge function.
// `npm run deploy:web` from the repo root.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

// 1. Product photos ship with the site (served from Netlify's CDN at /uploads/seed/...).
//    They go into client/public so every build — including the one `netlify deploy` runs
//    itself — copies them into dist. (client/public/uploads is git-ignored.)
rmSync('client/public/uploads', { recursive: true, force: true });
cpSync('server/uploads/seed', 'client/public/uploads/seed', { recursive: true });

// 2. Build once to bundle the edge function. With base = "client" the CLI writes the bundle to
//    client/.netlify/ but uploads from ./.netlify/, so copy it across (otherwise it's left out).
run('netlify build');
const edge = 'client/.netlify/edge-functions-dist';
if (!existsSync(edge)) throw new Error(`Edge function bundle not found in ${edge}`);
mkdirSync('.netlify/edge-functions-dist', { recursive: true });
cpSync(edge, '.netlify/edge-functions-dist', { recursive: true });

// 3. Deploy (the CLI rebuilds, then uploads the site, the API function and the edge function).
run('netlify deploy --prod --dir client/dist --functions client/netlify/functions');
