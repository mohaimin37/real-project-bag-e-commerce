import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { useConfig } from '../../hooks/useStore';
import { Icon, Spinner } from '../ui';
import { LogoMark } from '../Brand';
import { CurrencySelect } from './Header';
import { useFooterContent } from '../../content/homepage';

// Flipkart-style footer: link columns on the left, "Mail us" and "Registered office" on the right.
// Columns are edited in Admin → Settings → Footer (built-in ones in content/homepage.js).

const heading = 'text-[12px] font-semibold uppercase tracking-wider text-on-band/55 mb-1';
const link = 'w-fit text-[13px] font-medium text-on-band hover:underline underline-offset-2';

function Newsletter() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle');
  const submit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Enter a valid email address');
      return;
    }
    setState('loading');
    try {
      const res = await api.subscribe(email);
      toast.success(res.message);
      setEmail('');
      setState('done');
    } catch (err) {
      toast.error(err.message);
      setState('idle');
    }
  };
  return (
    <form onSubmit={submit} className="flex gap-1.5" noValidate>
      <label htmlFor="newsletter" className="sr-only">Email address</label>
      <input id="newsletter" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" className="input h-9 min-w-0 bg-surface-container-lowest text-on-surface" />
      <button type="submit" disabled={state === 'loading'} className="h-9 px-3 shrink-0 rounded-lg bg-on-band text-band text-[12px] font-semibold flex items-center gap-1 hover:opacity-90">
        {state === 'loading' ? <Spinner /> : state === 'done' ? <Icon name="check" className="text-[16px]" /> : null}
        {state === 'done' ? 'Done' : 'Subscribe'}
      </button>
    </form>
  );
}

/** "Mail us" / "Registered office" block: the company name and address. */
function AddressBlock({ title, config, children }) {
  const address = config?.businessAddress?.trim() || 'Paharganj , New Delhi , 110055';
  const companyName = config?.companyName || 'WILDTANE PRIVATE LIMITED';
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className={heading}>{title}</h3>
      <address className="not-italic text-[13px] leading-relaxed text-on-band">
        <h4 className="font-bold text-sm tracking-wide text-on-band uppercase">{companyName}</h4>
        <span className="block whitespace-pre-line mt-1 text-on-band/90">{address}</span>
        {children}
      </address>
    </div>
  );
}

