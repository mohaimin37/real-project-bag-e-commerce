/**
 * Runs the Express API as a Netlify Function (see client/netlify/functions/api.mjs).
 * The database connection is opened once per warm function instance and reused.
 */
if (typeof globalThis.__filename === 'undefined') {
  globalThis.__filename = '/var/task/client/netlify/functions/api.js';
}
import serverless from 'serverless-http';
import { connectDB } from './config/db.js';
import app from './app.js';

let connecting;
const run = serverless(app, {
  // Requests arrive as /.netlify/functions/api/<original path>; Express expects the original path.
  basePath: '/.netlify/functions/api',
  binary: ['image/*', 'multipart/form-data', 'application/octet-stream', 'application/pdf'],
});

export async function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false; // keep the DB pool open between calls
  // Gives this request access to Netlify Blobs (where photos uploaded on the live site are kept).
  if (event.blobs) (await import('@netlify/blobs')).connectLambda(event);
  connecting ||= connectDB().catch((err) => {
    connecting = null; // retry on the next request
    throw err;
  });
  await connecting;
  return run(event, context);
}
