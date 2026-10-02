import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../lib/api';

const read = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) — keep in memory only */
  }
};

// ── Auth ─────────────────────────────────────────────────────

export const fetchMe = createAsyncThunk('auth/me', async () => (await api.me()).user);

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, status: 'loading' },
  reducers: {
    setUser(state, { payload }) {
      state.user = payload;
      state.status = 'ready';
    },
    clearUser(state) {
      state.user = null;
      state.status = 'ready';
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchMe.fulfilled, (s, { payload }) => {
      s.user = payload;
      s.status = 'ready';
    });
    b.addCase(fetchMe.rejected, (s) => {
      s.user = null;
      s.status = 'ready';
    });
  },
});

// ── Guest bag (persisted in localStorage until sign-in) ─────

const guestCartSlice = createSlice({
  name: 'guestCart',
  initialState: { items: read('wt-guest-cart', []), shippingMethod: 'standard' },
  reducers: {
    addGuestItem(state, { payload }) {
      const existing = state.items.find((i) => i.productId === payload.productId && i.variantId === payload.variantId);
      if (existing) existing.quantity = Math.min(99, existing.quantity + payload.quantity);
      else state.items.push({ productId: payload.productId, variantId: payload.variantId, quantity: payload.quantity });
    },
    setGuestQty(state, { payload }) {
      const item = state.items.find((i) => `${i.productId}:${i.variantId}` === payload.key);
      if (item) item.quantity = payload.quantity;
    },
    changeGuestVariant(state, { payload }) {
      const item = state.items.find((i) => `${i.productId}:${i.variantId}` === payload.key);
      if (!item) return;
      const dup = state.items.find((i) => i !== item && i.productId === item.productId && i.variantId === payload.variantId);
      if (dup) {
        dup.quantity = Math.min(99, dup.quantity + item.quantity);
        state.items = state.items.filter((i) => i !== item);
      } else item.variantId = payload.variantId;
    },
    removeGuestItem(state, { payload }) {
      state.items = state.items.filter((i) => `${i.productId}:${i.variantId}` !== payload);
    },
    setGuestShipping(state, { payload }) {
      state.shippingMethod = payload;
    },
    clearGuestCart(state) {
      state.items = [];
    },
  },
});

// ── Guest wishlist & recently viewed ─────────────────────────

const guestListsSlice = createSlice({
  name: 'guestLists',
  initialState: { wishlist: read('wt-guest-wishlist', []), recent: read('wt-recent', []) },
  reducers: {
    toggleGuestWishlist(state, { payload }) {
      state.wishlist = state.wishlist.includes(payload) ? state.wishlist.filter((id) => id !== payload) : [payload, ...state.wishlist];
    },
    clearGuestWishlist(state) {
      state.wishlist = [];
    },
    pushRecent(state, { payload }) {
      state.recent = [payload, ...state.recent.filter((id) => id !== payload)].slice(0, 12);
    },
  },
});

// ── UI ───────────────────────────────────────────────────────

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    cartOpen: false,
    searchOpen: false,
    mobileNavOpen: false,
    quickView: null, // product slug
    currency: read('wt-currency', 'INR'),
    theme: typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
    contrast: typeof document !== 'undefined' && document.documentElement.dataset.contrast === 'high' ? 'high' : 'normal',
  },
  reducers: {
    setCartOpen: (s, { payload }) => void (s.cartOpen = payload),
    setSearchOpen: (s, { payload }) => void (s.searchOpen = payload),
    setMobileNavOpen: (s, { payload }) => void (s.mobileNavOpen = payload),
    openQuickView: (s, { payload }) => void (s.quickView = payload),
    closeQuickView: (s) => void (s.quickView = null),
    setCurrency: (s, { payload }) => void (s.currency = payload),
    toggleTheme(s) {
      s.theme = s.theme === 'dark' ? 'light' : 'dark';
    },
    toggleContrast(s) {
      s.contrast = s.contrast === 'high' ? 'normal' : 'high';
    },
  },
});

export const { setUser, clearUser } = authSlice.actions;
export const { addGuestItem, setGuestQty, changeGuestVariant, removeGuestItem, setGuestShipping, clearGuestCart } = guestCartSlice.actions;
export const { toggleGuestWishlist, clearGuestWishlist, pushRecent } = guestListsSlice.actions;
export const {
  setCartOpen,
  setSearchOpen,
  setMobileNavOpen,
  openQuickView,
  closeQuickView,
  setCurrency,
  toggleTheme,
  toggleContrast,
} = uiSlice.actions;

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    guestCart: guestCartSlice.reducer,
    guestLists: guestListsSlice.reducer,
    ui: uiSlice.reducer,
  },
});

// Persist the bits that should survive reloads, and reflect theme on <html>.
store.subscribe(() => {
  const s = store.getState();
  write('wt-guest-cart', s.guestCart.items);
  write('wt-guest-wishlist', s.guestLists.wishlist);
  write('wt-recent', s.guestLists.recent);
  write('wt-currency', s.ui.currency);
  try {
    localStorage.setItem('wt-theme', s.ui.theme);
    localStorage.setItem('wt-contrast', s.ui.contrast);
  } catch {
    /* ignore */
  }
  const root = document.documentElement;
  if (s.ui.theme === 'dark') root.dataset.theme = 'dark';
  else delete root.dataset.theme;
  if (s.ui.contrast === 'high') root.dataset.contrast = 'high';
  else delete root.dataset.contrast;
});
