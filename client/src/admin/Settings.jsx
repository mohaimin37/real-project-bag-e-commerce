import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { cn, formatINR } from '../lib/format';
import { Button, ErrorState, Field, Icon, Input, PageLoader, Textarea, Toggle } from '../components/ui';
import { PageHeader, Panel } from './kit';

const TABS = [
  ['store', 'storefront', 'Store'],
  ['tax', 'percent', 'Tax & shipping'],
  ['payments', 'payments', 'Payments'],
  ['currencies', 'currency_exchange', 'Currencies'],
  ['integrations', 'hub', 'Integrations'],
];

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
      const { storeName, supportEmail, supportPhone, businessAddress, gstin, announcement, taxRate, taxLabel, pricesIncludeTax, freeShippingThreshold, codEnabled, codMaxOrder, shippingMethods, currencies, social } = s;
      await adminApi.updateSettings({ storeName, supportEmail, supportPhone, businessAddress: businessAddress || '', gstin: gstin || '', announcement, taxRate, taxLabel, pricesIncludeTax, freeShippingThreshold, codEnabled, codMaxOrder, shippingMethods, currencies, social });
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
        <nav className="card p-2 flex lg:flex-col overflow-x-auto scrollbar-none" aria-label="Settings sections">
          {TABS.map(([k, icon, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-sm whitespace-nowrap', tab === k ? 'bg-primary text-on-primary' : 'hover:bg-surface-container-low')}>
              <Icon name={icon} className="text-[20px]" /> {label}
            </button>
          ))}
        </nav>
        <div className="lg:col-span-3 flex flex-col gap-space-md">
          {tab === 'store' && (
            <Panel title="Store details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <Field label="Store name"><Input value={s.storeName} onChange={(e) => set('storeName', e.target.value)} /></Field>
                <Field label="Support email"><Input type="email" value={s.supportEmail} onChange={(e) => set('supportEmail', e.target.value)} /></Field>
                <Field label="Support phone"><Input value={s.supportPhone} onChange={(e) => set('supportPhone', e.target.value)} /></Field>
                <Field label="GSTIN" hint="Printed on customer bills"><Input className="uppercase" maxLength={15} value={s.gstin || ''} onChange={(e) => set('gstin', e.target.value)} placeholder="27ABCDE1234F1Z5" /></Field>
                <Field label="Business address" className="md:col-span-2" hint="Printed on customer bills"><Textarea rows={2} maxLength={300} value={s.businessAddress || ''} onChange={(e) => set('businessAddress', e.target.value)} placeholder="Shop no., street, city, state, PIN" /></Field>
                <Field label="Announcement bar" className="md:col-span-2" hint="Shown at the top of every page"><Input value={s.announcement} maxLength={200} onChange={(e) => set('announcement', e.target.value)} /></Field>
                {['instagram', 'facebook', 'linkedin'].map((k) => (
                  <Field key={k} label={`${k[0].toUpperCase()}${k.slice(1)} URL`}><Input value={s.social?.[k] || ''} onChange={(e) => set('social', { ...s.social, [k]: e.target.value })} /></Field>
                ))}
              </div>
            </Panel>
          )}

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
