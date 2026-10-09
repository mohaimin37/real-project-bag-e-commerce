import { createContext, forwardRef, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { cn, imgUrl, FALLBACK_IMAGE, STATUS_STYLE } from '../lib/format';
import { COUNTRIES, DIAL_CODES, sortedForPicker } from '../lib/countries';

export function Icon({ name, className, fill, ...props }) {
  return (
    <span aria-hidden="true" className={cn('material-symbols-outlined', fill && 'icon-fill', className)} {...props}>
      {name}
    </span>
  );
}

export function Spinner({ className }) {
  return <span className={cn('inline-block w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin', className)} role="status" aria-label="Loading" />;
}

export const Button = forwardRef(function Button({ variant = 'primary', size, loading, icon, iconRight, className, children, disabled, ...props }, ref) {
  return (
    <button ref={ref} className={cn(`btn-${variant}`, size === 'sm' && 'btn-sm', className)} disabled={disabled || loading} {...props}>
      {loading ? <Spinner /> : icon ? <Icon name={icon} className="text-[18px]" /> : null}
      {children}
      {iconRight && !loading && <Icon name={iconRight} className="text-[18px]" />}
    </button>
  );
});

export function Skeleton({ className }) {
  return (
    <div className={cn('relative overflow-hidden bg-surface-container rounded-lg', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-surface-container-lowest/60 to-transparent" />
    </div>
  );
}

/** Image with a shimmer while loading, auto-retry on resizing hiccups, and a graceful fallback on error. */
// w = display width in CSS px; the 2x copy keeps it sharp on high-density screens.
export function Img({ src, alt = '', className, imgClassName, w = 480, fallback = FALLBACK_IMAGE, ...props }) {
  const target = src || fallback;
  const initialUrl = imgUrl(target, w);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [currentSrcSet, setCurrentSrcSet] = useState(() => (w && target ? `${initialUrl} 1x, ${imgUrl(target, w * 2)} 2x` : undefined));
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const retryStep = useRef(0);

  useEffect(() => {
    const raw = src || fallback;
    retryStep.current = 0;
    setLoaded(false);
    setFailed(false);
    const u = imgUrl(raw, w);
    setCurrentUrl(u);
    setCurrentSrcSet(w && raw ? `${u} 1x, ${imgUrl(raw, w * 2)} 2x` : undefined);
  }, [src, w, fallback]);

  const handleError = () => {
    if (retryStep.current === 0 && w && src) {
      // Step 1: bypass resize middleware (?w=) and fetch direct raw asset
      retryStep.current = 1;
      setCurrentSrcSet(undefined);
      setCurrentUrl(imgUrl(src, null));
    } else if (retryStep.current <= 1 && fallback && currentUrl !== fallback) {
      // Step 2: fallback to guaranteed seed asset
      retryStep.current = 2;
      setCurrentSrcSet(undefined);
      setCurrentUrl(fallback);
    } else {
      // Step 3: show fallback icon if all attempts fail
      setFailed(true);
    }
  };

  return (
    // Only default to `relative` when the caller hasn't positioned it (Tailwind would let `relative` override `absolute`).
    <div className={cn(!/\b(absolute|fixed|sticky)\b/.test(className || '') && 'relative', 'overflow-hidden bg-surface-container-low', className)}>
      {!loaded && !failed && <Skeleton className="absolute inset-0 rounded-none" />}
      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center text-outline">
          <Icon name="image" className="text-[32px]" />
        </div>
      ) : (
        <img
          src={currentUrl}
          srcSet={currentSrcSet}
          alt={alt}
          loading={props.loading || 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={handleError}
          ref={(node) => {
            if (node && node.complete && node.naturalWidth > 0 && !loaded) {
              setLoaded(true);
            }
          }}
          className={cn('w-full h-full object-cover transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0', imgClassName)}
          {...props}
        />
      )}
    </div>
  );
}

export function Field({ label, error, hint, children, className, required, htmlFor }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-label-md text-on-surface-variant uppercase tracking-wide">
          {label}
          {required && <span className="text-error"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-label-md normal-case tracking-normal text-error flex items-center gap-1" role="alert">
          <Icon name="error" className="text-[14px]" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-label-md normal-case tracking-normal font-normal text-outline">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, error, ...props }, ref) {
  return <input ref={ref} className={cn('input', error && 'input-error', className)} aria-invalid={error ? 'true' : undefined} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className, error, rows = 4, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cn('input', error && 'input-error', className)} aria-invalid={error ? 'true' : undefined} {...props} />;
});

export const Select = forwardRef(function Select({ className, error, children, ...props }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn('input appearance-none pr-10 cursor-pointer', error && 'input-error', className)} {...props}>
        {children}
      </select>
      <Icon name="expand_more" className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]" />
    </div>
  );
});

