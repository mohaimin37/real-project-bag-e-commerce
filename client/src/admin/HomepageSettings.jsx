import { useState } from 'react';
import { cn } from '../lib/format';
import { Button, Field, Icon, Input, Textarea, Toggle } from '../components/ui';
import { Panel } from './kit';
import { ImageField, SHOWCASE_ICONS } from './StorefrontSettings';
import { useCategories } from '../hooks/useStore';
import {
  BUILTIN_FOOTER, DESKTOP_SECTIONS, HOME_TONES, MOBILE_SECTIONS, RAIL_SOURCES, mergeFooter, mergeHomepage,
} from '../content/homepage';

// Every icon the homepage can use. Listing them here keeps them in the production icon font.
const ICONS = [...new Set([
  ...SHOWCASE_ICONS, 'rocket_launch', 'workspace_premium', 'verified_user', 'corporate_fare', 'health_and_safety',
  'forum', 'toll', 'inventory_2', 'storefront', 'savings', 'home', 'school', 'sports_esports', 'photo_camera',
])];
const DOT = { rose: 'bg-rose-500', indigo: 'bg-indigo-500', sky: 'bg-sky-500', emerald: 'bg-emerald-500', teal: 'bg-teal-500', violet: 'bg-violet-500', pink: 'bg-pink-500', blue: 'bg-blue-500', slate: 'bg-slate-500' };

// ── Small field editors ──────────────────────────────────────────────

function IconSelect({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <Icon name={value || 'help'} className="text-[22px] text-secondary shrink-0" />
      <select className="input" value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">None</option>
        {[...new Set([...(value ? [value] : []), ...ICONS])].map((ic) => <option key={ic} value={ic}>{ic.replace(/_/g, ' ')}</option>)}
      </select>
    </div>
  );
}

function ToneSelect({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5 py-1">
      {HOME_TONES.map((t) => (
        <button key={t} type="button" title={t} aria-label={`Colour ${t}`} onClick={() => onChange(t)} className={cn('w-6 h-6 rounded-full ring-offset-2 ring-offset-surface', DOT[t], value === t && 'ring-2 ring-on-surface')} />
      ))}
    </div>
  );
}

function CategorySelect({ value, onChange }) {
  const { data: tree } = useCategories();
  const all = (tree || []).flatMap((c) => [c, ...(c.children || []).map((x) => ({ ...x, name: `${c.name} › ${x.name}` }))]);
  return (
    <select className="input" value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose a category…</option>
      {value && !all.some((c) => c.slug === value) && <option value={value}>{value}</option>}
      {all.map((c) => <option key={c._id} value={c.slug}>{c.name}</option>)}
    </select>
  );
}

/** One input for a field definition: { key, label, type, max, hint, className, options }. */
function FieldInput({ f, value, onChange }) {
  switch (f.type) {
    case 'icon': return <IconSelect value={value} onChange={onChange} />;
    case 'tone': return <ToneSelect value={value} onChange={onChange} />;
    case 'image': return <ImageField value={value || ''} onChange={onChange} />;
    case 'category': return <CategorySelect value={value} onChange={onChange} />;
    case 'textarea': return <Textarea rows={3} value={value || ''} maxLength={f.max || 600} onChange={(e) => onChange(e.target.value)} />;
    case 'select':
      return (
        <select className="input" value={value || ''} onChange={(e) => onChange(e.target.value)}>
          {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      );
    default: return <Input value={value ?? ''} maxLength={f.max || 200} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />;
  }
}

function Fields({ fields, value, onChange }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
      {fields.filter((f) => !f.when || f.when(value)).map((f) => (
        <Field key={f.key} label={f.label} hint={f.hint} className={f.className || 'md:col-span-6'}>
          <FieldInput f={f} value={value?.[f.key]} onChange={(v) => onChange({ ...value, [f.key]: v })} />
        </Field>
      ))}
    </div>
  );
}

