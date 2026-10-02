import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { Icon, Spinner } from '../ui';

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      ['/shop', 'All Products'],
      ['/shop?bestseller=true&sort=bestseller', 'Best Sellers'],
      ['/shop?newArrival=true&sort=newest', 'New Arrivals'],
      ['/shop?featured=true', 'Trending'],
      ['/offers', 'Archival Offers'],
    ],
  },
  {
    title: 'Travel & Utility',
    links: [
      ['/shop/cabin-luggage', 'Cabin Luggage'],
      ['/shop/tech-briefcases', 'Tech Briefcases'],
      ['/shop/waterproof-commuters', 'Waterproof Commuters'],
      ['/shop/daypacks', 'Daypacks'],
      ['/shop/accessories', 'Modular Pouches'],
    ],
  },
  {
    title: 'Customer Support',
    links: [
      ['/account/orders', 'Track Order'],
      ['/pages/shipping', 'Global Delivery'],
      ['/pages/returns', 'Returns & Exchanges'],
      ['/pages/warranty', 'Lifetime Warranty'],
      ['/contact', 'Repair Service'],
    ],
  },
  {
    title: 'Corporate Bulk',
    links: [
      ['/corporate', 'Corporate Gifting'],
      ['/corporate', 'B2B Volume Orders'],
      ['/corporate', 'Custom Embossing'],
      ['/blog', 'The Journal'],
    ],
  },
];

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
    <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
      <label htmlFor="newsletter" className="sr-only">Email address</label>
      <input
        id="newsletter"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        className="h-10 px-3 rounded-lg bg-white/10 text-on-ink placeholder:text-on-ink/50 text-body-sm focus:outline-none focus:ring-2 focus:ring-secondary-fixed-dim"
      />
      <button type="submit" disabled={state === 'loading'} className="h-10 rounded-lg bg-secondary text-on-secondary text-label-md hover:brightness-110 transition flex items-center justify-center gap-2">
        {state === 'loading' ? <Spinner /> : state === 'done' ? <Icon name="check" className="text-[18px]" /> : null}
        {state === 'done' ? 'Subscribed' : 'Subscribe'}
      </button>
    </form>
  );
}

export default function Footer() {
  return (
    <footer className="bg-ink text-on-ink">
      <div className="container-x py-space-xl lg:py-16 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-gutter-lg">
        <div className="col-span-2 md:col-span-3 lg:col-span-1 flex flex-col gap-space-md">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="h-7 invert" />
            <span className="text-headline-sm uppercase tracking-tight">WILDTANE</span>
          </Link>
          <p className="text-body-sm text-on-ink/70">Rugged architectural utility designed for uncompromising global journeys and modular city living.</p>
          <span className="inline-flex items-center gap-1 w-fit px-2.5 py-1 rounded bg-white/10 text-label-sm">
            <Icon name="eco" className="text-[14px] text-secondary-fixed-dim" /> Certified B-Corp Impact
          </span>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title} className="flex flex-col gap-space-sm">
            <span className="text-label-sm uppercase tracking-wider text-on-ink/60">{col.title}</span>
            {col.links.map(([to, label]) => (
              <Link key={label} to={to} className="text-body-sm text-on-ink/80 hover:text-secondary-fixed-dim transition-colors">
                {label}
              </Link>
            ))}
          </div>
        ))}
        <div className="col-span-2 md:col-span-1 flex flex-col gap-space-sm">
          <span className="text-label-sm uppercase tracking-wider text-on-ink/60">Newsletter</span>
          <p className="text-body-sm text-on-ink/80">Early access drops, field reports, and material explorations.</p>
          <Newsletter />
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x py-space-md flex flex-col md:flex-row items-center justify-between gap-space-md text-label-sm font-normal text-on-ink/60">
          <div className="flex flex-wrap items-center justify-center gap-x-space-md gap-y-1">
            <span>© {new Date().getFullYear()} WILDTANE Goods Co. All rights reserved.</span>
            <Link to="/pages/privacy" className="hover:text-on-ink">Privacy Policy</Link>
            <Link to="/pages/terms" className="hover:text-on-ink">Terms of Service</Link>
            <Link to="/pages/compliance" className="hover:text-on-ink">Compliance & Ethics</Link>
          </div>
          <div className="flex items-center gap-2">
            {['Cash on Delivery', 'UPI', 'Visa / MC', 'RuPay'].map((p) => (
              <span key={p} className="px-2 py-1 rounded bg-white/10">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