export default function Footer() {
  const { data: config } = useConfig();
  const phone = config?.supportPhone || '8920550465';
  const email = config?.supportEmail || 'info@wildtane.com';
  const company = config?.companyName || 'WILDTANE PRIVATE LIMITED';
  const payments = (config?.paymentMethods || []).filter((m) => m.available);
  const { columns } = useFooterContent();
  // Only the social profiles filled in under Admin → Settings → Footer.
  const socials = [
    ['instagram', 'Instagram', 'photo_camera'],
    ['facebook', 'Facebook', 'thumb_up'],
    ['linkedin', 'LinkedIn', 'work'],
  ].filter(([k]) => /^https:\/\//.test(config?.social?.[k] || ''));
  return (
    <footer className="mt-6 text-on-band pb-20 md:pb-0" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, rgb(var(--c-secondary)) 30%, rgb(var(--c-band))), color-mix(in srgb, rgb(var(--c-secondary)) 14%, rgb(var(--c-band))))' }}>
      {/* ── DESKTOP FOOTER (UNTOUCHED, IDENTICAL ON LAPTOPS) ── */}
      <div className="hidden md:grid container-x py-8 md:py-10 grid-cols-2 sm:grid-cols-4 lg:grid-cols-[repeat(4,minmax(0,1fr))_1px_minmax(0,1.3fr)_minmax(0,1.3fr)] gap-x-6 gap-y-8">
        {columns.slice(0, 4).map((col, i) => (
          <nav key={`${i}-${col.title}`} aria-label={col.title} className="flex flex-col gap-2">
            <h3 className={heading}>{col.title}</h3>
            {(col.links || []).filter((l) => l.label && l.to).map((l, x) => (
              <Link key={x} to={l.to} className={link}>{l.label}</Link>
            ))}
          </nav>
        ))}
        {/* Thin divider between the link columns and the addresses (desktop only), as on Flipkart. */}
        <span aria-hidden="true" className="hidden lg:block bg-on-band/20" />
        <div className="col-span-2 sm:col-span-2 lg:col-span-1 flex flex-col gap-5">
          <AddressBlock title="Mail us" config={config} />
          <div className="flex flex-col gap-2">
            <h3 className={heading}>Newsletter</h3>
            <Newsletter />
          </div>
        </div>
        <div className="col-span-2 sm:col-span-2 lg:col-span-1 flex flex-col gap-5">
          <AddressBlock title="Registered office address" config={config}>
            <p className="block text-[13px] text-on-band/90 mt-1.5 font-medium">
              GSTIN: <span className="font-mono font-bold text-accent">{config?.gstin || '07AAECW3767F1Z4'}</span>
            </p>
            <p className="block text-[13px] text-on-band/90 mt-1">
              Telephone: <a href={`tel:${phone.replace(/\s/g, '')}`} className="text-accent hover:underline font-semibold">{phone}</a>
            </p>
            <p className="block text-[13px] text-on-band/90 mt-0.5">
              Email: <a href={`mailto:${email}`} className="text-accent hover:underline">{email}</a>
            </p>
          </AddressBlock>
          {socials.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {socials.map(([k, label, icon]) => (
                <a key={k} href={config.social[k]} target="_blank" rel="noopener noreferrer" className="h-8 px-3 rounded-full bg-on-band/10 ring-1 ring-on-band/20 text-[12px] font-semibold inline-flex items-center gap-1.5 hover:bg-on-band/20">
                  <Icon name={icon} className="text-[16px]" /> {label}
                </a>
              ))}
            </div>
          )}
          <Link to="/" className="flex items-center gap-2.5 w-fit mt-1" aria-label="WILDTANE home">
            <LogoMark className="w-8 h-8 shrink-0" tone="gold" />
            <h2 className="font-serif tracking-widest font-black text-2xl text-on-band uppercase select-none">
              WILDTANE
            </h2>
          </Link>
        </div>
      </div>

      {/* ── MOBILE FOOTER (FLIPKART STYLE: CLEAN, COMPACT, USER ATTRACTIVE) ── */}
      <div className="md:hidden px-3 pt-6 pb-4 flex flex-col gap-4">
        {/* Flipkart 4 Trust Badges */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-on-band/5 border border-on-band/15 flex items-center gap-2">
            <Icon name="verified" className="text-[20px] text-amber-400 shrink-0" />
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-bold text-on-band">100% Original</span>
              <span className="text-[9.5px] text-on-band/75">Direct from Maker</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-on-band/5 border border-on-band/15 flex items-center gap-2">
            <Icon name="assignment_return" className="text-[20px] text-emerald-400 shrink-0" />
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-bold text-on-band">7 Days Returns</span>
              <span className="text-[9.5px] text-on-band/75">Hassle-Free Exchange</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-on-band/5 border border-on-band/15 flex items-center gap-2">
            <Icon name="local_shipping" className="text-[20px] text-sky-400 shrink-0" />
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-bold text-on-band">Fast Delivery</span>
              <span className="text-[9.5px] text-on-band/75">Tracked Across India</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-on-band/5 border border-on-band/15 flex items-center gap-2">
            <Icon name="lock" className="text-[20px] text-rose-400 shrink-0" />
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-bold text-on-band">Secure Checkout</span>
              <span className="text-[9.5px] text-on-band/75">UPI & Cards</span>
            </div>
          </div>
        </div>

        {/* 1-Tap WhatsApp & Call Support */}
        <div className="grid grid-cols-2 gap-2">
          <a
            href="https://wa.me/918920550465"
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 px-3 rounded-xl bg-emerald-600 text-white font-bold text-[11.5px] flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-transform"
          >
            <Icon name="chat" className="text-[16px]" /> WhatsApp Help
          </a>
          <a
            href={`tel:${phone.replace(/\s/g, '')}`}
            className="h-10 px-3 rounded-xl bg-on-band/10 border border-on-band/20 text-on-band font-bold text-[11.5px] flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-transform"
          >
            <Icon name="call" className="text-[16px] text-amber-400" /> Call Support
          </a>
        </div>

        {/* Quick Links Pills */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11.5px] text-on-band/85 font-medium pt-2 border-t border-on-band/15">
          <Link to="/track" className="hover:underline">Track Order</Link>
          <Link to="/returns-exchange" className="hover:underline">Returns</Link>
          <Link to="/shipping-policy" className="hover:underline">Shipping</Link>
          <Link to="/privacy-policy" className="hover:underline">Privacy</Link>
          <Link to="/terms" className="hover:underline">Terms</Link>
          <Link to="/about" className="hover:underline">About</Link>
        </div>

        {/* Brand & Copyright */}
        <div className="text-center pt-2">
          <div className="inline-flex items-center gap-1.5 mb-1">
            <LogoMark className="w-5 h-5 shrink-0" tone="gold" />
            <span className="font-serif tracking-widest font-bold text-[13px] text-on-band uppercase">
              WILDTANE
            </span>
          </div>
          <p className="text-[10px] text-on-band/70">© {new Date().getFullYear()} {company}</p>
          <p className="text-[9px] text-on-band/60">Paharganj, New Delhi 110055 • GSTIN: {config?.gstin || '07AAECW3767F1Z4'}</p>
        </div>
      </div>

      {/* Desktop Bottom Strip */}
      <div className="hidden md:block border-t border-on-band/15">
        <div className="container-x py-4 flex flex-col lg:flex-row items-center justify-between gap-3 text-[13px]">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {[
              ['/corporate', 'business_center', 'Corporate Orders'],
              ['/offers', 'redeem', 'Offers'],
              ['/help', 'help', 'Help Centre'],
            ].map(([to, icon, label]) => (
              <Link key={to} to={to} className="inline-flex items-center gap-1.5 font-medium hover:underline underline-offset-2">
                <Icon name={icon} className="text-[18px] text-on-band/80" /> {label}
              </Link>
            ))}
            <span className="text-on-band/70">© {new Date().getFullYear()} {company}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {payments.length > 0 && (
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-on-band/70">We accept</span>
                {payments.map((m) => (
                  <span key={m.code} className="h-6 px-2 rounded bg-on-band/10 ring-1 ring-on-band/20 text-[11px] font-semibold inline-flex items-center gap-1">
                    <Icon name={m.icon || 'payments'} className="text-[14px] text-on-band/80" /> {m.label}
                  </span>
                ))}
              </span>
            )}
            <CurrencySelect className="text-on-band/80" optionClassName="bg-surface-container-lowest text-on-surface" />
          </div>
        </div>
      </div>
    </footer>
  );
}