export const CountrySelect = forwardRef(function CountrySelect({ placeholder = 'Select country', ...props }, ref) {
  return (
    <Select ref={ref} {...props}>
      <option value="">{placeholder}</option>
      {sortedForPicker(COUNTRIES).map((c, i) => (
        <option key={`${c.code}-${i}`} value={c.code}>
          {c.flag} {c.name}
        </option>
      ))}
    </Select>
  );
});

/** Dial code + number pair, for react-hook-form register() of two fields. */
export function PhoneInput({ dialProps, numberProps, error }) {
  return (
    <div className="flex gap-2">
      <div className="relative w-28 sm:w-36 shrink-0">
        <select className={cn('input appearance-none pr-8 cursor-pointer', error && 'input-error')} aria-label="Dialling code" {...dialProps}>
          {sortedForPicker(DIAL_CODES).map((c) => (
            <option key={c.dial} value={c.dial}>
              {c.flag} {c.dial}
            </option>
          ))}
        </select>
        <Icon name="expand_more" className="absolute right-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]" />
      </div>
      <input type="tel" inputMode="tel" autoComplete="tel-national" placeholder="98765 43210" className={cn('input min-w-0', error && 'input-error')} {...numberProps} />
    </div>
  );
}

export function Badge({ children, className, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-surface-container text-on-surface',
    dark: 'bg-primary text-on-primary',
    teal: 'bg-secondary text-on-secondary',
    mint: 'bg-secondary-container text-on-secondary-fixed',
    amber: 'bg-tertiary-fixed text-tertiary-container',
    danger: 'bg-error-container text-on-error-container',
  };
  return <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-label-sm uppercase tracking-wide', tones[tone], className)}>{children}</span>;
}

