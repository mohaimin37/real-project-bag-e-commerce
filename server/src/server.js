import cluster from 'node:cluster';
import env from './config/env.js';
import { connectDB } from './config/db.js';
import app from './app.js';

// WEB_CONCURRENCY=N runs N worker processes (one per CPU core) behind one port.
// Leave unset (1) on small/free plans; raise it on bigger machines.
const WORKERS = Math.max(1, Number(process.env.WEB_CONCURRENCY) || 1);

async function start() {
  await connectDB();
  const server = app.listen(env.port, () => {
    if (cluster.isWorker && cluster.worker.id !== 1) return; // log once
    console.log(`WILDTANE API listening on ${env.serverUrl}${WORKERS > 1 ? ` (${WORKERS} workers)` : ''}`);
    console.log(
      `Integrations — WhatsApp: ${env.whatsapp.enabled ? 'Cloud API' : 'dev log'}, ` +
        `uploads: ${env.cloudinary.enabled ? 'Cloudinary' : 'local disk'}, email: ${env.smtp.enabled ? 'SMTP' : 'dev log'}, ` +
        `AI writer: ${env.gemini.enabled ? `Gemini (${env.gemini.model})` : 'off (set GEMINI_API_KEY)'}`
    );
  });
  // Slightly above typical load-balancer idle timeouts, so kept-alive connections aren't cut mid-request.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 10_000).unref(); // don't hang on open connections
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (cluster.isPrimary && WORKERS > 1) {
  for (let i = 0; i < WORKERS; i += 1) cluster.fork();
  // Relay cache flushes (see middleware/cache.js) so every worker drops stale catalogue data.
  cluster.on('message', (from, msg) => {
    if (msg?.type !== 'cache:flush') return;
    for (const w of Object.values(cluster.workers)) if (w && w !== from) w.send(msg);
  });
  cluster.on('exit', (worker, code) => {
    if (code !== 0) {
      console.error(`Worker ${worker.process.pid} exited (${code}); starting a replacement`);
      cluster.fork();
    }
  });
} else {
  start().catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
}
