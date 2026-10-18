import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { setSearchOpen, setSearchVoice } from '../../store';
import { useMoney } from '../../hooks/useStore';
import { cn } from '../../lib/format';
import { Icon, Img, Modal, Spinner } from '../ui';

const STORAGE_KEY = 'wt_recent_searches_v2';

const TRENDING_SEARCHES = [
  { text: 'Laptop Backpacks', icon: 'backpack', badge: 'HOT', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
  { text: 'Cabin Trolley 45L', icon: 'luggage', badge: 'TRAVEL', color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' },
  { text: 'Leather Briefcase', icon: 'work', badge: 'OFFICE', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
  { text: 'Waterproof Duffle', icon: 'water_drop', badge: 'BESTSELLER', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  { text: 'RFID Card Wallet', icon: 'wallet', badge: 'MUST HAVE', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  { text: 'Luxury Chic Tote', icon: 'shopping_bag', badge: 'PREMIUM', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
  { text: 'Current Offers', icon: 'sell', badge: 'SALE', color: 'text-rose-500 bg-rose-500/15 border-rose-500/30', to: '/offers' },
];

const VISUAL_CATEGORIES = [
  { name: 'Backpacks', desc: 'Tech & Daily Commute', icon: 'backpack', to: '/shop/backpacks', color: 'from-indigo-600/20 to-violet-600/10', count: '48+ styles' },
  { name: 'Briefcases', desc: 'Work & Laptop Folios', icon: 'work', to: '/shop/briefcases', color: 'from-rose-600/20 to-orange-600/10', count: '24+ styles' },
  { name: 'Travel Luggage', desc: 'Cabin Duffles & Rollers', icon: 'luggage', to: '/shop/travel-utility', color: 'from-cyan-600/20 to-blue-600/10', count: '32+ styles' },
  { name: 'Handbags & Totes', desc: 'Chic Everyday Carry', icon: 'shopping_bag', to: '/shop/handbags-and-totes', color: 'from-pink-600/20 to-rose-600/10', count: '36+ styles' },
  { name: 'Wallets & Card', desc: 'Slim RFID Organizers', icon: 'wallet', to: '/shop/wallets', color: 'from-emerald-600/20 to-teal-600/10', count: '18+ styles' },
  { name: 'Accessories', desc: 'Straps, Belts & Pouches', icon: 'watch', to: '/shop/accessories', color: 'from-purple-600/20 to-indigo-600/10', count: '28+ styles' },
];

const BUDGET_WIDGETS = [
  { label: 'Under ₹1,500', subtitle: 'Pocket-Friendly', to: '/shop?maxPrice=1500', icon: 'savings', tag: 'Steals' },
  { label: '₹1,500 – ₹2,999', subtitle: 'Most Popular', to: '/shop?minPrice=1500&maxPrice=2999', icon: 'bolt', tag: 'Bestseller' },
  { label: '₹3,000 – ₹4,999', subtitle: 'Executive Grade', to: '/shop?minPrice=3000&maxPrice=4999', icon: 'verified', tag: 'Premium' },
  { label: '₹5,000 & Above', subtitle: 'Full-Grain Luxury', to: '/shop?minPrice=5000', icon: 'diamond', tag: 'Heritage' },
];

const STYLE_LENS = [
  { label: '100% Waterproof', icon: 'water_drop', query: 'waterproof' },
  { label: '16" Laptop Sleeve', icon: 'laptop_mac', query: 'laptop' },
  { label: 'Cabin Size Compliant', icon: 'flight_takeoff', query: 'cabin' },
  { label: 'Anti-Theft TSA Locks', icon: 'lock', query: 'lock' },
  { label: 'Ultra-Lightweight', icon: 'air', query: 'lightweight' },
  { label: 'Full-Grain Leather', icon: 'texture', query: 'leather' },
  { label: '⭐ 4.5+ Rated Customer Faves', icon: 'star', to: '/shop?rating=4.5' },
];

function getStoredRecents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return ['Laptop Backpack', 'Waterproof Duffle', 'Leather Wallet'];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : ['Laptop Backpack', 'Waterproof Duffle', 'Leather Wallet'];
  } catch {
    return ['Laptop Backpack', 'Waterproof Duffle', 'Leather Wallet'];
  }
}

function persistRecent(term) {
  if (!term || term.trim().length < 2) return;
  try {
    const clean = term.trim();
    const prev = getStoredRecents();
    const next = [clean, ...prev.filter((i) => i.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

function removeStoredRecent(term) {
  try {
    const prev = getStoredRecents();
    const next = prev.filter((i) => i.toLowerCase() !== term.toLowerCase());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

function clearStoredRecents() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  return [];
}

function useDebounced(value, ms = 220) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function SearchModal() {
  const open = useSelector((s) => s.ui.searchOpen);
  const searchVoice = useSelector((s) => s.ui.searchVoice);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const money = useMoney();

  const [q, setQ] = useState('');
  const [active, setActive] = useState(-1);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'products' | 'categories' | 'under2500' | 'topRated'
  const [recentSearches, setRecentSearches] = useState(getStoredRecents);

  // Voice Search Web Speech API
  const [isListening, setIsListening] = useState(false);
  const [voiceInterim, setVoiceInterim] = useState('');
  const recognitionRef = useRef(null);

  const term = useDebounced(q.trim());

  const { data, isFetching } = useQuery({
    queryKey: ['suggest', term],
    queryFn: () => api.suggest(term),
    enabled: open && term.length >= 2,
  });

  const close = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    dispatch(setSearchOpen(false));
    dispatch(setSearchVoice(false));
  }, [dispatch]);

  // Navigate & persist search
  const go = useCallback(
    (to, queryToSave) => {
      if (queryToSave) {
        persistRecent(queryToSave);
        setRecentSearches(getStoredRecents());
      }
      close();
      navigate(to);
    },
    [close, navigate]
  );

  const handleSearchSubmit = useCallback(
    (searchTerm) => {
      const clean = (searchTerm || q).trim();
      if (!clean) return;
      persistRecent(clean);
      setRecentSearches(getStoredRecents());
      go(`/shop?q=${encodeURIComponent(clean)}`, clean);
    },
    [q, go]
  );

  // Voice Recognition Handler
  const startVoiceSearch = useCallback(() => {
    const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechClass) {
      toast.error('Voice search is not supported by your browser.', { id: 'voice-err' });
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const rec = new SpeechClass();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-IN';

      rec.onstart = () => {
        setIsListening(true);
        setVoiceInterim('');
      };

      rec.onresult = (e) => {
        let interimStr = '';
        let finalStr = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          const transcript = e.results[i][0]?.transcript || '';
          if (e.results[i].isFinal) {
            finalStr += transcript;
          } else {
            interimStr += transcript;
          }
        }

        if (finalStr.trim()) {
          const spoken = finalStr.trim();
          setQ(spoken);
          setVoiceInterim(spoken);
          setIsListening(false);
          toast.success(`Voice heard: "${spoken}"`, { icon: '🎙️', duration: 2500 });
          handleSearchSubmit(spoken);
        } else if (interimStr) {
          setVoiceInterim(interimStr);
        }
      };

      rec.onerror = (e) => {
        setIsListening(false);
        if (e.error === 'not-allowed') {
          toast.error('Microphone access was blocked. Please enable it in browser settings.', { id: 'voice-mic' });
        } else if (e.error !== 'no-speech') {
          console.warn('Voice recognition error:', e.error);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      setIsListening(false);
      console.warn('SpeechRecognition failed:', err);
    }
  }, [handleSearchSubmit]);

  const stopVoiceSearch = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    setVoiceInterim('');
  }, []);

  // Auto-start voice search if requested from external widget
  useEffect(() => {
    if (open && searchVoice) {
      const timer = setTimeout(() => {
        startVoiceSearch();
        dispatch(setSearchVoice(false));
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [open, searchVoice, startVoiceSearch, dispatch]);

  useEffect(() => {
    if (!open) {
      setQ('');
      setActive(-1);
      setActiveTab('all');
      stopVoiceSearch();
    } else {
      setRecentSearches(getStoredRecents());
    }
  }, [open, stopVoiceSearch]);

  // Lock body scroll on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Handle Recent Searches Management
  const handleDeleteRecent = (item, e) => {
    e.stopPropagation();
    const updated = removeStoredRecent(item);
    setRecentSearches(updated);
  };

  const handleClearAllRecents = () => {
    clearStoredRecents();
    setRecentSearches([]);
    toast.success('Recent searches cleared', { duration: 1800 });
  };

  const products = data?.products || [];
  const categories = data?.categories || [];

  // Filtered lists for tabs
  const under2500Products = useMemo(
    () => products.filter((p) => (p.finalPrice ?? p.price) <= 2500),
    [products]
  );
  const topRatedProducts = useMemo(
    () => products.filter((p) => (p.ratingAverage || 0) >= 4.5),
    [products]
  );

  // Flattened results based on active tab
  const displayResults = useMemo(() => {
    if (activeTab === 'categories') {
      return categories.map((c) => ({ type: 'c', item: c, to: `/shop/${c.slug}` }));
    }
    if (activeTab === 'under2500') {
      return under2500Products.map((p) => ({ type: 'p', item: p, to: `/product/${p.slug}` }));
    }
    if (activeTab === 'topRated') {
      return topRatedProducts.map((p) => ({ type: 'p', item: p, to: `/product/${p.slug}` }));
    }
    if (activeTab === 'products') {
      return products.map((p) => ({ type: 'p', item: p, to: `/product/${p.slug}` }));
    }
    // 'all'
    return [
      ...products.map((p) => ({ type: 'p', item: p, to: `/product/${p.slug}` })),
      ...categories.map((c) => ({ type: 'c', item: c, to: `/shop/${c.slug}` })),
    ];
  }, [activeTab, products, categories, under2500Products, topRatedProducts]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(displayResults.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && displayResults[active]) {
        go(displayResults[active].to, q.trim());
      } else if (q.trim()) {
        handleSearchSubmit(q.trim());
      }
    }
  };

  if (!open) return null;

  return (
    <>
      {/* ── MOBILE FULL-SCREEN SEARCH APP EXPERIENCE (< md) ── */}
      <div className="md:hidden fixed inset-0 z-[100] bg-surface flex flex-col w-full max-w-full h-[100dvh] overflow-x-hidden animate-fade-in text-on-surface">
        {/* Mobile Top App Bar */}
        <div className="px-3 py-2.5 bg-surface-container-lowest border-b border-outline-variant/30 flex items-center gap-2 shadow-xs shrink-0">
          <button
            type="button"
            onClick={close}
            aria-label="Back"
            className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface active:scale-90 transition-transform shrink-0"
          >
            <Icon name="arrow_back" className="text-[20px]" />
          </button>

          <div className="flex-1 relative flex items-center">
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(-1);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search for Bags, Backpacks, Luggage..."
              className="w-full h-10 pl-3 pr-16 rounded-xl bg-surface-container-low border border-outline-variant/40 text-[13px] text-on-surface focus:outline-none focus:border-secondary transition-colors"
              aria-label="Search"
            />
            <div className="absolute right-2 flex items-center gap-1">
              {q.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center text-outline active:scale-90"
                  aria-label="Clear query"
                >
                  <Icon name="close" className="text-[14px]" />
                </button>
              ) : null}

              {/* Voice Search Button */}
              <button
                type="button"
                onClick={isListening ? stopVoiceSearch : startVoiceSearch}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                    : 'text-secondary hover:bg-secondary/10'
                )}
                aria-label="Voice Search"
                title="Search with Voice"
              >
                <Icon name={isListening ? 'mic' : 'mic'} className="text-[19px]" />
              </button>
            </div>
          </div>

          {q.trim() && (
            <button
              type="button"
              onClick={() => handleSearchSubmit(q.trim())}
              className="px-3 py-2 rounded-xl bg-secondary text-on-secondary text-[12px] font-bold shrink-0 active:scale-95 shadow-xs"
            >
              Search
            </button>
          )}
        </div>

        {/* Voice Search Pulse Banner (When Active) */}
        {isListening && (
          <div className="bg-gradient-to-r from-rose-500/15 via-secondary/15 to-rose-500/15 border-b border-secondary/30 px-4 py-3 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              {/* Sound Wave Bars Widget */}
              <div className="flex items-center gap-1 h-6">
                <span className="w-1 h-3 rounded-full bg-secondary animate-pulse" />
                <span className="w-1 h-5 rounded-full bg-rose-400 animate-pulse delay-75" />
                <span className="w-1 h-6 rounded-full bg-rose-500 animate-pulse delay-150" />
                <span className="w-1 h-4 rounded-full bg-secondary animate-pulse delay-100" />
                <span className="w-1 h-2 rounded-full bg-rose-400 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] font-bold text-on-surface">Listening now...</span>
                <span className="text-[10px] text-outline italic">
                  {voiceInterim ? `"${voiceInterim}"` : 'Say "Leather Laptop Bag" or "Cabin Luggage"'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={stopVoiceSearch}
              className="px-2.5 py-1 rounded-lg bg-surface-container-high text-[11px] font-semibold text-outline active:scale-95"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Mobile Search Body */}
        <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-none flex flex-col gap-4">
          {term.length < 2 ? (
            <>
              {/* WIDGET 1: Recent Searches History */}
              {recentSearches.length > 0 && (
                <div className="p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-outline flex items-center gap-1.5">
                      <Icon name="history" className="text-[15px] text-secondary" /> Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={handleClearAllRecents}
                      className="text-[10.5px] font-bold text-rose-500 hover:underline flex items-center gap-0.5"
                    >
                      <Icon name="delete_outline" className="text-[14px]" /> Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recentSearches.map((item) => (
                      <div
                        key={item}
                        onClick={() => {
                          setQ(item);
                          handleSearchSubmit(item);
                        }}
                        role="button"
                        tabIndex={0}
                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl bg-surface-container-low border border-outline-variant/30 text-[12px] text-on-surface active:bg-surface-container cursor-pointer transition-colors shadow-xs"
                      >
                        <Icon name="schedule" className="text-[13px] text-outline" />
                        <span className="truncate max-w-[130px] font-medium">{item}</span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteRecent(item, e)}
                          className="w-4 h-4 rounded-full hover:bg-surface-container-high flex items-center justify-center text-outline hover:text-on-surface"
                          aria-label={`Remove ${item}`}
                        >
                          <Icon name="close" className="text-[11px]" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* WIDGET 2: Trending & Hot Searches */}
              <div className="p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-outline flex items-center gap-1.5">
                    <Icon name="local_fire_department" className="text-[16px] text-rose-500" /> Trending Now
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[9px] font-extrabold border border-rose-500/20">
                    🔥 +140% Hits
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TRENDING_SEARCHES.map((t) => (
                    <button
                      key={t.text}
                      type="button"
                      onClick={() => (t.to ? go(t.to, t.text) : handleSearchSubmit(t.text))}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-[12px] font-semibold text-on-surface active:scale-95 transition-all shadow-xs"
                    >
                      <Icon name={t.icon} className="text-[14px] text-secondary" />
                      <span>{t.text}</span>
                      {t.badge && (
                        <span className={cn('text-[9px] font-black px-1.5 py-0.2 rounded border', t.color)}>
                          {t.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* WIDGET 3: Shop by Budget */}
              <div className="p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
                <span className="text-[11px] font-black uppercase tracking-wider text-outline flex items-center gap-1.5 mb-2.5">
                  <Icon name="payments" className="text-[15px] text-emerald-500" /> Shop by Budget
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {BUDGET_WIDGETS.map((b) => (
                    <button
                      key={b.label}
                      type="button"
                      onClick={() => go(b.to, b.label)}
                      className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-left flex items-center gap-2 active:bg-surface-container transition-all hover:border-secondary/40 shadow-xs"
                    >
                      <span className="w-8 h-8 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                        <Icon name={b.icon} className="text-[18px]" />
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-bold text-on-surface truncate">{b.label}</span>
                        <span className="text-[10px] text-outline truncate">{b.subtitle}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* WIDGET 4: Visual Category Shortcuts */}
              <div className="p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
                <span className="text-[11px] font-black uppercase tracking-wider text-outline flex items-center gap-1.5 mb-2.5">
                  <Icon name="category" className="text-[15px] text-secondary" /> Department Shortcuts
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {VISUAL_CATEGORIES.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => go(c.to, c.name)}
                      className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-left flex items-center gap-2.5 active:scale-98 transition-all hover:border-secondary/40 shadow-xs"
                    >
                      <span className="w-9 h-9 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                        <Icon name={c.icon} className="text-[20px]" />
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-bold text-on-surface truncate">{c.name}</span>
                        <span className="text-[9.5px] text-outline truncate">{c.count}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* WIDGET 5: Style & Feature Lens */}
              <div className="p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
                <span className="text-[11px] font-black uppercase tracking-wider text-outline flex items-center gap-1.5 mb-2">
                  <Icon name="auto_awesome" className="text-[15px] text-rose-500" /> Feature Lens
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {STYLE_LENS.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => (s.to ? go(s.to, s.label) : handleSearchSubmit(s.query))}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-[11.5px] font-medium text-on-surface active:bg-surface-container transition-colors shadow-xs"
                    >
                      <Icon name={s.icon} className="text-[14px] text-secondary" />
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : isFetching ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-outline">
              <Spinner className="text-secondary" />
              <span className="text-[12.5px] font-medium">Searching WILDTANE collections...</span>
            </div>
          ) : displayResults.length === 0 ? (
            <div className="text-center py-14 flex flex-col items-center gap-3">
              <span className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center text-outline">
                <Icon name="search_off" className="text-[28px]" />
              </span>
              <p className="text-[15px] font-bold text-on-surface">No matches for “{term}”</p>
              <p className="text-[12px] text-outline max-w-xs">
                Try searching for 'Backpack', 'Luggage', 'Leather', or 'Waterproof'.
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => go('/shop', 'All Bags')}
                  className="px-4 py-2 rounded-xl bg-secondary text-on-secondary text-[12px] font-bold shadow-xs active:scale-95"
                >
                  Browse All Bags
                </button>
                <button
                  type="button"
                  onClick={() => setQ('')}
                  className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-[12px] font-semibold active:scale-95"
                >
                  Clear Search
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Scope & Filter Tabs Widget */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all border',
                    activeTab === 'all'
                      ? 'bg-secondary text-on-secondary border-secondary shadow-xs'
                      : 'bg-surface-container-low text-outline border-outline-variant/30 hover:text-on-surface'
                  )}
                >
                  All ({products.length + categories.length})
                </button>
                {products.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('products')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all border',
                      activeTab === 'products'
                        ? 'bg-secondary text-on-secondary border-secondary shadow-xs'
                        : 'bg-surface-container-low text-outline border-outline-variant/30 hover:text-on-surface'
                    )}
                  >
                    Products ({products.length})
                  </button>
                )}
                {categories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('categories')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all border',
                      activeTab === 'categories'
                        ? 'bg-secondary text-on-secondary border-secondary shadow-xs'
                        : 'bg-surface-container-low text-outline border-outline-variant/30 hover:text-on-surface'
                    )}
                  >
                    Categories ({categories.length})
                  </button>
                )}
                {under2500Products.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('under2500')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all border',
                      activeTab === 'under2500'
                        ? 'bg-secondary text-on-secondary border-secondary shadow-xs'
                        : 'bg-surface-container-low text-outline border-outline-variant/30 hover:text-on-surface'
                    )}
                  >
                    Under ₹2,500 ({under2500Products.length})
                  </button>
                )}
                {topRatedProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('topRated')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all border',
                      activeTab === 'topRated'
                        ? 'bg-secondary text-on-secondary border-secondary shadow-xs'
                        : 'bg-surface-container-low text-outline border-outline-variant/30 hover:text-on-surface'
                    )}
                  >
                    ⭐ 4.5+ Rated ({topRatedProducts.length})
                  </button>
                )}
              </div>

              {/* Result Items List */}
              <div className="flex flex-col divide-y divide-outline-variant/20 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-1 shadow-xs">
                {displayResults.map((r, i) =>
                  r.type === 'p' ? (
                    <button
                      key={r.item._id}
                      type="button"
                      onClick={() => go(r.to, q.trim())}
                      className={cn(
                        'flex items-center gap-3 p-2 text-left rounded-xl active:bg-surface-container-low transition-colors',
                        active === i && 'bg-surface-container-low'
                      )}
                    >
                      <Img
                        src={r.item.images?.[0]?.url}
                        alt={r.item.name}
                        w={120}
                        className="w-13 h-13 rounded-xl object-cover shrink-0 bg-surface-container-low border border-outline-variant/30"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[12.5px] font-bold text-on-surface line-clamp-1 block">
                          {r.item.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-emerald-700 text-white text-[9px] font-black">
                            {(r.item.ratingAverage || 4.6).toFixed(1)} <Icon name="star" fill className="text-[8px]" />
                          </span>
                          <span className="text-[10px] text-outline font-medium truncate">
                            {r.item.category?.name || 'Bags'}
                          </span>
                          {r.item.isBestseller && (
                            <span className="text-[8.5px] font-black text-rose-500 bg-rose-500/10 px-1 rounded">
                              HOT
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[13px] font-black text-on-surface block">
                          {money(r.item.finalPrice ?? r.item.price)}
                        </span>
                        {r.item.price > (r.item.finalPrice ?? r.item.price) && (
                          <span className="text-[9px] text-rose-500 font-bold block">
                            {Math.round(((r.item.price - (r.item.finalPrice ?? r.item.price)) / r.item.price) * 100)}% OFF
                          </span>
                        )}
                        <span className="text-[8.5px] font-bold text-emerald-600 block">
                          Free Delivery
                        </span>
                      </div>
                      <Icon name="chevron_right" className="text-[16px] text-outline shrink-0" />
                    </button>
                  ) : (
                    <button
                      key={r.item._id}
                      type="button"
                      onClick={() => go(r.to, q.trim())}
                      className={cn(
                        'flex items-center gap-3 p-2.5 text-left rounded-xl active:bg-surface-container-low transition-colors',
                        active === i && 'bg-surface-container-low'
                      )}
                    >
                      <span className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                        <Icon name="category" className="text-[20px]" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-bold text-on-surface block">
                          {r.item.name}
                        </span>
                        <span className="text-[10px] text-outline">Category Shortcut</span>
                      </div>
                      <Icon name="chevron_right" className="text-[16px] text-outline shrink-0" />
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Mobile Search Action Pill */}
        {q.trim() && (
          <div className="p-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] bg-surface-container-lowest border-t border-outline-variant/30 shrink-0">
            <button
              type="button"
              onClick={() => handleSearchSubmit(q.trim())}
              className="w-full h-11 rounded-xl bg-secondary text-on-secondary font-bold text-[13px] flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all"
            >
              See all results for “{q.trim()}” <Icon name="arrow_forward" className="text-[16px]" />
            </button>
          </div>
        )}
      </div>

      {/* ── LAPTOP & DESKTOP VIEW (>= md): MODERN EXPANDED SEARCH MODAL WITH WIDGETS ── */}
      <div className="hidden md:block">
        <Modal open={open} onClose={close} size="xl" hideClose className="sm:mt-[-5vh] overflow-hidden">
          {/* Desktop Search Bar Header */}
          <div className="relative flex items-center gap-3 border-b border-surface-container-high pb-4 pt-1 px-1">
            <span className="w-9 h-9 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
              <Icon name="search" className="text-[20px]" />
            </span>
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(-1);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search Cordura, laptop backpacks, cabin luggage, wallets, duffle..."
              className="flex-1 bg-transparent text-[16px] text-on-surface font-medium focus:outline-none placeholder:text-outline"
              aria-label="Search products"
              role="combobox"
              aria-expanded={displayResults.length > 0}
              aria-controls="search-results-desktop"
              aria-activedescendant={active >= 0 ? `sr-desk-${active}` : undefined}
            />

            {isFetching && <Spinner className="text-secondary shrink-0" />}

            {q.length > 0 && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center text-outline hover:text-on-surface active:scale-90"
                aria-label="Clear query"
              >
                <Icon name="close" className="text-[15px]" />
              </button>
            )}

            {/* Voice Mic Widget Button */}
            <button
              type="button"
              onClick={isListening ? stopVoiceSearch : startVoiceSearch}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-bold transition-all shadow-xs',
                isListening
                  ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                  : 'bg-surface-container-low text-secondary border-outline-variant/40 hover:bg-surface-container-high'
              )}
              title="Voice Search (speak your query)"
            >
              <Icon name="mic" className="text-[17px]" />
              <span>{isListening ? 'Listening...' : 'Voice Search'}</span>
            </button>

            <button
              type="button"
              onClick={close}
              className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors"
            >
              ESC
            </button>
          </div>

          {/* Desktop Voice Listening Pulse Banner */}
          {isListening && (
            <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-rose-500/15 via-secondary/15 to-rose-500/15 border border-secondary/30 flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 h-6">
                  <span className="w-1 h-3 rounded-full bg-secondary animate-pulse" />
                  <span className="w-1 h-5 rounded-full bg-rose-400 animate-pulse delay-75" />
                  <span className="w-1 h-6 rounded-full bg-rose-500 animate-pulse delay-150" />
                  <span className="w-1 h-4 rounded-full bg-secondary animate-pulse delay-100" />
                  <span className="w-1 h-2 rounded-full bg-rose-400 animate-pulse" />
                </div>
                <div>
                  <span className="text-[13px] font-bold text-on-surface">Listening to your voice...</span>
                  <p className="text-[11px] text-outline italic">
                    {voiceInterim ? `"${voiceInterim}"` : 'Speak naturally, e.g. "Waterproof laptop backpack"'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={stopVoiceSearch}
                className="px-3 py-1 rounded-lg bg-surface-container-high text-[11px] font-semibold text-outline hover:text-on-surface"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Desktop Body Container */}
          <div id="search-results-desktop" role="listbox" className="pt-4 min-h-[300px] max-h-[68vh] overflow-y-auto scrollbar-none">
            {term.length < 2 ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pb-2">
                {/* Left Column (5 Cols): Recent History & Trending Keywords & Budget */}
                <div className="md:col-span-5 flex flex-col gap-4">
                  {/* WIDGET 1: Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-surface-container-low/70 border border-outline-variant/30">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[11px] font-black uppercase tracking-wider text-outline flex items-center gap-1.5">
                          <Icon name="history" className="text-[15px] text-secondary" /> Recent Searches
                        </span>
                        <button
                          type="button"
                          onClick={handleClearAllRecents}
                          className="text-[10px] font-bold text-rose-500 hover:underline flex items-center gap-0.5"
                        >
                          <Icon name="delete_outline" className="text-[13px]" /> Clear
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {recentSearches.map((item) => (
                          <div
                            key={item}
                            onClick={() => {
                              setQ(item);
                              handleSearchSubmit(item);
                            }}
                            role="button"
                            tabIndex={0}
                            className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-[12px] text-on-surface hover:border-secondary/50 cursor-pointer transition-colors shadow-xs"
                          >
                            <Icon name="schedule" className="text-[12px] text-outline" />
                            <span className="truncate max-w-[140px] font-medium">{item}</span>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteRecent(item, e)}
                              className="w-4 h-4 rounded-full hover:bg-surface-container-high flex items-center justify-center text-outline hover:text-on-surface"
                              aria-label={`Remove ${item}`}
                            >
                              <Icon name="close" className="text-[11px]" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* WIDGET 2: Trending Searches */}
                  <div className="p-3.5 rounded-2xl bg-surface-container-low/70 border border-outline-variant/30">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-outline flex items-center gap-1.5">
                        <Icon name="local_fire_department" className="text-[16px] text-rose-500" /> Trending Now
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[9px] font-extrabold border border-rose-500/20">
                        🔥 Popular
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {TRENDING_SEARCHES.map((t) => (
                        <button
                          key={t.text}
                          type="button"
                          onClick={() => (t.to ? go(t.to, t.text) : handleSearchSubmit(t.text))}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-[12px] font-semibold text-on-surface hover:border-secondary/60 hover:bg-surface-container transition-all shadow-xs"
                        >
                          <Icon name={t.icon} className="text-[14px] text-secondary" />
                          <span>{t.text}</span>
                          {t.badge && (
                            <span className={cn('text-[9px] font-black px-1.5 py-0.2 rounded border', t.color)}>
                              {t.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* WIDGET 3: Shop by Budget */}
                  <div className="p-3.5 rounded-2xl bg-surface-container-low/70 border border-outline-variant/30">
                    <span className="text-[11px] font-black uppercase tracking-wider text-outline flex items-center gap-1.5 mb-2.5">
                      <Icon name="payments" className="text-[15px] text-emerald-500" /> Shop by Budget
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {BUDGET_WIDGETS.map((b) => (
                        <button
                          key={b.label}
                          type="button"
                          onClick={() => go(b.to, b.label)}
                          className="p-2 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-left flex items-center gap-2 hover:border-secondary transition-all shadow-xs group"
                        >
                          <span className="w-7 h-7 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Icon name={b.icon} className="text-[16px]" />
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[11.5px] font-bold text-on-surface truncate">{b.label}</span>
                            <span className="text-[9.5px] text-outline truncate">{b.subtitle}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column (7 Cols): Visual Categories & Feature Lens */}
                <div className="md:col-span-7 flex flex-col gap-4">
                  {/* WIDGET 4: Visual Department Shortcuts */}
                  <div className="p-3.5 rounded-2xl bg-surface-container-low/70 border border-outline-variant/30">
                    <span className="text-[11px] font-black uppercase tracking-wider text-outline flex items-center gap-1.5 mb-2.5">
                      <Icon name="category" className="text-[15px] text-secondary" /> Visual Department Shortcuts
                    </span>
                    <div className="grid grid-cols-2 gap-2.5">
                      {VISUAL_CATEGORIES.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => go(c.to, c.name)}
                          className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-left flex items-center gap-3 hover:border-secondary transition-all shadow-xs group"
                        >
                          <span className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Icon name={c.icon} className="text-[22px]" />
                          </span>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-[12.5px] font-bold text-on-surface truncate group-hover:text-secondary transition-colors">
                              {c.name}
                            </span>
                            <span className="text-[10px] text-outline truncate">{c.desc}</span>
                            <span className="text-[9.5px] font-semibold text-secondary/80 mt-0.5">{c.count}</span>
                          </div>
                          <Icon name="chevron_right" className="text-[18px] text-outline group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* WIDGET 5: Style & Feature Lens */}
                  <div className="p-3.5 rounded-2xl bg-surface-container-low/70 border border-outline-variant/30">
                    <span className="text-[11px] font-black uppercase tracking-wider text-outline flex items-center gap-1.5 mb-2">
                      <Icon name="auto_awesome" className="text-[15px] text-rose-500" /> Feature & Material Lens
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {STYLE_LENS.map((s) => (
                        <button
                          key={s.label}
                          type="button"
                          onClick={() => (s.to ? go(s.to, s.label) : handleSearchSubmit(s.query))}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-[12px] font-medium text-on-surface hover:border-secondary hover:bg-surface-container transition-all shadow-xs"
                        >
                          <Icon name={s.icon} className="text-[15px] text-secondary" />
                          <span>{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : !isFetching && displayResults.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center gap-3">
                <span className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center text-outline">
                  <Icon name="search_off" className="text-[32px]" />
                </span>
                <p className="text-[18px] font-bold text-on-surface">No matches found for “{term}”</p>
                <p className="text-[13px] text-outline max-w-md">
                  Try searching for a material (e.g., Cordura, Leather), capacity (e.g., 24L, 45L), or category.
                </p>
                <div className="flex gap-3 mt-3">
                  <button
                    type="button"
                    onClick={() => go('/shop', 'All Bags')}
                    className="px-5 py-2.5 rounded-xl bg-secondary text-on-secondary text-[13px] font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
                  >
                    Explore Full Catalog
                  </button>
                  <button
                    type="button"
                    onClick={() => setQ('')}
                    className="px-5 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-[13px] font-semibold hover:bg-surface-container-highest transition-colors"
                  >
                    Reset Query
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Desktop Scope Filter Tabs Widget */}
                <div className="flex items-center justify-between border-b border-surface-container-high pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('all')}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all border',
                        activeTab === 'all'
                          ? 'bg-secondary text-on-secondary border-secondary shadow-xs'
                          : 'bg-surface-container-low text-outline border-outline-variant/30 hover:text-on-surface'
                      )}
                    >
                      All Results ({products.length + categories.length})
                    </button>
                    {products.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('products')}
                        className={cn(
                          'px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all border',
                          activeTab === 'products'
                            ? 'bg-secondary text-on-secondary border-secondary shadow-xs'
                            : 'bg-surface-container-low text-outline border-outline-variant/30 hover:text-on-surface'
                        )}
                      >
                        Products ({products.length})
                      </button>
                    )}
                    {categories.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('categories')}
                        className={cn(
                          'px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all border',
                          activeTab === 'categories'
                            ? 'bg-secondary text-on-secondary border-secondary shadow-xs'
                            : 'bg-surface-container-low text-outline border-outline-variant/30 hover:text-on-surface'
                        )}
                      >
                        Categories ({categories.length})
                      </button>
                    )}
                    {under2500Products.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('under2500')}
                        className={cn(
                          'px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all border',
                          activeTab === 'under2500'
                            ? 'bg-secondary text-on-secondary border-secondary shadow-xs'
                            : 'bg-surface-container-low text-outline border-outline-variant/30 hover:text-on-surface'
                        )}
                      >
                        Under ₹2,500 ({under2500Products.length})
                      </button>
                    )}
                    {topRatedProducts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('topRated')}
                        className={cn(
                          'px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all border',
                          activeTab === 'topRated'
                            ? 'bg-secondary text-on-secondary border-secondary shadow-xs'
                            : 'bg-surface-container-low text-outline border-outline-variant/30 hover:text-on-surface'
                        )}
                      >
                        ⭐ 4.5+ Rated ({topRatedProducts.length})
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-outline font-medium">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface font-sans text-[10px]">Enter</kbd> to see full shop results
                  </span>
                </div>

                {/* Desktop Result Cards Grid / List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {displayResults.map((r, i) =>
                    r.type === 'p' ? (
                      <button
                        key={r.item._id}
                        id={`sr-desk-${i}`}
                        role="option"
                        aria-selected={active === i}
                        type="button"
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(r.to, q.trim())}
                        className={cn(
                          'flex items-center gap-3.5 p-3 rounded-2xl text-left bg-surface-container-low/60 border border-outline-variant/30 hover:border-secondary/60 hover:bg-surface-container transition-all group',
                          active === i && 'bg-surface-container border-secondary'
                        )}
                      >
                        <Img
                          src={r.item.images?.[0]?.url}
                          alt={r.item.name}
                          w={140}
                          className="w-14 h-14 rounded-xl object-cover shrink-0 bg-surface-container border border-outline-variant/30 group-hover:scale-105 transition-transform"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="block text-[13.5px] font-bold text-on-surface truncate group-hover:text-secondary transition-colors">
                            {r.item.name}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-700 text-white text-[9.5px] font-black">
                              {(r.item.ratingAverage || 4.6).toFixed(1)} <Icon name="star" fill className="text-[9px]" />
                            </span>
                            <span className="text-[10.5px] text-outline font-medium truncate">
                              {r.item.category?.name || 'Bags'}
                            </span>
                            {r.item.isBestseller && (
                              <span className="text-[9px] font-black text-rose-500 bg-rose-500/10 px-1 rounded">
                                HOT
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[14px] font-black text-on-surface block">
                            {money(r.item.finalPrice ?? r.item.price)}
                          </span>
                          {r.item.price > (r.item.finalPrice ?? r.item.price) && (
                            <span className="text-[9.5px] text-rose-500 font-bold block">
                              {Math.round(((r.item.price - (r.item.finalPrice ?? r.item.price)) / r.item.price) * 100)}% OFF
                            </span>
                          )}
                          <span className="text-[9px] font-bold text-emerald-600 block">
                            Free Delivery
                          </span>
                        </div>
                      </button>
                    ) : (
                      <button
                        key={r.item._id}
                        id={`sr-desk-${i}`}
                        role="option"
                        aria-selected={active === i}
                        type="button"
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(r.to, q.trim())}
                        className={cn(
                          'flex items-center gap-3.5 p-3 rounded-2xl text-left bg-surface-container-low/60 border border-outline-variant/30 hover:border-secondary/60 hover:bg-surface-container transition-all group',
                          active === i && 'bg-surface-container border-secondary'
                        )}
                      >
                        <span className="w-12 h-12 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Icon name="category" className="text-[24px]" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="block text-[14px] font-bold text-on-surface group-hover:text-secondary transition-colors">
                            {r.item.name}
                          </span>
                          <span className="text-[11px] text-outline">Category Department</span>
                        </div>
                        <span className="text-[11px] font-bold text-secondary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          Explore <Icon name="arrow_forward" className="text-[14px]" />
                        </span>
                      </button>
                    )
                  )}
                </div>

                {/* Bottom Action Footer */}
                {q.trim() && (
                  <div className="mt-3 pt-3 border-t border-surface-container-high flex items-center justify-between">
                    <span className="text-[12px] text-outline">
                      Looking for more? Search across the entire storefront catalog.
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSearchSubmit(q.trim())}
                      className="px-4 py-2 rounded-xl bg-secondary text-on-secondary text-[12.5px] font-bold flex items-center gap-1.5 shadow-md hover:scale-105 active:scale-95 transition-all"
                    >
                      See all results for “{q.trim()}” <Icon name="arrow_forward" className="text-[16px]" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      </div>
    </>
  );
}
