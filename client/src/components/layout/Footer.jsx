import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { useConfig } from '../../hooks/useStore';
import { Icon, Spinner } from '../ui';
import { BrandLogo } from '../Brand';
import { CurrencySelect } from './Header';

// Flipkart-style footer: link columns on the left, "Mail us" and "Registered office" on the right.
const COLUMNS = [
  {
    title: 'Shop',
    links: [
      ['/men', 'Men'],
      ['/women', 'Women'],
      ['/unisex', 'Unisex'],
      ['/shop?newArrival=true&sort=newest', 'New Arrivals'],
      ['/shop?bestseller=true&sort=bestseller', 'Best Sellers'],
      ['/offers', 'Offers'],
    ],
  },
  {
    title: 'About',
    links: [
      ['/contact', 'Contact Us'],
      ['/about', 'About Us'],
      ['/corporate', 'Corporate Orders'],
      ['/blog', 'Journal'],
      ['/csr-policy', 'CSR'],
    ],
  },
  {
    title: 'Help',
    links: [
      ['/help#payments', 'Payments'],
      ['/shipping-policy', 'Shipping'],
      ['/return-policy#order-cancellation', 'Cancellation & Returns'],
      ['/account/orders', 'Track Order'],
      ['/faq', 'FAQ'],
      ['/help', 'Help Centre'],
    ],
  },
  {
    title: 'Consumer Policy',
    links: [
      ['/return-policy', 'Return Policy'],
      ['/terms-and-conditions', 'Terms of Use'],
      ['/privacy-policy', 'Privacy'],
      ['/privacy-policy#grievance-officer', 'Grievance Redressal'],
      ['/policies', 'All Policies'],
    ],
  },
];

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

/** "Mail us" / "Registered office" block: the company name and address from Admin → Settings. */
function AddressBlock({ title, config, children }) {
  const address = config?.businessAddress?.trim();
  return (
    <div className="flex flex-col gap-1">
      <p className={heading}>{title}</p>
      <address className="not-italic text-[13px] leading-relaxed text-on-band">
        WILDTANE Private Limited
        {address ? <span className="block whitespace-pre-line">{address}</span> : <span className="block text-on-band/55">Address coming soon</span>}
        {children}
      </address>
    </div>
  );
}

export default function Footer() {
  const { data: config } = useConfig();
  const phone = config?.supportPhone;
  const payments = (config?.paymentMethods || []).filter((m) => m.available);
  return (
    // Deep shade of the theme's brand colour (dark, so the gold logo, telephone and email stand out).
    <footer className="mt-6 text-on-band pb-16 md:pb-0" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, rgb(var(--c-secondary)) 30%, rgb(var(--c-band))), color-mix(in srgb, rgb(var(--c-secondary)) 14%, rgb(var(--c-band))))' }}>
      <div className="container-x py-8 md:py-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-[repeat(4,minmax(0,1fr))_1px_minmax(0,1.3fr)_minmax(0,1.3fr)] gap-x-6 gap-y-8">
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className="flex flex-col gap-2">
            <p className={heading}>{col.title}</p>
            {col.links.map(([to, label]) => (
              <Link key={label} to={to} className={link}>{label}</Link>
            ))}
          </nav>
        ))}
        {/* Thin divider between the link columns and the addresses (desktop only), as on Flipkart. */}
        <span aria-hidden="true" className="hidden lg:block bg-on-band/20" />
        <div className="col-span-2 sm:col-span-2 lg:col-span-1 flex flex-col gap-5">
          <AddressBlock title="Mail us" config={config} />
          <div className="flex flex-col gap-2">
            <p className={heading}>Newsletter</p>
            <Newsletter />
          </div>
        </div>
        <div className="col-span-2 sm:col-span-2 lg:col-span-1 flex flex-col gap-5">
          <AddressBlock title="Registered office address" config={config}>
            {phone && (
              <span className="block mt-1">
                Telephone: <a href={`tel:${phone.replace(/\s/g, '')}`} className="text-accent hover:underline">{phone}</a>
              </span>
            )}
            {config?.supportEmail && (
              <span className="block">
                Email: <a href={`mailto:${config.supportEmail}`} className="text-accent hover:underline">{config.supportEmail}</a>
              </span>
            )}
          </AddressBlock>
          <Link to="/" className="w-fit" aria-label="WILDTANE home">
            <BrandLogo className="h-10" alt="WILDTANE" tone="gold" />
          </Link>
        </div>
      </div>
      <div className="border-t border-on-band/15">
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
            <span className="text-on-band/70">© {new Date().getFullYear()} WILDTANE Private Limited</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Only the payment methods checkout offers right now (Admin → Settings → Payments). */}
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
