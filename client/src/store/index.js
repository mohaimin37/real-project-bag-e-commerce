import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../lib/api';
import { applyTheme, applyVision, STORAGE } from '../theme/engine';
import { ALL_THEME_IDS, CUSTOM_DEFAULTS, DEFAULT_MODE, DEFAULT_THEME, enabledThemeIds, VISION_DEFAULTS } from '../theme/themes';

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

// ── Auth (persisted across browser/page close until explicit logout) ──

const savedUser = read('wt-user', null);
const savedToken = typeof localStorage !== 'undefined' ? localStorage.getItem('wt-token') : null;

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const res = await api.me();
    return res.user;
  } catch (err) {
    return rejectWithValue(err);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: savedUser,
    token: savedToken,
    status: savedUser ? 'ready' : 'loading',
  },
  reducers: {
    setUser(state, { payload }) {
      const user = payload?.user !== undefined ? payload.user : payload;
      const token = payload?.token || state.token;
      state.user = user;
      state.token = token;
      state.status = 'ready';
      if (user) write('wt-user', user);
      if (payload?.token) {
        try {
          localStorage.setItem('wt-token', payload.token);
        } catch {}
      }
    },
    clearUser(state) {
      state.user = null;
      state.token = null;
      state.status = 'ready';
      try {
        localStorage.removeItem('wt-user');
        localStorage.removeItem('wt-token');
      } catch {}
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchMe.fulfilled, (s, { payload }) => {
      s.user = payload;
      s.status = 'ready';
      if (payload) {
        write('wt-user', payload);
      } else {
        s.token = null;
        try {
          localStorage.removeItem('wt-user');
          localStorage.removeItem('wt-token');
        } catch {}
      }
    });
    b.addCase(fetchMe.rejected, (s, action) => {
      if (action.payload?.status === 401) {
        s.user = null;
        s.token = null;
        try {
          localStorage.removeItem('wt-user');
          localStorage.removeItem('wt-token');
        } catch {}
      }
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

const readRaw = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const DARK_QUERY = '(prefers-color-scheme: dark)';
const systemMode = () => (typeof matchMedia !== 'undefined' && matchMedia(DARK_QUERY).matches ? 'dark' : 'light');
const SITE_APPEARANCE_FALLBACK ={ defaultTheme: DEFAULT_THEME, defaultMode: DEFAULT_MODE, enabledThemes: ALL_THEME_IDS };

/** The theme actually shown: the shopper's pick if the store allows it, else the store default. */
export function effectiveTheme(ui) {
  const enabled = enabledThemeIds(ui.site);
  if (ui.palette && enabled.includes(ui.palette)) return ui.palette;
  return enabled.includes(ui.site.defaultTheme) ? ui.site.defaultTheme : DEFAULT_THEME;
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    cartOpen: false,
    searchOpen: false,
    searchVoice: false,
    mobileNavOpen: false,
    shopModalOpen: false,
    quickView: null, // product slug
    adminEdit: null, // product id being edited in place on the storefront (admins only)
    currency: read('wt-currency', 'INR'),
    // Appearance mode ('light' | 'dark'). public/theme.js has already applied it before first paint.
    theme: typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
    modeChosen: Boolean(readRaw(STORAGE.mode)), // false = follow the store's default appearance
    followSystem: readRaw(STORAGE.mode) === 'system', // true = track the device's light/dark setting
    contrast: typeof document !== 'undefined' && document.documentElement.dataset.contrast === 'high' ? 'high' : 'normal',
    // Colour theme picked by the shopper (null = store default). Independent of light/dark.
    palette: readRaw(STORAGE.theme),
    customColors: { ...CUSTOM_DEFAULTS, ...read(STORAGE.custom, {}) },
    site: { ...SITE_APPEARANCE_FALLBACK, ...read(STORAGE.site, {}) },
    // Text size, readable font, link underlines, reduced motion (public/theme.js applies them before first paint).
    vision: { ...VISION_DEFAULTS, ...read(STORAGE.vision, {}) },
    themeOpen: false,
  },
  reducers: {
    setCartOpen: (s, { payload }) => void (s.cartOpen = payload),
    setSearchOpen: (s, { payload }) => {
      if (typeof payload === 'object' && payload !== null) {
        s.searchOpen = Boolean(payload.open);
        s.searchVoice = Boolean(payload.voice);
      } else {
        s.searchOpen = Boolean(payload);
        if (!payload) s.searchVoice = false;
      }
    },
    setSearchVoice: (s, { payload }) => void (s.searchVoice = Boolean(payload)),
    setMobileNavOpen: (s, { payload }) => void (s.mobileNavOpen = payload),
    setShopModalOpen: (s, { payload }) => void (s.shopModalOpen = Boolean(payload)),
    openQuickView: (s, { payload }) => void (s.quickView = payload),
    closeQuickView: (s) => void (s.quickView = null),
    setAdminEdit: (s, { payload }) => void (s.adminEdit = payload),
    setCurrency: (s, { payload }) => void (s.currency = payload),
    toggleTheme(s) {
      s.theme = s.theme === 'dark' ? 'light' : 'dark';
      s.modeChosen = true;
      s.followSystem = false;
    },
    /** 'light' | 'dark' | 'system' */
    setMode(s, { payload }) {
      s.followSystem = payload === 'system';
      s.theme = s.followSystem ? systemMode() : payload === 'dark' ? 'dark' : 'light';
      s.modeChosen = true;
    },
    /** The device switched light/dark; only applies while following the system. */
    systemModeChanged(s, { payload }) {
      if (s.followSystem) s.theme = payload;
    },
    setPalette: (s, { payload }) => void (s.palette = payload),
    setCustomColors(s, { payload }) {
      s.customColors = { ...CUSTOM_DEFAULTS, ...payload };
    },
    resetCustomColors(s) {
      s.customColors = { ...CUSTOM_DEFAULTS };
    },
    setThemeOpen: (s, { payload }) => void (s.themeOpen = payload),
    /** Forget the shopper's picks and follow the store defaults again (custom colours are kept). */
    resetAppearance(s) {
      s.palette = null;
      s.modeChosen = false;
      s.followSystem = false;
      s.theme = s.site.defaultMode === 'light' ? 'light' : 'dark';
    },
    /** Store defaults from Admin → Settings → Appearance (via the public config). */
    setSiteAppearance(s, { payload }) {
      s.site = { ...SITE_APPEARANCE_FALLBACK, ...payload };
      if (!s.modeChosen) s.theme = s.site.defaultMode === 'light' ? 'light' : 'dark';
    },
    toggleContrast(s) {
      s.contrast = s.contrast === 'high' ? 'normal' : 'high';
    },
    setVision(s, { payload }) {
      s.vision = { ...s.vision, ...payload };
    },
    resetVision(s) {
      s.vision = { ...VISION_DEFAULTS };
      s.contrast = 'normal';
    },
  },
});

export const { setUser, clearUser } = authSlice.actions;
export const { addGuestItem, setGuestQty, changeGuestVariant, removeGuestItem, setGuestShipping, clearGuestCart } = guestCartSlice.actions;
export const { toggleGuestWishlist, clearGuestWishlist, pushRecent } = guestListsSlice.actions;
export const {
  setCartOpen,
  setSearchOpen,
  setSearchVoice,
  setMobileNavOpen,
  setShopModalOpen,
  openQuickView,
  closeQuickView,
  setAdminEdit,
  setCurrency,
  toggleTheme,
  toggleContrast,
  setVision,
  resetVision,
  setMode,
  systemModeChanged,
  setPalette,
  setCustomColors,
  resetCustomColors,
  setThemeOpen,
  setSiteAppearance,
  resetAppearance,
} = uiSlice.actions;

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    guestCart: guestCartSlice.reducer,
    guestLists: guestListsSlice.reducer,
    ui: uiSlice.reducer,
  },
});

