// Builds the storefront and publishes it to Netlify (site linked in .netlify/state.json).
// `npm run deploy:web` from the repo root.
//
// Why a script: with base = "client" in netlify.toml, the CLI bundles the edge function into
// client/.netlify/ but uploads from ./.netlify/, so a plain `netlify deploy --build` silently
// ships without it. This copies the bundle across before deploying.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync } from 'node:fs';

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

run('netlify build');
const from = 'client/.netlify/edge-functions-dist';
if (!existsSync(from)) throw new Error(`Edge function bundle not found in ${from}`);
mkdirSync('.netlify/edge-functions-dist', { recursive: true });
cpSync(from, '.netlify/edge-functions-dist', { recursive: true });
run('netlify deploy --prod --dir client/dist');
