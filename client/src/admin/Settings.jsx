import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { cn, formatINR } from '../lib/format';
import { Button, ErrorState, Field, Icon, Input, PageLoader, Textarea, Toggle } from '../components/ui';
import { PageHeader, Panel } from './kit';
import { ThemePreview } from '../components/theme/ThemePanel';
import { ALL_THEME_IDS, CUSTOM_THEME, DEFAULT_MODE, DEFAULT_THEME, THEMES } from '../theme/themes';

const TABS = [
  ['store', 'storefront', 'Store'],
  ['appearance', 'palette', 'Appearance'],
  ['tax', 'percent', 'Tax & shipping'],
  ['payments', 'payments', 'Payments'],
  ['loyalty', 'savings', 'Loyalty coins'],
  ['currencies', 'currency_exchange', 'Currencies'],
  ['integrations', 'hub', 'Integrations'],
];

const LOYALTY_DEFAULTS = { enabled: true, coinsPer100: 5, rupeesPerCoin: 1, maxRedeemPercent: 50 };
const APPEARANCE_DEFAULTS = { defaultTheme: DEFAULT_THEME, defaultMode: DEFAULT_MODE, enabledThemes: ALL_THEME_IDS };
const THEME_LABEL = (id) => (id === CUSTOM_THEME ? 'Custom' : THEMES[id].name);

