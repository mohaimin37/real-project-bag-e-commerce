import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../lib/format';
import { Icon } from './ui';

/**
 * Themed sort dropdown (replaces the native <select>, whose pop-up list is drawn by the
 * browser and can ignore the site's light/dark colours).
 * options: [[value, label, icon?], ...]
 */
export default function SortMenu({ value, options, onChange, label = 'Sort by', className }) {
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(0);
  const ref = useRef(null);
  const listId = useId();
  const current = options.find(([v]) => v === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const choose = (v) => {
    onChange(v);
    setOpen(false);
  };
  const openList = () => {
    setFocus(Math.max(0, options.findIndex(([v]) => v === value)));
    setOpen(true);
  };
  const onKey = (e) => {
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      openList();
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown') { e.preventDefault(); setFocus((i) => (i + 1) % options.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocus((i) => (i - 1 + options.length) % options.length); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(options[focus][0]); }
    else if (e.key === 'Tab') setOpen(false);
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${current[1]}`}
        className={cn(
          'flex items-center gap-2 h-11 pl-space-md pr-3 rounded-lg border text-left transition-colors w-full',
          'bg-surface-container-lowest text-on-surface border-surface-container-high hover:border-outline',
          open && 'border-secondary ring-2 ring-secondary/20'
        )}
      >
        <Icon name="swap_vert" className="text-[18px] text-secondary" />
        <span className="text-label-sm uppercase tracking-wider text-on-surface-variant hidden sm:inline">{label}</span>
        <span className="text-label-lg whitespace-nowrap">{current[1]}</span>
        <Icon name="expand_more" className={cn('text-[20px] text-on-surface-variant ml-auto transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute right-0 top-full mt-2 z-40 min-w-full w-max max-w-[90vw] p-1.5 rounded-xl bg-surface-container-lowest text-on-surface border border-surface-container-high shadow-lift animate-pop-in"
        >
          {options.map(([v, text, icon], i) => {
            const selected = v === value;
            return (
              <li
                key={v}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setFocus(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(v)}
                className={cn(
                  'flex items-center gap-3 px-3 h-11 rounded-lg cursor-pointer text-body-sm',
                  i === focus && 'bg-surface-container-low',
                  selected && 'text-secondary font-semibold'
                )}
              >
                <Icon name={icon || 'sort'} className={cn('text-[18px]', selected ? 'text-secondary' : 'text-on-surface-variant')} />
                <span className="flex-1">{text}</span>
                {selected && <Icon name="check" className="text-[18px] text-secondary" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
