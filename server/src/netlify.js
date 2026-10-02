/**
 * Runs the Express API as a Netlify Function (see client/netlify/functions/api.mjs).
 * The database connection is opened once per warm function instance and reused.
 */
import serverless from 'serverless-http';
import { connectDB } from './config/db.js';
import app from './app.js';

let connecting;
const run = serverless(app, {
  // Requests arrive as /.netlify/functions/api/<original path>; Express expects the original path.
  basePath: '/.netlify/functions/api',
  binary: ['image/*', 'multipart/form-data', 'application/octet-stream'],
});

export async function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false; // keep the DB pool open between calls
  connecting ||= connectDB().catch((err) => {
    connecting = null; // retry on the next request
    throw err;
  });
  await connecting;
  return run(event, context);
}
