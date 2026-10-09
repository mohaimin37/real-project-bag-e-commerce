import { memo, useEffect, useId, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { effectiveTheme, resetAppearance, resetCustomColors, resetVision, setCustomColors, setMode, setPalette, setSiteAppearance, setThemeOpen, setVision, toggleContrast } from '../../store';
import { useConfig } from '../../hooks/useStore';
import { designOf, previewStyle, themeTokens } from '../../theme/engine';
import { CORNER_STYLES, CUSTOM_DEFAULTS, CUSTOM_FIELDS, CUSTOM_THEME, DESIGNS, enabledThemeIds, TEXT_SIZES, THEME_ORDER, THEMES, VISION_DEFAULTS } from '../../theme/themes';
import { cn } from '../../lib/format';
import { Drawer, Icon, Toggle } from '../ui';

/** Keeps the store's appearance defaults (Admin → Settings → Appearance) in sync. Mount once per layout. */
export function useSiteAppearanceSync() {
  const dispatch = useDispatch();
  const { data: config } = useConfig();
  const appearance = config?.appearance;
  useEffect(() => {
    if (appearance) dispatch(setSiteAppearance(appearance));
  }, [appearance, dispatch]);
}

const heading = 'text-[11px] font-semibold uppercase tracking-wider text-outline mb-2';

/** iOS-style segmented control: a pill slides under the selected option. Radios underneath, so it is keyboard friendly. */
export function Segmented({ label, value, options, onChange }) {
  const name = useId();
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="radiogroup" aria-label={label} className="relative grid p-1 rounded-2xl bg-surface-container" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      <span
        aria-hidden="true"
        className="absolute top-1 bottom-1 left-1 rounded-xl bg-surface-container-lowest shadow-card transition-transform duration-300 ease-out"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o) => {
        const on = o.value === value;
        return (
          <label key={o.value} className="relative z-10 cursor-pointer min-w-0">
            <input type="radio" name={name} value={o.value} checked={on} onChange={() => onChange(o.value)} className="peer sr-only" />
            <span
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 h-14 px-1 rounded-xl text-[12px] font-semibold transition-colors',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-secondary',
                on ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <Icon name={o.icon} fill={on} className={cn('text-[20px] transition-colors', on && 'text-secondary')} />
              <span className="truncate max-w-full">{o.label}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

const MODES = [
  { value: 'light', icon: 'light_mode', label: 'Light' },
  { value: 'dark', icon: 'dark_mode', label: 'Dark' },
  { value: 'system', icon: 'contrast', label: 'System' },
];

/** Light / Dark / System: appearance mode, independent of the colour theme. */
export function AppearanceSelector() {
  const dispatch = useDispatch();
  const mode = useSelector((s) => s.ui.theme);
  const followSystem = useSelector((s) => s.ui.followSystem);
  return (
    <section>
      <h3 className={heading}>Appearance</h3>
      <Segmented label="Appearance" value={followSystem ? 'system' : mode} options={MODES} onChange={(v) => dispatch(setMode(v))} />
      <p className="mt-1.5 text-[11px] text-on-surface-variant" aria-live="polite">
        {followSystem ? `Follows your device · ${mode === 'dark' ? 'Dark' : 'Light'} right now` : mode === 'dark' ? 'Dark pages, light text' : 'Light pages, dark text'}
      </p>
    </section>
  );
}

/** A miniature storefront drawn with a theme's own tokens and design (scoped CSS variables, same classes). */
export const ThemePreview = memo(function ThemePreview({ themeId, mode, custom, className }) {
  const style = useMemo(() => previewStyle(themeId, mode, custom), [themeId, mode, custom]);
  return (
    <div style={style} data-design={designOf(themeId)} aria-hidden="true" className={cn('relative overflow-hidden rounded-lg bg-surface p-1.5 flex flex-col gap-1 ring-1 ring-inset ring-outline-variant', className)}>
      <div className="site-header flex items-center gap-1 h-3 px-1 rounded-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
        <span className="h-1 w-6 rounded-full bg-on-surface/70" />
        <span className="ml-auto h-1.5 w-8 rounded-full bg-surface-container" />
      </div>
      <div className="grid grid-cols-[1fr_1.1fr] gap-1 flex-1">
        <div className="surface-card rounded-sm bg-surface-container-lowest p-1 flex flex-col gap-0.5">
          <span className="flex-1 min-h-[14px] rounded-[3px] bg-surface-container" />
          <span className="h-1 w-4/5 rounded-full bg-on-surface/70" />
          <span className="h-1 w-1/2 rounded-full bg-on-surface-variant/50" />
          <span className="flex items-center justify-between">
            <span className="h-1.5 w-5 rounded-full bg-secondary" />
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
          </span>
        </div>
        <div className="rounded-sm bg-band px-1.5 py-1 flex flex-col justify-between">
          <span className="font-display text-[11px] leading-none text-on-band">Aa</span>
          <span className="h-1 w-3/4 rounded-full bg-accent" />
          <span className="self-start h-2.5 px-1.5 bg-primary text-on-primary text-[6px] leading-[10px] font-bold" style={{ borderRadius: 'var(--btn-radius)' }}>BUY</span>
        </div>
      </div>
    </div>
  );
});

/** The four colours that define a theme in this mode, as CSS colours. */
function swatchesFor(id, mode, custom) {
  const t = themeTokens(id, mode, custom);
  return ['secondary', 'accent', 'primary', 'surface'].map((k) => `rgb(${t[k]})`);
}

function ThemeOption({ id, name, tagline, selected, onSelect, mode, custom, groupName }) {
  const swatches = useMemo(() => swatchesFor(id, mode, custom), [id, mode, custom]);  return (
    <label className="relative cursor-pointer min-w-0 group">
      <input type="radio" name={groupName} value={id} checked={selected} onChange={onSelect} className="peer sr-only" />
      <span
        className={cn(
          'flex flex-col gap-1.5 p-1.5 rounded-2xl border-2 transition-[border-color,box-shadow,transform] duration-200 h-full',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-secondary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-container-lowest',
          selected ? 'border-secondary shadow-lift' : 'border-transparent bg-surface-container-low group-hover:-translate-y-0.5 group-hover:shadow-card'
        )}
      >
        <span className="relative block">
          <ThemePreview themeId={id} mode={mode} custom={custom} className="aspect-[16/10]" />
          <span
            className={cn(
              'absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center bg-secondary text-on-secondary shadow transition-all duration-200',
              selected ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            )}
          >
            <Icon name="check" className="text-[14px]" />
          </span>        </span>
        <span className="px-1 pb-0.5 min-w-0 flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-label-lg">
            <span className="truncate">{name}</span>
            <span className="ml-auto flex -space-x-1 shrink-0" aria-hidden="true">
              {swatches.map((c, i) => (
                <span key={i} className="w-3 h-3 rounded-full ring-2 ring-surface-container-lowest" style={{ background: c }} />
              ))}
            </span>
          </span>
          <span className="block text-[11px] leading-[14px] text-on-surface-variant line-clamp-2">{tagline}</span>
          <span className="block text-[10px] font-semibold text-secondary truncate">{DESIGNS[designOf(id)].name} · {DESIGNS[designOf(id)].hint}</span>
        </span>
      </span>
    </label>
  );
}

/** Preset themes + Custom, as radio cards with live previews in the current appearance. */
export function ThemeSelector({ onCustomise }) {
  const dispatch = useDispatch();
  const ui = useSelector((s) => s.ui);
  const active = effectiveTheme(ui);
  const enabled = enabledThemeIds(ui.site);
  const groupName = useId();
  const presets = THEME_ORDER.filter((id) => enabled.includes(id));
  return (
    <fieldset>
      <legend className={cn(heading, 'flex w-full items-center')}>
        Theme <span className="ml-auto normal-case tracking-normal font-normal">{presets.length + (enabled.includes(CUSTOM_THEME) ? 1 : 0)} options</span>
      </legend>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {presets.map((id) => (
          <ThemeOption key={id} id={id} name={THEMES[id].name} tagline={THEMES[id].tagline} groupName={groupName} mode={ui.theme} selected={active === id} onSelect={() => dispatch(setPalette(id))} />
        ))}
        {enabled.includes(CUSTOM_THEME) && (
          <ThemeOption
            id={CUSTOM_THEME}
            name="Custom"
            tagline="Pick your own colours"
            groupName={groupName}
            mode={ui.theme}
            custom={ui.customColors}
            selected={active === CUSTOM_THEME}
            onSelect={() => {
              dispatch(setPalette(CUSTOM_THEME));
              onCustomise?.();
            }}
          />
        )}
      </div>
    </fieldset>
  );
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Five colour pickers for the Custom theme, with a live preview and readability notes. */
export function CustomThemeEditor() {
  const dispatch = useDispatch();
  const saved = useSelector((s) => s.ui.customColors);
  const mode = useSelector((s) => s.ui.theme);
  const isCustom = useSelector((s) => effectiveTheme(s.ui) === CUSTOM_THEME);
  const [draft, setDraft] = useState(saved);
  useEffect(() => setDraft(saved), [saved]);
  const valid = CUSTOM_FIELDS.every(([k]) => HEX.test(draft[k] || ''));
  const notes = useMemo(() => {
    if (!valid) return [];
    const list = [];
    themeTokens(CUSTOM_THEME, mode, draft, list);
    return list;
  }, [draft, mode, valid]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  return (
    <section className="rounded-xl border border-outline-variant p-3 flex flex-col gap-3" aria-labelledby="custom-theme-title">
      <div className="flex items-center gap-2">
        <Icon name="palette" className="text-secondary text-[20px]" />
        <h3 id="custom-theme-title" className="text-label-lg">Custom theme</h3>
        <span className="ml-auto text-[11px] text-outline">Saved on this device</span>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <ThemePreview themeId={CUSTOM_THEME} mode={mode} custom={valid ? draft : saved} className="aspect-[16/7]" />
          <p className="text-[11px] text-outline text-center">Live preview · {mode === 'dark' ? 'Dark' : 'Light'} appearance</p>
        </div>
        <div className="flex flex-col gap-2">
          {CUSTOM_FIELDS.map(([key, label, hint]) => (
            <div key={key} className="flex items-center gap-2.5">
              <input
                type="color"
                value={HEX.test(draft[key] || '') ? draft[key] : '#000000'}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                aria-label={`${label} colour`}
                className="w-10 h-10 shrink-0 rounded-lg border border-outline-variant bg-transparent cursor-pointer p-0.5"
              />
              <div className="min-w-0 flex-1">
                <p className="text-label-md">{label}</p>
                <p className="text-[11px] text-on-surface-variant truncate">{hint}</p>
              </div>
              <input
                value={draft[key] || ''}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value.trim() })}
                aria-label={`${label} hex code`}
                aria-invalid={!HEX.test(draft[key] || '')}
                maxLength={7}
                spellCheck={false}
                className={cn('input !h-9 w-[92px] font-mono !text-[13px] uppercase', !HEX.test(draft[key] || '') && 'input-error')}
              />
            </div>
          ))}
        </div>
      </div>
      {!valid && <p className="text-[12px] text-error">Use 6-digit hex codes, e.g. #96582C.</p>}
      {notes.length > 0 && (
        <ul className="flex flex-col gap-1 text-[12px] text-on-surface-variant" aria-live="polite">
          {notes.map((n) => (
            <li key={n} className="flex items-start gap-1.5"><Icon name="info" className="text-[15px] text-secondary mt-px" /> {n}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary btn-sm flex-1"
          disabled={!valid || (!dirty && isCustom)}
          onClick={() => {
            dispatch(setCustomColors(draft));
            dispatch(setPalette(CUSTOM_THEME));
          }}
        >
          <Icon name="check" className="text-[18px]" /> Apply
        </button>
        <button
          type="button"
          className="btn-tonal btn-sm"
          onClick={() => {
            dispatch(resetCustomColors());
            setDraft(CUSTOM_DEFAULTS);
          }}
        >
          <Icon name="restart_alt" className="text-[18px]" /> Reset custom theme
        </button>
      </div>
    </section>
  );
}

/** Text size as a stepped slider, with the steps labelled underneath. */
function TextSizeSlider() {
  const dispatch = useDispatch();
  const textSize = useSelector((s) => s.ui.vision.textSize);
  const index = Math.max(0, TEXT_SIZES.findIndex(([v]) => v === textSize));
  const [, label, pct] = TEXT_SIZES[index];
  return (
    <div className="rounded-2xl bg-surface-container-low p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icon name="format_size" className="text-[20px] text-secondary" />
        <span className="text-label-lg">Text size</span>
        <span className="ml-auto px-2 py-0.5 rounded-full bg-secondary/15 text-secondary text-[12px] font-bold tabular-nums">{pct}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[12px] font-bold leading-none" aria-hidden="true">A</span>
        <input
          type="range"
          min={0}
          max={TEXT_SIZES.length - 1}
          step={1}
          value={index}
          onChange={(e) => dispatch(setVision({ textSize: TEXT_SIZES[Number(e.target.value)][0] }))}
          aria-label="Text size"
          aria-valuetext={`${label}, ${pct}`}
          className="flex-1 h-2 cursor-pointer accent-secondary"
        />
        <span className="text-[20px] font-bold leading-none" aria-hidden="true">A</span>
      </div>
      <div className="flex justify-between px-5 text-[10px] text-on-surface-variant" aria-hidden="true">
        {TEXT_SIZES.map(([v, l]) => (
          <span key={v} className={cn(v === textSize && 'text-secondary font-bold')}>{l}</span>
        ))}
      </div>
    </div>
  );
}

/** Text size and corner style: layout preferences that work with every theme. */
export function LayoutSettings() {
  const dispatch = useDispatch();
  const corners = useSelector((s) => s.ui.vision.corners);
  return (
    <section className="flex flex-col gap-2">
      <h3 className={heading}>Text & shape</h3>
      <TextSizeSlider />
      <div className="flex flex-col gap-1.5">
        <p className="text-[12px] text-on-surface-variant">Corners</p>
        <Segmented
          label="Corner style"
          value={corners || 'theme'}
          options={CORNER_STYLES.map(([value, label, icon]) => ({ value, label, icon }))}
          onChange={(v) => dispatch(setVision({ corners: v }))}
        />
      </div>
    </section>
  );
}

/** Readable font, contrast, link underlines and motion: for shoppers to suit their sight. */
export function VisionSettings() {
  const dispatch = useDispatch();
  const vision = useSelector((s) => s.ui.vision);
  const contrast = useSelector((s) => s.ui.contrast);
  const active = useSelector((s) => effectiveTheme(s.ui));
  const changed = contrast === 'high' || Object.entries(VISION_DEFAULTS).some(([k, v]) => vision[k] !== v);
  const toggles = [
    ['contrast', 'contrast', 'High contrast', 'Darker text, stronger borders and focus outlines', contrast === 'high', () => dispatch(toggleContrast())],
    ['readableFont', 'text_fields', 'Easy-to-read font', 'Atkinson Hyperlegible, designed for low vision', vision.readableFont, (v) => dispatch(setVision({ readableFont: v }))],
    ['underlineLinks', 'format_underlined', 'Underline links', "Spot links without relying on colour", vision.underlineLinks, (v) => dispatch(setVision({ underlineLinks: v }))],
    ['reduceMotion', 'motion_photos_off', 'Reduce motion', 'Turn off animations and sliding effects', vision.reduceMotion, (v) => dispatch(setVision({ reduceMotion: v }))],
  ];
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={heading}>Vision</legend>
      <div className="flex flex-col rounded-2xl bg-surface-container-low divide-y divide-outline-variant/60">
        {toggles.map(([key, icon, label, hint, checked, onChange]) => (
          <div key={key} className="flex items-center gap-3 p-3">
            <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors', checked ? 'bg-secondary text-on-secondary' : 'bg-surface-container text-secondary')}>
              <Icon name={icon} className="text-[20px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-label-lg">{label}</p>
              <p className="text-[12px] text-on-surface-variant">{hint}</p>
            </div>
            <Toggle checked={Boolean(checked)} onChange={onChange} ariaLabel={label} />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {active !== 'clear' && THEMES.clear && (
          <button type="button" className="btn-tonal btn-sm" onClick={() => dispatch(setPalette('clear'))}>
            <Icon name="visibility" className="text-[18px]" /> Use High visibility theme
          </button>
        )}
        {changed && (
          <button type="button" className="btn-ghost btn-sm" onClick={() => dispatch(resetVision())}>
            <Icon name="restart_alt" className="text-[18px]" /> Reset vision settings
          </button>
        )}
      </div>
    </fieldset>
  );
}

/** A large live preview of what is applied right now. */
function CurrentLook() {
  const ui = useSelector((s) => s.ui);
  const active = effectiveTheme(ui);
  const t = active === CUSTOM_THEME ? { name: 'Custom', tagline: 'Your own colours' } : THEMES[active];
  return (
    <div className="flex items-center gap-3 p-2 pr-3 rounded-2xl bg-surface-container-low">
      <ThemePreview themeId={active} mode={ui.theme} custom={ui.customColors} className="w-28 aspect-[16/10] shrink-0 shadow-card" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-outline">Now showing</p>
        <p className="text-label-lg truncate">{t.name}</p>
        <p className="text-[11px] text-on-surface-variant flex items-center gap-1">
          <Icon name={ui.theme === 'dark' ? 'dark_mode' : 'light_mode'} className="text-[14px]" />
          {ui.followSystem ? 'System' : ui.theme === 'dark' ? 'Dark' : 'Light'} · {t.tagline}
        </p>      </div>
    </div>
  );
}

/** Everything in one panel: appearance, theme, custom colours, text & shape and vision settings. */
export function AppearanceSettings() {
  const isCustom = useSelector((s) => effectiveTheme(s.ui) === CUSTOM_THEME);
  const customEnabled = useSelector((s) => enabledThemeIds(s.ui.site).includes(CUSTOM_THEME));
  const [editing, setEditing] = useState(isCustom);
  return (
    <div className="flex flex-col gap-5 p-4 sm:p-5">
      <CurrentLook />
      <AppearanceSelector />
      <ThemeSelector onCustomise={() => setEditing(true)} />
      {customEnabled && (editing || isCustom ? (
        <CustomThemeEditor />
      ) : (
        <button type="button" className="btn-ghost btn-sm self-start -mt-2" onClick={() => setEditing(true)}>
          <Icon name="tune" className="text-[18px]" /> Create a custom theme
        </button>
      ))}
      <LayoutSettings />
      <VisionSettings />
      <p className="text-[12px] text-on-surface-variant">
        Your choice is saved on this device and applies instantly. Your bag, wishlist and anything you're typing are not affected.
      </p>
    </div>
  );
}

/** The slide-in "Appearance" panel, opened from the header, menus and admin top bar. */
export default function ThemeDrawer() {
  const dispatch = useDispatch();
  const open = useSelector((s) => s.ui.themeOpen);
  useSiteAppearanceSync();
  const close = () => dispatch(setThemeOpen(false));
  return (
    <Drawer
      open={open}
      onClose={close}
      width="max-w-md"
      title="Appearance"
      footer={
        <div className="flex items-center justify-between gap-2">
          <button type="button" className="btn-ghost btn-sm -ml-2" onClick={() => dispatch(resetAppearance())}>
            <Icon name="restart_alt" className="text-[18px]" /> Store default
          </button>
          <button type="button" className="btn-primary btn-sm" onClick={close}>Done</button>
        </div>
      }
    >
      <AppearanceSettings />
    </Drawer>
  );
}