/** A list of items, each edited with the same fields, with add / reorder / delete. */
function ItemList({ title, hint, rows = [], onChange, fields, blank, max = 12, summary }) {
  const [open, setOpen] = useState(null);
  const update = (i, v) => onChange(rows.map((r, x) => (x === i ? v : r)));
  const move = (i, d) => {
    const next = [...rows];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
    setOpen(null);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-label-lg">{title}</p>
          {hint && <p className="text-body-sm text-on-surface-variant">{hint}</p>}
        </div>
        <Button size="sm" variant="tonal" icon="add" disabled={rows.length >= max} onClick={() => { onChange([...rows, structuredClone(blank)]); setOpen(rows.length); }}>Add</Button>
      </div>
      {rows.length === 0 && <p className="text-body-sm text-outline">Nothing here — this part is hidden.</p>}
      {rows.map((r, i) => (
        <div key={i} className="rounded-xl bg-surface-container-low border border-outline-variant/40">
          <div className="flex items-center gap-2 p-2 pl-3">
            <button type="button" className="flex-1 min-w-0 text-left text-body-sm font-semibold truncate" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              <Icon name={open === i ? 'expand_less' : 'expand_more'} className="text-[18px] align-[-4px] mr-1 text-outline" />
              {summary(r) || <span className="text-outline">(empty)</span>}
            </button>
            <button type="button" className="btn-icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><Icon name="arrow_upward" /></button>
            <button type="button" className="btn-icon" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><Icon name="arrow_downward" /></button>
            <button type="button" className="btn-icon hover:text-error" onClick={() => { onChange(rows.filter((_, x) => x !== i)); setOpen(null); }} aria-label="Remove"><Icon name="delete" /></button>
          </div>
          {open === i && <div className="p-3 pt-0"><Fields fields={fields} value={r} onChange={(v) => update(i, v)} /></div>}
        </div>
      ))}
    </div>
  );
}

