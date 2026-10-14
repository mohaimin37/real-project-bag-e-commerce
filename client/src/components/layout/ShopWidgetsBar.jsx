import { cn } from '../../lib/format';
import { Icon } from '../ui';

const BUDGET_PRESETS = [
  { id: 'all', label: 'All Budgets', min: '', max: '', icon: 'all_inclusive' },
  { id: 'under-1500', label: 'Under ₹1,499', min: '', max: '1499', icon: 'payments' },
  { id: '1500-3500', label: '₹1,500 – ₹3,499', min: '1500', max: '3499', icon: 'backpack' },
  { id: '3500-8000', label: '₹3,500 – ₹7,999', min: '3500', max: '7999', icon: 'business_center' },
  { id: 'over-8000', label: '₹8,000+ Luxury', min: '8000', max: '', icon: 'diamond' },
];

const FAST_FILTER_WIDGETS = [
  { key: 'bestseller', label: 'Bestsellers', icon: 'local_fire_department', activeColor: 'bg-rose-500 text-white border-rose-500' },
  { key: 'newArrival', label: 'New Drops', icon: 'auto_awesome', activeColor: 'bg-rose-500 text-white border-rose-500' },
  { key: 'onSale', label: 'On Sale', icon: 'sell', activeColor: 'bg-rose-600 text-white border-rose-600' },
  { key: 'rating4', label: '4★ & Above', icon: 'star', activeColor: 'bg-pink-500 text-white border-pink-500' },
  { key: 'inStock', label: 'In Stock Only', icon: 'verified', activeColor: 'bg-emerald-600 text-white border-emerald-600' },
];

/**
 * Modern Interactive Widgets Bar for the Shop Page.
 * Gives shoppers 1-click access to:
 * 1. Budget brackets widget
 * 2. Trend & Fast filter radar widget
 * 3. Grid density toggle (Compact vs Spacious showcase)
 */
export default function ShopWidgetsBar({ state, activeCount, onClear, total, viewDensity, onViewDensityChange }) {
  const { get, update } = state;
  const currentMin = get('minPrice');
  const currentMax = get('maxPrice');

  return (
    // Desktop only: on phones the Sort / Filter bar and quick chips above already do this, and the
    // products should start on the first screen.
    <div className="hidden md:block bg-surface-container-lowest/80 backdrop-blur-md rounded-2xl border border-outline-variant/30 p-2.5 md:p-3.5 shadow-xs space-y-2.5">
      {/* ── TOP ROW: Widget Header & View Controls ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
            <Icon name="tune" className="text-[15px]" />
          </span>
          <span className="text-[12.5px] font-bold text-on-surface">
            Fast Shopping Widgets
          </span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-secondary text-on-secondary shadow-2xs">
              {activeCount} Active
            </span>
          )}
          {total != null && (
            <span className="text-[11px] text-outline hidden sm:inline">
              ({total} bag{total === 1 ? '' : 's'})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Quick Clear All Button */}
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] font-bold text-secondary hover:underline px-2 py-1 rounded-lg hover:bg-surface-container cursor-pointer transition-colors"
            >
              Clear filters
            </button>
          )}

          {/* Grid View Density Toggle Widget */}
          {onViewDensityChange && (
            <div className="flex items-center bg-surface-container-low rounded-xl p-0.5 border border-outline-variant/30">
              <button
                type="button"
                onClick={() => onViewDensityChange('compact')}
                title="Compact Grid"
                aria-label="Compact Grid"
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                  viewDensity === 'compact'
                    ? 'bg-surface-container-lowest text-on-surface shadow-2xs font-bold'
                    : 'text-outline hover:text-on-surface'
                )}
              >
                <Icon name="grid_view" className="text-[16px]" />
              </button>
              <button
                type="button"
                onClick={() => onViewDensityChange('comfort')}
                title="Spacious Showcase"
                aria-label="Spacious Showcase"
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                  viewDensity === 'comfort'
                    ? 'bg-surface-container-lowest text-on-surface shadow-2xs font-bold'
                    : 'text-outline hover:text-on-surface'
                )}
              >
                <Icon name="view_agenda" className="text-[16px]" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── ROW 1: Shop by Budget Interactive Pills ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 pt-0.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-outline shrink-0 mr-1 hidden sm:inline-flex items-center gap-1">
          <Icon name="payments" className="text-[13px]" /> Budget:
        </span>
        {BUDGET_PRESETS.map((b) => {
          const isActive =
            b.id === 'all'
              ? !currentMin && !currentMax
              : currentMin === b.min && currentMax === b.max;

          return (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                if (b.id === 'all') {
                  update({ minPrice: '', maxPrice: '' });
                } else if (isActive) {
                  update({ minPrice: '', maxPrice: '' });
                } else {
                  update({ minPrice: b.min, maxPrice: b.max });
                }
              }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-bold border transition-all shrink-0 active:scale-95 shadow-2xs cursor-pointer',
                isActive
                  ? 'bg-on-surface text-surface border-on-surface shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:border-outline hover:text-on-surface'
              )}
            >
              <Icon name={b.icon} className="text-[14px]" />
              <span>{b.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── ROW 2: Trend & Feature Radar Fast Toggle Widgets ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-outline shrink-0 mr-1 hidden sm:inline-flex items-center gap-1">
          <Icon name="bolt" className="text-[13px]" /> Fast Filters:
        </span>
        {FAST_FILTER_WIDGETS.map((f) => {
          let isOn = false;
          if (f.key === 'bestseller') isOn = get('bestseller') === 'true';
          else if (f.key === 'newArrival') isOn = get('newArrival') === 'true';
          else if (f.key === 'onSale') isOn = get('onSale') === 'true';
          else if (f.key === 'rating4') isOn = get('rating') === '4';
          else if (f.key === 'inStock') isOn = get('inStock') === 'true';

          return (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                if (f.key === 'bestseller') update({ bestseller: isOn ? '' : 'true' });
                else if (f.key === 'newArrival') update({ newArrival: isOn ? '' : 'true' });
                else if (f.key === 'onSale') update({ onSale: isOn ? '' : 'true' });
                else if (f.key === 'rating4') update({ rating: isOn ? '' : '4' });
                else if (f.key === 'inStock') update({ inStock: isOn ? '' : 'true' });
              }}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all shrink-0 active:scale-95 shadow-2xs cursor-pointer',
                isOn
                  ? f.activeColor
                  : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:border-outline hover:text-on-surface'
              )}
            >
              <Icon name={f.icon} className="text-[13px]" />
              <span>{f.label}</span>
              {isOn && <Icon name="check" className="text-[12px]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
