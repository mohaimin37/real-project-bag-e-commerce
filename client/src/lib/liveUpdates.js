// Shared labels/icons for live update kinds (admin panel + storefront feed).
export const UPDATE_KINDS = {
  news: { label: 'Store news', icon: 'campaign', tone: 'neutral' },
  drop: { label: 'New drop', icon: 'new_releases', tone: 'teal' },
  restock: { label: 'Back in stock', icon: 'inventory', tone: 'mint' },
  event: { label: 'Event', icon: 'event', tone: 'amber' },
  offer: { label: 'Offer', icon: 'sell', tone: 'danger' },
};

/** How often the storefront re-checks for new updates. */
export const LIVE_POLL_MS = 15000;