/** Show / hide and reorder the sections of one homepage view. */
function SectionOrder({ sections, labels, onChange }) {
  const label = Object.fromEntries(labels);
  const move = (i, d) => {
    const next = [...sections];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <ol className="flex flex-col gap-1.5">
      {sections.map((s, i) => (
        <li key={s.key} className={cn('flex items-center gap-2 p-2 pl-3 rounded-xl border', s.visible !== false ? 'bg-surface-container-low border-outline-variant/40' : 'border-dashed border-outline-variant opacity-60')}>
          <span className="w-6 text-label-sm text-outline">{i + 1}</span>
          <span className="flex-1 text-body-sm font-semibold">{label[s.key] || s.key}</span>
          <Toggle checked={s.visible !== false} onChange={(v) => onChange(sections.map((x) => (x.key === s.key ? { ...x, visible: v } : x)))} label={s.visible !== false ? 'Shown' : 'Hidden'} />
          <button type="button" className="btn-icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${label[s.key]} up`}><Icon name="arrow_upward" /></button>
          <button type="button" className="btn-icon" disabled={i === sections.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${label[s.key]} down`}><Icon name="arrow_downward" /></button>
        </li>
      ))}
    </ol>
  );
}

// ── Field definitions ───────────────────────────────────────────────

const LINK = (label = 'Link', key = 'to') => ({ key, label, placeholder: '/shop/backpacks', hint: 'A store page starting with /' });
const RAIL_FIELDS = (withTone) => [
  { key: 'title', label: 'Title', max: 80 },
  ...(withTone ? [{ key: 'eyebrow', label: 'Small label above', max: 40 }] : [{ key: 'subtitle', label: 'Subtitle', max: 120 }]),
  { key: 'source', label: 'Products from', type: 'select', options: RAIL_SOURCES },
  { key: 'category', label: 'Category', type: 'category', when: (v) => v?.source === 'category' },
  { ...LINK('“View all” link', 'link') },
  ...(withTone ? [{ key: 'icon', label: 'Icon', type: 'icon' }, { key: 'tone', label: 'Colour', type: 'tone', className: 'md:col-span-12' }] : []),
];

const SECTION_FORMS = {
  hero: {
    title: 'Hero (big intro at the top)',
    fields: [
      { key: 'badge', label: 'Small badge', max: 60 },
      { key: 'title', label: 'Headline', max: 80 },
      { key: 'highlight', label: 'Coloured end of the headline', max: 60 },
      { key: 'text', label: 'Text under the headline', type: 'textarea', className: 'md:col-span-12' },
      { key: 'image', label: 'Picture on the right', type: 'image' },
      { key: 'imageEyebrow', label: 'Small label on the picture', max: 40 },
      { key: 'imageCaption', label: 'Caption on the picture', max: 120, className: 'md:col-span-12' },
      { key: 'ratingText', label: 'Rating badge (optional)', max: 40, hint: 'Leave empty unless it is a real, current number' },
      { key: 'ratingSub', label: 'Rating badge small text', max: 60 },
    ],
    lists: [
      { key: 'stats', title: 'Highlight boxes', hint: 'Short facts, e.g. “7-Day · Easy returns”. Keep them true.', max: 4, blank: { value: '', label: '', tone: 'rose' }, summary: (r) => [r.value, r.label].filter(Boolean).join(' · '), fields: [{ key: 'value', label: 'Big text', max: 20 }, { key: 'label', label: 'Small text', max: 40 }, { key: 'tone', label: 'Colour', type: 'tone', className: 'md:col-span-12' }] },
      { key: 'buttons', title: 'Buttons', max: 8, blank: { label: '', to: '/shop', icon: '', tone: 'indigo' }, summary: (r) => r.label, fields: [{ key: 'label', label: 'Text', max: 40 }, LINK(), { key: 'icon', label: 'Icon', type: 'icon' }, { key: 'tone', label: 'Colour', type: 'tone' }] },
    ],
  },
  departments: {
    title: 'Departments (also used on phones)',
    fields: [{ key: 'eyebrow', label: 'Small label', max: 60 }, { key: 'title', label: 'Heading', max: 120 }],
    lists: [
      { key: 'cards', title: 'Department cards', hint: 'The first three are tall cards, the rest wide.', max: 9, blank: { to: '/shop', label: '', eyebrow: '', text: '', image: '', tag: '', tone: 'slate' }, summary: (r) => r.label, fields: [{ key: 'label', label: 'Name', max: 40 }, LINK(), { key: 'eyebrow', label: 'Small label', max: 40 }, { key: 'tag', label: 'Corner tag', max: 40 }, { key: 'text', label: 'Short text', max: 160, className: 'md:col-span-12' }, { key: 'image', label: 'Photo', type: 'image' }, { key: 'tone', label: 'Colour', type: 'tone' }] },
    ],
  },
  rails: {
    title: 'Product rows',
    lists: [{ key: '', title: 'Rows of products', hint: 'Each row shows up to 8 products from a collection or a category. Rows with no products hide themselves.', max: 10, blank: { title: 'New row', eyebrow: '', source: 'featured', category: '', link: '/shop', icon: 'star', tone: 'indigo' }, summary: (r) => r.title, fields: RAIL_FIELDS(true) }],
  },
  spinPromo: { title: 'Spin & Win banner', fields: [{ key: 'title', label: 'Heading', max: 80 }, { key: 'button', label: 'Button text', max: 30 }, { key: 'text', label: 'Text', max: 160, className: 'md:col-span-12' }], note: 'Hidden automatically while Spin & Win is switched off.' },
  values: {
    title: 'Why choose us',
    fields: [{ key: 'eyebrow', label: 'Small label', max: 40 }, { key: 'title', label: 'Heading', max: 80 }],
    lists: [{ key: 'items', title: 'Cards', max: 6, blank: { icon: 'verified', title: '', text: '' }, summary: (r) => r.title, fields: [{ key: 'icon', label: 'Icon', type: 'icon' }, { key: 'title', label: 'Title', max: 40 }, { key: 'text', label: 'Text', max: 200, className: 'md:col-span-12' }] }],
  },
  sustainability: { title: 'Sustainability', fields: [{ key: 'badge', label: 'Small badge', max: 60 }, { key: 'title', label: 'Heading', max: 100 }, { key: 'text', label: 'Text', type: 'textarea', className: 'md:col-span-12' }, { key: 'button', label: 'Button text', max: 40 }, LINK('Button link')] },
  editorial: {
    title: 'Journal & standards',
    fields: [{ key: 'eyebrow', label: 'Small label', max: 60 }, { key: 'title', label: 'Heading', max: 80 }, { key: 'text', label: 'Text', max: 200, className: 'md:col-span-12' }],
    note: 'The latest 3 published Journal posts show automatically (Content → Journal).',
    lists: [
      { key: 'press', title: 'Press coverage', hint: 'Only add real, published coverage — with a link to it. Empty = hidden.', max: 6, blank: { pub: '', quote: '', badge: '', tagline: '', url: '', tone: 'indigo' }, summary: (r) => r.pub, fields: [{ key: 'pub', label: 'Publication', max: 40 }, { key: 'badge', label: 'Badge', max: 30 }, { key: 'quote', label: 'Exact quote', max: 300, className: 'md:col-span-12' }, { key: 'tagline', label: 'Article title', max: 80 }, { key: 'url', label: 'Link to the article', placeholder: 'https://…', hint: 'Full https:// link' }, { key: 'tone', label: 'Colour', type: 'tone' }] },
      { key: 'standards', title: 'Standards band', max: 4, blank: { icon: 'verified', title: '', desc: '' }, summary: (r) => r.title, fields: [{ key: 'icon', label: 'Icon', type: 'icon' }, { key: 'title', label: 'Title', max: 40 }, { key: 'desc', label: 'Text', max: 200, className: 'md:col-span-12' }] },
    ],
  },
  contact: {
    title: 'Help & contact',
    lists: [{ key: 'items', title: 'Cards', max: 4, blank: { icon: 'help', title: '', text: '', to: '/contact', cta: '', tone: 'sky' }, summary: (r) => r.title, fields: [{ key: 'icon', label: 'Icon', type: 'icon' }, { key: 'title', label: 'Title', max: 40 }, { key: 'text', label: 'Text', max: 120, className: 'md:col-span-12' }, LINK(), { key: 'cta', label: 'Link text', max: 30 }, { key: 'tone', label: 'Colour', type: 'tone', className: 'md:col-span-12' }] }],
  },
  about: { title: 'About the store', fields: [{ key: 'badge', label: 'Small badge', max: 60 }, { key: 'title', label: 'Heading', max: 120 }, { key: 'text', label: 'Text', type: 'textarea', className: 'md:col-span-12' }] },
};

const MOBILE_FORMS = {
  hero: { title: 'Banner slider', lists: [{ key: '', title: 'Slides', max: 6, blank: { title: '', subtitle: '', badge: '', tone: 'rose', to: '/shop', image: '' }, summary: (r) => r.title, fields: [{ key: 'title', label: 'Title', max: 40 }, { key: 'badge', label: 'Badge', max: 20 }, { key: 'subtitle', label: 'Subtitle', max: 80, className: 'md:col-span-12' }, LINK(), { key: 'image', label: 'Photo', type: 'image' }, { key: 'tone', label: 'Badge colour', type: 'tone', className: 'md:col-span-12' }] }], dataKey: 'heroSlides' },
  values: { title: 'Trust strip', lists: [{ key: '', title: 'Items', hint: 'Up to 5 short promises under the banner.', max: 5, blank: { icon: 'verified', text: '' }, summary: (r) => r.text, fields: [{ key: 'icon', label: 'Icon', type: 'icon' }, { key: 'text', label: 'Text', max: 24 }] }] },
  deal: { title: 'Top picks box', fields: [{ key: 'title', label: 'Title', max: 40 }, { key: 'subtitle', label: 'Subtitle', max: 60 }, LINK('“View all” link', 'link')], note: 'Shows 4 featured products (mark products as Featured in the catalogue).' },
  rails: { title: 'Product rows', lists: [{ key: '', title: 'Rows of products', max: 10, blank: { title: 'New row', subtitle: '', source: 'featured', category: '', link: '/shop' }, summary: (r) => r.title, fields: RAIL_FIELDS(false) }] },
  assurance: { title: 'Promise banner', fields: [{ key: 'title', label: 'Title', max: 40 }, { key: 'text', label: 'Text', max: 100 }] },
  departments: { title: 'Departments', note: 'Phones show the same department cards as the desktop homepage — edit them under Desktop → Departments.' },
};

/** Fields + lists for one section's content. */
function SectionForm({ form, value, onChange }) {
  return (
    <div className="flex flex-col gap-space-md">
      {form.note && <p className="text-body-sm text-on-surface-variant flex items-start gap-1.5"><Icon name="info" className="text-[18px] text-secondary shrink-0" /> {form.note}</p>}
      {form.fields && <Fields fields={form.fields} value={value} onChange={onChange} />}
      {(form.lists || []).map((l) => (
        <ItemList
          key={l.key || 'list'}
          title={l.title}
          hint={l.hint}
          max={l.max}
          blank={l.blank}
          summary={l.summary}
          fields={l.fields}
          rows={(l.key ? value?.[l.key] : value) || []}
          onChange={(rows) => onChange(l.key ? { ...value, [l.key]: rows } : rows)}
        />
      ))}
    </div>
  );
}

/** Admin → Settings → Homepage: section order and every text, picture and link, for desktop and phones. */
export function HomepagePanel({ value, onChange }) {
  const [view, setView] = useState('desktop');
  const [open, setOpen] = useState('hero');
  const hp = mergeHomepage(value);
  const v = hp[view];
  const setView_ = (patch) => onChange({ ...hp, [view]: { ...v, ...patch } });
  const forms = view === 'desktop' ? SECTION_FORMS : MOBILE_FORMS;
  const labels = view === 'desktop' ? DESKTOP_SECTIONS : MOBILE_SECTIONS;
  const dataKey = (k) => forms[k]?.dataKey || k;

  return (
    <Panel
      title="Homepage"
      action={value && <Button size="sm" variant="tonal" icon="restart_alt" onClick={() => window.confirm('Go back to the built-in homepage (desktop and phone)? Your changes are removed when you save.') && onChange(null)}>Use built-in</Button>}
    >
      <div className="flex flex-col gap-space-lg pt-space-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-body-sm text-on-surface-variant max-w-2xl">
            Choose which sections appear and in what order, then edit their words, pictures and links. Phones have their own layout. Banners, offers, coupons and reviews have their own pages in the sidebar.
          </p>
          <div className="inline-flex p-1 rounded-xl bg-surface-container-high" role="tablist" aria-label="Homepage view">
            {[['desktop', 'desktop_windows', 'Desktop'], ['mobile', 'smartphone', 'Phone']].map(([k, icon, l]) => (
              <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => { setView(k); setOpen(k === 'desktop' ? 'hero' : 'hero'); }} className={cn('h-9 px-3 rounded-lg text-body-sm font-semibold inline-flex items-center gap-1.5', view === k ? 'bg-secondary text-on-secondary' : 'text-on-surface-variant')}>
                <Icon name={icon} className="text-[18px]" /> {l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-label-lg mb-2">Sections, top to bottom</p>
          <SectionOrder sections={v.sections} labels={labels} onChange={(sections) => setView_({ sections })} />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-label-lg">Edit a section</p>
          {labels.filter(([k]) => forms[k]).map(([k, l]) => (
            <div key={k} className="rounded-xl border border-outline-variant/50 overflow-hidden">
              <button type="button" onClick={() => setOpen(open === k ? null : k)} aria-expanded={open === k} className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-surface-container-low hover:bg-surface-container text-left">
                <span className="text-body-md font-semibold">{forms[k].title || l}</span>
                <Icon name={open === k ? 'expand_less' : 'expand_more'} className="text-outline" />
              </button>
              {open === k && (
                <div className="p-4">
                  <SectionForm form={forms[k]} value={v[dataKey(k)]} onChange={(next) => setView_({ [dataKey(k)]: next })} />
                </div>
              )}
            </div>
          ))}
          <p className="text-body-sm text-outline">Sections without a form here (category circles, recently viewed, all products, reviews…) fill themselves from the catalogue, the shopper’s history and approved comments.</p>
        </div>
      </div>
    </Panel>
  );
}

/** Admin → Settings → Footer: link columns and social profiles. */
export function FooterPanel({ value, onChange, social, onSocial }) {
  const f = mergeFooter(value);
  const cols = f.columns;
  const setCols = (columns) => onChange({ ...f, columns });
  return (
    <>
      <Panel title="Footer links" action={value && <Button size="sm" variant="tonal" icon="restart_alt" onClick={() => onChange(null)}>Use built-in</Button>}>
        <div className="flex flex-col gap-space-md pt-space-md">
          <p className="text-body-sm text-on-surface-variant">Up to 4 columns of links at the bottom of every page. Company name, address, GSTIN, phone and email come from the <b>Store</b> tab.</p>
          {cols.map((col, ci) => (
            <div key={ci} className="p-space-sm rounded-xl border border-outline-variant/50 flex flex-col gap-2">
              <div className="flex items-end gap-2">
                <Field label={`Column ${ci + 1} heading`} className="flex-1"><Input value={col.title} maxLength={40} onChange={(e) => setCols(cols.map((c, x) => (x === ci ? { ...c, title: e.target.value } : c)))} /></Field>
                <button type="button" className="btn-icon hover:text-error mb-1" onClick={() => setCols(cols.filter((_, x) => x !== ci))} aria-label="Remove column"><Icon name="delete" /></button>
              </div>
              <ItemList
                title="Links"
                max={12}
                rows={col.links}
                blank={{ label: '', to: '/' }}
                summary={(r) => r.label && `${r.label} → ${r.to}`}
                fields={[{ key: 'label', label: 'Text', max: 40 }, LINK()]}
                onChange={(links) => setCols(cols.map((c, x) => (x === ci ? { ...c, links } : c)))}
              />
            </div>
          ))}
          <Button size="sm" variant="tonal" icon="add" disabled={cols.length >= 4} onClick={() => setCols([...cols, { title: 'New column', links: [] }])} className="self-start">Add column</Button>
        </div>
      </Panel>
      <Panel title="Social profiles">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md pt-space-md">
          {[['instagram', 'Instagram'], ['facebook', 'Facebook'], ['linkedin', 'LinkedIn']].map(([k, l]) => (
            <Field key={k} label={l} hint="Full https:// link — leave empty to hide">
              <Input value={social?.[k] || ''} maxLength={200} placeholder={`https://www.${k}.com/wildtane`} onChange={(e) => onSocial({ ...social, [k]: e.target.value.trim() })} />
            </Field>
          ))}
        </div>
      </Panel>
    </>
  );
}

export { BUILTIN_FOOTER };
