import { filterXSS } from 'xss';

// Fields that legitimately hold rich HTML (blog bodies). They are filtered with the
// xss whitelist instead of being fully escaped.
const RICH_FIELDS = new Set(['content']);
// Secrets are hashed or compared as-is, never rendered, so they must not be altered.
const RAW_FIELDS = new Set(['password', 'currentPassword', 'newPassword', 'confirmPassword', 'token', 'razorpayWebhookSecret']);

function clean(value, key) {
  if (RAW_FIELDS.has(key)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return RICH_FIELDS.has(key) ? filterXSS(trimmed) : filterXSS(trimmed, { whiteList: {}, stripIgnoreTag: true });
  }
  if (Array.isArray(value)) return value.map((v) => clean(v, key));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      // Drop MongoDB operator / dotted keys to block query injection.
      if (k.startsWith('$') || k.includes('.')) continue;
      out[k] = clean(v, k);
    }
    return out;
  }
  return value;
}

function stripOperators(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) delete obj[key];
    else if (typeof obj[key] === 'object') stripOperators(obj[key]);
  }
}

export default function sanitize(req, res, next) {
  if (req.body && typeof req.body === 'object') req.body = clean(req.body);
  stripOperators(req.query);
  stripOperators(req.params);
  next();
}
