import { cn } from '../lib/format';
import { Icon } from './ui';

// "Why choose us" cards, shared by the About page and the homepage. Edit the copy here.
export const VALUES = [
  ['workspace_premium', 'Premium Quality', 'Sturdy materials, strong stitching and dependable zips and hardware, checked before every bag ships.'],
  ['auto_awesome', 'Stylish Designs', 'Clean, modern shapes that look as good at the office as they do on a weekend away.'],
  ['verified_user', 'Secure Shopping', 'Encrypted checkout, verified accounts and trusted payment options, including cash on delivery.'],
  ['local_shipping', 'Fast Delivery', 'Orders are packed promptly and tracked from our door to yours, with live status in your account.'],
  ['support_agent', 'Customer Support', 'Real people ready to help with sizing, orders, returns and anything in between.'],
];

// Each card gets its own colour; translucent tints so they read in light and dark mode.
const TONES = [
  { card: 'bg-indigo-500/10 ring-indigo-500/30', icon: 'bg-indigo-600' },
  { card: 'bg-rose-500/10 ring-rose-500/30', icon: 'bg-rose-600' },
  { card: 'bg-sky-500/10 ring-sky-500/30', icon: 'bg-sky-600' },
  { card: 'bg-emerald-500/10 ring-emerald-500/30', icon: 'bg-emerald-600' },
  { card: 'bg-violet-500/10 ring-violet-500/30', icon: 'bg-violet-600' },
];

export default function BrandValues({ className, title = 'Why choose WILDTANE', eyebrow = 'Our promise', as: Heading = 'h2' }) {
  return (
    <section className={cn('container-x', className)} aria-labelledby="values-title">
      <div className="flex flex-col items-center text-center gap-2 mb-6 md:mb-8">
        <span className="eyebrow">{eyebrow}</span>
        <Heading id="values-title" className="font-display text-[26px] md:text-[34px] leading-tight">{title}</Heading>
      </div>
      <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 md:gap-4">
        {VALUES.map(([icon, heading, text], i) => (
          <li
            key={heading}
            className={cn(
              'group relative flex flex-col gap-3 p-4 md:p-5 rounded-2xl ring-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift',
              TONES[i % TONES.length].card,
              // Odd card out spans the row on phones so the grid stays even.
              i === VALUES.length - 1 && 'col-span-2 md:col-span-1'
            )}
          >
            <span className={cn('w-11 h-11 rounded-xl text-white flex items-center justify-center transition-transform duration-300 group-hover:scale-110', TONES[i % TONES.length].icon)}>
              <Icon name={icon} className="text-[22px]" />
            </span>
            <h3 className="text-[15px] md:text-[16px] font-semibold">{heading}</h3>
            <p className="text-[12.5px] md:text-[13px] leading-relaxed text-on-surface-variant">{text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