export function StatusBadge({ status, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-md whitespace-nowrap', STATUS_STYLE[status] || 'bg-surface-container text-on-surface', className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}

export function Stars({ value = 0, size = 16, className }) {
  return (
    <span className={cn('inline-flex items-center text-on-tertiary-container', className)} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name={value >= i - 0.25 ? 'star' : value >= i - 0.75 ? 'star_half' : 'star'} fill={value >= i - 0.75} className={cn(value < i - 0.75 && 'text-outline-variant')} style={{ fontSize: size }} />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const labels = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
  return (
    <div className="flex items-center gap-2">
      <div className="flex" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} star${i > 1 ? 's' : ''}`}
            onMouseEnter={() => setHover(i)}
            onClick={() => onChange(i)}
            className="p-0.5 text-on-tertiary-container transition-transform hover:scale-110"
          >
            <Icon name="star" fill={(hover || value) >= i} className={cn('text-[28px]', (hover || value) < i && 'text-outline-variant')} />
          </button>
        ))}
      </div>
      <span className="text-label-md text-on-surface-variant">{labels[hover || value]}</span>
    </div>
  );
}

export function QuantityStepper({ value, onChange, min = 1, max = 99, size = 'md', disabled }) {
  const h = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
  return (
    <div className="inline-flex items-center gap-1 bg-surface-container-lowest rounded-lg shadow-card p-1">
      <button type="button" aria-label="Decrease quantity" className={cn(h, 'rounded flex items-center justify-center hover:bg-surface-container-low disabled:opacity-40')} disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>
        <Icon name="remove" className="text-[18px]" />
      </button>
      <span className="w-8 text-center text-label-lg tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" aria-label="Increase quantity" className={cn(h, 'rounded flex items-center justify-center hover:bg-surface-container-low disabled:opacity-40')} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
        <Icon name="add" className="text-[18px]" />
      </button>
    </div>
  );
}

export function EmptyState({ icon = 'inventory_2', title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center text-center gap-space-sm py-16 px-space-lg', className)}>
      <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-secondary mb-space-xs">
        <Icon name={icon} className="text-[32px]" />
      </div>
      <h3 className="text-headline-sm text-on-surface">{title}</h3>
      {description && <p className="text-body-sm text-on-surface-variant max-w-sm">{description}</p>}
      {action && <div className="pt-space-sm">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }) {
  return (
    <div className={cn('flex flex-col items-center text-center gap-space-sm py-16 px-space-lg', className)} role="alert">
      <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center text-on-error-container">
        <Icon name="cloud_off" className="text-[32px]" />
      </div>
      <h3 className="text-headline-sm">We couldn't load this</h3>
      <p className="text-body-sm text-on-surface-variant max-w-sm">{error?.message || 'Something went wrong.'}</p>
      {onRetry && (
        <Button variant="tonal" icon="refresh" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

function useLockScroll(active) {
  useEffect(() => {
    if (!active) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

function useEscape(active, onClose) {
  useEffect(() => {
    if (!active) return undefined;
    const fn = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [active, onClose]);
}

export function Modal({ open, onClose, title, children, size = 'md', className, hideClose }) {
  useLockScroll(open);
  useEscape(open, onClose);
  const titleId = useId();
  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-space-md">
      <div className="absolute inset-0 bg-black/45 animate-fade-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn('relative w-full bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-lift animate-pop-in max-h-[calc(92vh/var(--zoom,1))] overflow-y-auto', widths[size], className)}
      >
        {(title || !hideClose) && (
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-space-lg py-space-md bg-surface-container-lowest/95 backdrop-blur">
            {title ? (
              <h2 id={titleId} className="text-headline-sm">
                {title}
              </h2>
            ) : (
              <span />
            )}
            {!hideClose && (
              <button type="button" onClick={onClose} className="btn-icon" aria-label="Close">
                <Icon name="close" />
              </button>
            )}
          </div>
        )}
        <div className={cn(title || !hideClose ? 'px-space-lg pb-space-lg' : 'p-space-lg')}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function Drawer({ open, onClose, side = 'right', title, children, footer, width = 'max-w-md' }) {
  useLockScroll(open);
  useEscape(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={cn(
          'absolute top-0 bottom-0 w-full flex flex-col bg-surface-container-lowest shadow-lift',
          width,
          side === 'right' ? 'right-0 animate-slide-in-right' : 'left-0 animate-slide-in-left'
        )}
      >
        <div className="flex items-center justify-between px-5 h-14 shrink-0 border-b border-surface-container-high">
          <div className="text-headline-sm flex items-center gap-2">{title}</div>
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="shrink-0 border-t border-surface-container-high px-5 py-3 pb-safe bg-surface-container-lowest">{footer}</div>}
      </aside>
    </div>,
    document.body
  );
}

// ── Confirmation dialogs (promise-based) ─────────────────────

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolver = useRef(null);
  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setState({ title: 'Are you sure?', confirmLabel: 'Confirm', tone: 'danger', ...opts });
      }),
    []
  );
  const close = (result) => {
    resolver.current?.(result);
    setState(null);
  };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={Boolean(state)} onClose={() => close(false)} size="sm" hideClose>
        {state && (
          <div className="flex flex-col gap-space-md">
            <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', state.tone === 'danger' ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-fixed')}>
              <Icon name={state.icon || (state.tone === 'danger' ? 'warning' : 'help')} />
            </div>
            <div>
              <h2 className="text-headline-sm">{state.title}</h2>
              {state.message && <p className="text-body-sm text-on-surface-variant mt-1">{state.message}</p>}
            </div>
            <div className="flex gap-space-sm justify-end pt-space-xs">
              <Button variant="tonal" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button variant={state.tone === 'danger' ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
                {state.confirmLabel}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

export function Pagination({ page, pages, onChange, className }) {
  if (!pages || pages <= 1) return null;
  const nums = [];
  for (let i = 1; i <= pages; i += 1) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <nav className={cn('flex items-center justify-center gap-1', className)} aria-label="Pagination">
      <button type="button" className="btn-icon disabled:opacity-40" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <Icon name="chevron_left" />
      </button>
      {nums.map((n, i) =>
        n === '…' ? (
          <span key={`e${i}`} className="w-10 text-center text-outline">
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-current={n === page ? 'page' : undefined}
            className={cn('w-10 h-10 rounded-lg text-label-lg transition-colors', n === page ? 'bg-primary text-on-primary' : 'hover:bg-surface-container-low')}
          >
            {n}
          </button>
        )
      )}
      <button type="button" className="btn-icon disabled:opacity-40" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
        <Icon name="chevron_right" />
      </button>
    </nav>
  );
}

export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumbs" className="flex items-center flex-wrap gap-space-xs text-label-md text-on-surface-variant">
      {items.map((it, i) => (
        <span key={it.label} className="flex items-center gap-space-xs">
          {i > 0 && <Icon name="chevron_right" className="text-[14px] text-outline" />}
          {it.to ? (
            <Link to={it.to} className="hover:text-secondary transition-colors">
              {it.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-on-surface font-semibold">
              {it.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function Toggle({ checked, onChange, label, disabled, ariaLabel }) {
  return (
    <label className={cn('inline-flex items-center gap-2 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative w-10 h-6 rounded-full transition-colors', checked ? 'bg-secondary' : 'bg-surface-container-highest')}
      >
        <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-4')} />
      </button>
      {label && <span className="text-body-sm">{label}</span>}
    </label>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Spinner className="w-8 h-8 text-secondary" />
    </div>
  );
}