// Persist the bits that should survive reloads, and reflect appearance + theme on <html>.
let appliedTheme = null;
const applyCurrentTheme = (animate) => {
  const { ui } = store.getState();
  const themeId = effectiveTheme(ui);
  const key = JSON.stringify([themeId, ui.theme, themeId === 'custom' ? ui.customColors : null]);
  if (key === appliedTheme) return;
  appliedTheme = key;
  applyTheme({ themeId, mode: ui.theme, custom: ui.customColors, animate });
};
applyCurrentTheme(false);
let appliedVision = store.getState().ui.vision;
applyVision(appliedVision);
if (typeof matchMedia !== 'undefined') {
  matchMedia(DARK_QUERY).addEventListener?.('change', (e) => store.dispatch(systemModeChanged(e.matches ? 'dark' : 'light')));
}

store.subscribe(() => {
  const s = store.getState();
  write('wt-guest-cart', s.guestCart.items);
  write('wt-guest-wishlist', s.guestLists.wishlist);
  write('wt-recent', s.guestLists.recent);
  write('wt-currency', s.ui.currency);
  write(STORAGE.custom, s.ui.customColors);
  write(STORAGE.site, s.ui.site);
  write(STORAGE.vision, s.ui.vision);
  try {
    // Mode and theme are saved only once the shopper picks them, so store defaults still apply until then.
    if (s.ui.modeChosen) localStorage.setItem(STORAGE.mode, s.ui.followSystem ? 'system' : s.ui.theme);
    else localStorage.removeItem(STORAGE.mode);
    if (s.ui.palette) localStorage.setItem(STORAGE.theme, s.ui.palette);
    else localStorage.removeItem(STORAGE.theme);
    localStorage.setItem('wt-contrast', s.ui.contrast);
  } catch {
    /* ignore */
  }
  const root = document.documentElement;
  if (s.ui.contrast === 'high') root.dataset.contrast = 'high';
  else delete root.dataset.contrast;
  if (s.ui.vision !== appliedVision) {
    appliedVision = s.ui.vision;
    applyVision(appliedVision);
  }
  applyCurrentTheme(true);
});
