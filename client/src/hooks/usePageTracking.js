import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const API = `${import.meta.env.VITE_API_URL || ''}/api/track`;

function randomId() {
  return (crypto.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');
}

/** Reads (or creates) an anonymous id in the given storage; storage can be unavailable. */
function storedId(storage, key) {
  try {
    const existing = storage.getItem(key);
    if (existing) return { id: existing, isNew: false };
    const id = randomId();
    storage.setItem(key, id);
    return { id, isNew: true };
  } catch {
    return { id: randomId(), isNew: false };
  }
}

/**
 * Sends one anonymous page view per storefront navigation, for the admin Reports page.
 * No personal data; respects the browser's Do Not Track setting.
 */
export function usePageTracking() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (navigator.doNotTrack === '1' || pathname.startsWith('/admin')) return;
    const visitor = storedId(localStorage, 'wt-vid');
    const session = storedId(sessionStorage, 'wt-sid');
    const body = JSON.stringify({
      visitorId: visitor.id,
      sessionId: session.id,
      isNew: visitor.isNew,
      path: pathname,
      referrer: session.isNew ? document.referrer : '',
    });
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, credentials: 'include', keepalive: true }).catch(() => {});
  }, [pathname]);
}