/** Store-wide look: what first-time visitors see, and which themes shoppers may choose. */
function AppearancePanel({ value, onChange }) {
  const a = { ...APPEARANCE_DEFAULTS, ...value };
  const set = (patch) => onChange({ ...a, ...patch });
  const toggleTheme = (id, on) => {
    const enabledThemes = on ? ALL_THEME_IDS.filter((t) => t === id || a.enabledThemes.includes(t)) : a.enabledThemes.filter((t) => t !== id);
    if (!enabledThemes.length) return;
    set({ enabledThemes, defaultTheme: enabledThemes.includes(a.defaultTheme) ? a.defaultTheme : enabledThemes[0] });
  };
  return (
    <Panel title="Store appearance">
      <div className="flex flex-col gap-space-lg">
        <p className="text-body-sm text-on-surface-variant">
          First-time visitors see the default appearance and theme. Shoppers can change both for themselves from the <Icon name="palette" className="text-[16px] align-[-3px]" /> button in the header; their choice is saved on their device.
        </p>
        <div>
          <p className="text-label-lg mb-2">Default appearance</p>
          <div className="grid grid-cols-2 gap-2 max-w-sm" role="radiogroup" aria-label="Default appearance">
            {[['light', 'light_mode', 'Light'], ['dark', 'dark_mode', 'Dark']].map(([m, icon, label]) => (
              <button key={m} type="button" role="radio" aria-checked={a.defaultMode === m} onClick={() => set({ defaultMode: m })} className={cn('flex items-center gap-2 h-11 px-3 rounded-xl border', a.defaultMode === m ? 'border-secondary bg-secondary/10 font-semibold' : 'border-outline-variant hover:bg-surface-container-low')}>
                <Icon name={icon} className="text-[20px]" /> {label}
                {a.defaultMode === m && <Icon name="check_circle" fill className="ml-auto text-secondary text-[18px]" />}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-label-lg mb-1">Themes</p>
          <p className="text-body-sm text-on-surface-variant mb-3">Switch off any theme you don't want shoppers to pick. Tap <b>Make default</b> to choose what first-time visitors see.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-space-sm">
            {ALL_THEME_IDS.map((id) => {
              const always = THEMES[id]?.alwaysOn;
              const on = always || a.enabledThemes.includes(id);
              const isDefault = a.defaultTheme === id;
              return (
                <div key={id} className={cn('flex flex-col gap-2 p-2 rounded-xl border-2', isDefault ? 'border-secondary' : 'border-surface-container-high', !on && 'opacity-60')}>
                  <ThemePreview themeId={id} mode={a.defaultMode} className="aspect-[16/9]" />
                  <div className="flex items-center gap-2 px-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-label-lg flex items-center gap-1.5">
                        {THEME_LABEL(id)}
                        {isDefault && <span className="text-label-sm px-1.5 py-0.5 rounded bg-secondary text-on-secondary">Default</span>}
                      </p>
                      <p className="text-[12px] text-on-surface-variant truncate">{id === CUSTOM_THEME ? 'Shoppers pick their own colours' : always ? 'Accessibility theme, always available' : THEMES[id].tagline}</p>
                    </div>
                    <Toggle checked={on} disabled={always || (on && a.enabledThemes.length === 1)} onChange={(v) => toggleTheme(id, v)} />
                  </div>
                  {!isDefault && on && id !== CUSTOM_THEME && (
                    <button type="button" className="btn-tonal btn-sm" onClick={() => set({ defaultTheme: id, enabledThemes: a.enabledThemes.includes(id) ? a.enabledThemes : [...a.enabledThemes, id] })}>Make default</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-body-sm text-on-surface-variant">Theme colours are set in <code>client/src/theme/themes.js</code> — every theme has a light and a dark version and is checked for readable contrast automatically.</p>
      </div>
    </Panel>
  );
}

export default function Settings() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('store');
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  const query = useQuery({ queryKey: ['admin', 'settings'], queryFn: adminApi.settings, select: (d) => d.settings });
  const dash = useQuery({ queryKey: ['admin', 'dashboard', 30], queryFn: () => adminApi.dashboard(30), select: (d) => d.alerts });
  useEffect(() => {
    if (query.data) setS(structuredClone(query.data));
  }, [query.data]);

  if (query.isLoading || !s) return query.isError ? <ErrorState error={query.error} onRetry={query.refetch} /> : <PageLoader />;
  const set = (k, v) => setS({ ...s, [k]: v });
  const dirty = JSON.stringify(s) !== JSON.stringify(query.data);

  const save = async () => {
    setSaving(true);
    try {
      const { storeName, supportEmail, supportPhone, businessAddress, supportHours, grievanceOfficer, gstin, announcement, taxRate, taxLabel, pricesIncludeTax, freeShippingThreshold, codEnabled, codMaxOrder, shippingMethods, currencies, loyalty, appearance } = s;
      await adminApi.updateSettings({ storeName, supportEmail, supportPhone, businessAddress: businessAddress || '', supportHours: supportHours || '', grievanceOfficer: { name: '', designation: '', email: '', phone: '', ...grievanceOfficer }, gstin: gstin || '', announcement, taxRate, taxLabel, pricesIncludeTax, freeShippingThreshold, codEnabled, codMaxOrder, shippingMethods, currencies, loyalty: { ...LOYALTY_DEFAULTS, ...loyalty }, appearance: { ...APPEARANCE_DEFAULTS, ...appearance } });
      toast.success('Settings saved');
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
      qc.invalidateQueries({ queryKey: ['config'] });
    } catch (err) {
      toast.error(err.details?.[0] ? `${err.details[0].field}: ${err.details[0].message}` : err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateRow = (key, i, patch) => set(key, s[key].map((r, x) => (x === i ? { ...r, ...patch } : r)));

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Store-wide configuration. Changes apply to the storefront immediately."
        actions={
          <>
            {dirty && <Button variant="tonal" onClick={() => setS(structuredClone(query.data))}>Discard</Button>}
            <Button icon="save" disabled={!dirty} loading={saving} onClick={save}>Save settings</Button>
          </>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-space-md items-start">
        <nav className="card surface-card border border-outline-variant/60 p-2 flex lg:flex-col overflow-x-auto scrollbar-none" aria-label="Settings sections">
          {TABS.map(([k, icon, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-sm whitespace-nowrap transition-colors', tab === k ? 'bg-secondary text-on-secondary font-semibold shadow-sm' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface')}>
              <Icon name={icon} className="text-[20px]" /> {label}
            </button>
          ))}
        </nav>
        <div className="lg:col-span-3 flex flex-col gap-space-md">
          {tab === 'store' && (
            <Panel title="Store details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <Field label="Store name"><Input value={s.storeName} onChange={(e) => set('storeName', e.target.value)} /></Field>
                <Field label="Company legal name" hint="Appears on bills and legal policies"><Input value={s.companyName || ''} onChange={(e) => set('companyName', e.target.value)} placeholder="WILDTANE PRIVATE LIMITED" /></Field>
                <Field label="Support email"><Input type="email" value={s.supportEmail} onChange={(e) => set('supportEmail', e.target.value)} /></Field>
                <Field label="Support phone"><Input value={s.supportPhone} onChange={(e) => set('supportPhone', e.target.value)} /></Field>
                <Field label="GSTIN" hint="Printed on customer bills"><Input className="uppercase" maxLength={15} value={s.gstin || ''} onChange={(e) => set('gstin', e.target.value)} placeholder="27ABCDE1234F1Z5" /></Field>
                <Field label="Registered office address" className="md:col-span-2" hint="Shown on the Contact page, footer and policies, and printed on customer bills"><Textarea rows={2} maxLength={300} value={s.businessAddress || ''} onChange={(e) => set('businessAddress', e.target.value)} placeholder="Shop no., street, city, state, PIN" /></Field>
                <Field label="Customer care hours" className="md:col-span-2" hint="Shown on the Contact page"><Input value={s.supportHours || ''} maxLength={120} onChange={(e) => set('supportHours', e.target.value)} placeholder="Monday to Saturday, 10:00 am – 6:00 pm" /></Field>
                <Field label="Announcement bar" className="md:col-span-2" hint="Shown at the top of every page"><Input value={s.announcement} maxLength={200} onChange={(e) => set('announcement', e.target.value)} /></Field>
              </div>
            </Panel>
          )}
          {tab === 'store' && (
            <Panel title="Grievance Officer">
              <p className="text-body-sm text-on-surface-variant mb-space-md">
                Indian e-commerce rules require the name and contact details of a Grievance Officer to be shown to customers. These appear on the Contact page and in the Privacy Policy. Email falls back to the support email if left empty.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                {[
                  ['name', 'Full name', 'e.g. Priya Sharma'],
                  ['designation', 'Designation', 'Grievance Officer'],
                  ['email', 'Email', s.supportEmail],
                  ['phone', 'Phone', '+91 …'],
                ].map(([k, label, placeholder]) => (
                  <Field key={k} label={label}>
                    <Input type={k === 'email' ? 'email' : 'text'} value={s.grievanceOfficer?.[k] || ''} maxLength={80} placeholder={placeholder} onChange={(e) => set('grievanceOfficer', { ...s.grievanceOfficer, [k]: e.target.value })} />
                  </Field>
                ))}
              </div>
            </Panel>
          )}

          {tab === 'appearance' && <AppearancePanel value={s.appearance} onChange={(v) => set('appearance', v)} />}

          {tab === 'tax' && (
            <>
              <Panel title="Tax">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md items-end">
                  <Field label="Tax label"><Input value={s.taxLabel} onChange={(e) => set('taxLabel', e.target.value)} /></Field>
                  <Field label="Rate (%)"><Input type="number" min={0} max={100} step="0.01" value={s.taxRate} onChange={(e) => set('taxRate', Number(e.target.value))} /></Field>
                  <div className="pb-2"><Toggle checked={s.pricesIncludeTax} onChange={(v) => set('pricesIncludeTax', v)} label="Prices include tax" /></div>
                </div>
                <p className="text-body-sm text-on-surface-variant mt-space-sm">
                  {s.pricesIncludeTax ? `A ₹1,000 product shows ${formatINR(1000 - 1000 / (1 + s.taxRate / 100))} ${s.taxLabel} included in its price.` : `${s.taxLabel} of ${s.taxRate}% is added on top of product prices at checkout.`}
                </p>
              </Panel>
              <Panel title="Shipping" action={<Button size="sm" variant="tonal" icon="add" onClick={() => set('shippingMethods', [...s.shippingMethods, { code: `method${s.shippingMethods.length + 1}`, label: 'New method', description: '', eta: '3–5 business days', price: 0, freeEligible: false }])}>Add method</Button>}>
                <Field label="Free shipping threshold (₹)" hint="Applies to methods marked “free eligible”" className="max-w-xs mb-space-md">
                  <Input type="number" min={0} value={s.freeShippingThreshold} onChange={(e) => set('freeShippingThreshold', Number(e.target.value))} />
                </Field>
                <div className="flex flex-col gap-space-sm">
                  {s.shippingMethods.map((m, i) => (
                    <div key={i} className="grid grid-cols-2 md:grid-cols-12 gap-2 p-space-sm rounded-xl bg-surface-container-low items-end">
                      <Field label="Code" className="md:col-span-2"><Input value={m.code} onChange={(e) => updateRow('shippingMethods', i, { code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })} /></Field>
                      <Field label="Label" className="md:col-span-3"><Input value={m.label} onChange={(e) => updateRow('shippingMethods', i, { label: e.target.value })} /></Field>
                      <Field label="ETA" className="md:col-span-2"><Input value={m.eta} onChange={(e) => updateRow('shippingMethods', i, { eta: e.target.value })} /></Field>
                      <Field label="Price ₹" className="md:col-span-2"><Input type="number" min={0} value={m.price} onChange={(e) => updateRow('shippingMethods', i, { price: Number(e.target.value) })} /></Field>
                      <div className="md:col-span-2 pb-2"><Toggle checked={m.freeEligible} onChange={(v) => updateRow('shippingMethods', i, { freeEligible: v })} label="Free eligible" /></div>
                      <button type="button" disabled={s.shippingMethods.length === 1} onClick={() => set('shippingMethods', s.shippingMethods.filter((_, x) => x !== i))} className="btn-icon hover:text-error md:col-span-1 justify-self-end" aria-label="Remove method"><Icon name="delete" /></button>
                      <Field label="Description" className="col-span-2 md:col-span-12"><Input value={m.description} onChange={(e) => updateRow('shippingMethods', i, { description: e.target.value })} /></Field>
                    </div>
                  ))}
                </div>
              </Panel>
            </>
          )}

          {tab === 'payments' && (
            <Panel title="Payment methods">
              <div className="flex flex-col gap-space-md">
                <div className="flex items-center justify-between gap-4 p-space-md rounded-xl bg-surface-container-low">
                  <div className="flex items-center gap-3">
                    <Icon name="payments" className="text-secondary" />
                    <div><p className="text-label-lg">Cash on Delivery</p><p className="text-body-sm text-on-surface-variant">Customers pay the courier at delivery.</p></div>
                  </div>
                  <Toggle checked={s.codEnabled} onChange={(v) => set('codEnabled', v)} />
                </div>
                <Field label="COD maximum order value (₹)" hint="0 = no limit" className="max-w-xs"><Input type="number" min={0} value={s.codMaxOrder} onChange={(e) => set('codMaxOrder', Number(e.target.value))} /></Field>
                {[['credit_card', 'Cards'], ['account_balance', 'UPI / Net Banking'], ['contactless', 'Apple Pay / Google Pay']].map(([icon, label]) => (
                  <div key={label} className="flex items-center justify-between gap-4 p-space-md rounded-xl border border-dashed border-outline-variant opacity-80">
                    <div className="flex items-center gap-3"><Icon name={icon} className="text-outline" /><p className="text-label-lg">{label}</p></div>
                    <span className="text-label-sm px-2 py-0.5 rounded bg-surface-container-highest">Gateway not connected</span>
                  </div>
                ))}
                <p className="text-body-sm text-on-surface-variant">Online gateways plug into <code>server/src/services/payment.service.js</code>. Card data is never stored on this server.</p>
              </div>
            </Panel>
          )}

          {tab === 'loyalty' && (() => {
            const l = { ...LOYALTY_DEFAULTS, ...s.loyalty };
            const setL = (patch) => set('loyalty', { ...l, ...patch });
            const earn = Math.floor(2500 / 100) * l.coinsPer100;
            return (
              <Panel title="Loyalty coins">
                <div className="flex flex-col gap-space-md">
                  <div className="flex items-center justify-between gap-4 p-space-md rounded-xl bg-surface-container-low">
                    <div className="flex items-center gap-3">
                      <Icon name="savings" className="text-secondary" />
                      <div><p className="text-label-lg">WILDTANE Coins</p><p className="text-body-sm text-on-surface-variant">Shoppers earn coins on every order and spend them as a discount next time.</p></div>
                    </div>
                    <Toggle checked={l.enabled} onChange={(v) => setL({ enabled: v })} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                    <Field label="Coins earned per ₹100" hint="Counted on the item total actually paid (not shipping)"><Input type="number" min={0} max={100} value={l.coinsPer100} onChange={(e) => setL({ coinsPer100: Number(e.target.value) })} /></Field>
                    <Field label="Value of 1 coin (₹)" hint="Discount each coin gives at checkout"><Input type="number" min={0.01} step="0.01" value={l.rupeesPerCoin} onChange={(e) => setL({ rupeesPerCoin: Number(e.target.value) })} /></Field>
                    <Field label="Max % of an order paid with coins" hint="Keeps part of every order paid in money"><Input type="number" min={1} max={100} value={l.maxRedeemPercent} onChange={(e) => setL({ maxRedeemPercent: Number(e.target.value) })} /></Field>
                  </div>
                  <p className="p-space-sm rounded-lg bg-secondary/10 text-body-sm">
                    Example: a <b>₹2,500</b> order earns <b>{earn} coins</b> (worth {formatINR(earn * l.rupeesPerCoin)}). On a later ₹2,500 order the shopper can use up to <b>{Math.floor((2500 * l.maxRedeemPercent) / 100 / l.rupeesPerCoin)} coins</b>.
                    Coins are added when the order is placed; if it is cancelled or returned, coins used come back and coins earned are removed.
                  </p>
                  <p className="text-body-sm text-on-surface-variant">To give or take back coins for one customer, open them in <b>Customers → Full profile</b>.</p>
                </div>
              </Panel>
            );
          })()}
          {tab === 'currencies' && (
            <Panel title="Display currencies" action={<Button size="sm" variant="tonal" icon="add" onClick={() => set('currencies', [...s.currencies, { code: 'NEW', symbol: '', label: 'New currency', rate: 1 }])}>Add currency</Button>}>
              <p className="text-body-sm text-on-surface-variant mb-space-md">Shoppers can browse in these currencies. Rate = units per ₹1. Orders are always charged in INR.</p>
              <div className="flex flex-col gap-2">
                {s.currencies.map((c, i) => (
                  <div key={i} className="grid grid-cols-2 md:grid-cols-12 gap-2 items-end p-space-sm rounded-xl bg-surface-container-low">
                    <Field label="Code" className="md:col-span-2"><Input value={c.code} maxLength={3} onChange={(e) => updateRow('currencies', i, { code: e.target.value.toUpperCase() })} /></Field>
                    <Field label="Symbol" className="md:col-span-2"><Input value={c.symbol} onChange={(e) => updateRow('currencies', i, { symbol: e.target.value })} /></Field>
                    <Field label="Label" className="md:col-span-4"><Input value={c.label} onChange={(e) => updateRow('currencies', i, { label: e.target.value })} /></Field>
                    <Field label="Rate per ₹1" className="md:col-span-3"><Input type="number" step="0.0001" min={0} value={c.rate} disabled={c.code === 'INR'} onChange={(e) => updateRow('currencies', i, { rate: Number(e.target.value) })} /></Field>
                    <button type="button" disabled={c.code === 'INR'} onClick={() => set('currencies', s.currencies.filter((_, x) => x !== i))} className="btn-icon hover:text-error md:col-span-1 justify-self-end" aria-label="Remove currency"><Icon name="delete" /></button>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {tab === 'integrations' && (
            <Panel title="Integrations">
              <div className="flex flex-col gap-space-md">
                {[
                  ['chat', 'WhatsApp Cloud API', dash.data?.whatsappConfigured, 'New-order alerts are sent to the admin WhatsApp number.', 'Alerts are logged to the server console. Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID and ADMIN_WHATSAPP_NUMBER in server/.env.'],
                  ['cloud', 'Cloudinary', dash.data?.cloudinaryConfigured, 'Uploads are stored on Cloudinary.', 'Uploads are stored in server/uploads. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to switch.'],
                ].map(([icon, name, ok, yes, no]) => (
                  <div key={name} className="flex items-start gap-3 p-space-md rounded-xl bg-surface-container-low">
                    <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', ok ? 'bg-secondary text-on-secondary' : 'bg-tertiary-fixed text-tertiary-container')}><Icon name={icon} /></span>
                    <div>
                      <p className="text-label-lg flex items-center gap-2">{name} <span className={cn('text-label-sm px-2 py-0.5 rounded-full', ok ? 'bg-secondary-container text-on-secondary-fixed' : 'bg-tertiary-fixed text-tertiary-container')}>{ok ? 'Connected' : 'Fallback mode'}</span></p>
                      <p className="text-body-sm text-on-surface-variant">{ok ? yes : no}</p>
                    </div>
                  </div>
                ))}
                <p className="text-body-sm text-on-surface-variant">API credentials live only in server environment variables and are never sent to the browser.</p>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
