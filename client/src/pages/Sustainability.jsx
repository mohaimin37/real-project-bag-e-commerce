import { Link } from 'react-router-dom';
import { Icon, Img } from '../components/ui';
import Seo from '../components/Seo';

const STATS = [
  ['58%', 'lower carbon output from recycled nylon'],
  ['4,000+', 'bags repaired free every year'],
  ['100%', 'carbon-neutral shipping'],
  ['0', 'products sent to landfill'],
];

export default function Sustainability() {
  return (
    <>
      <Seo title="Sustainability — Recycled Materials & Lifetime Repairs" description="Recycled ballistic nylon, LWG Gold vegetable-tanned leather, fair workshops and free lifetime repairs. How WILDTANE builds bags for decades, not seasons." canonical="/sustainability" image="/uploads/seed/apex-rain.jpg" />
      <section className="relative bg-ink text-on-ink overflow-hidden">
        <Img src="/uploads/seed/apex-rain.jpg" alt="" className="absolute inset-0 opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/20" />
        <div className="relative container-x py-24 lg:py-32 max-w-3xl">
          <span className="text-label-sm uppercase tracking-wider text-secondary-fixed">Circular lifecycle</span>
          <h1 className="text-headline-xl-mobile md:text-display-hero mt-2">Built for decades, not seasons.</h1>
          <p className="text-body-xl text-on-ink/80 mt-space-md">The most sustainable bag is the one you never have to replace. Every WILDTANE piece is designed to be repaired, re-used and eventually recycled.</p>
        </div>
      </section>
      <section className="container-x py-space-xl grid grid-cols-2 lg:grid-cols-4 gap-gutter">
        {STATS.map(([n, t]) => (
          <div key={t} className="card p-space-lg flex flex-col gap-1">
            <span className="text-headline-xl text-secondary">{n}</span>
            <span className="text-body-sm text-on-surface-variant">{t}</span>
          </div>
        ))}
      </section>
      <section className="container-x pb-space-xl grid grid-cols-1 md:grid-cols-2 gap-gutter-lg items-center">
        <Img src="/uploads/seed/tote-teal.jpg" alt="Vegetable-tanned leather tote" className="aspect-square rounded-3xl shadow-lift" />
        <div className="flex flex-col gap-space-md">
          {[
            ['recycling', 'Recycled ballistic nylon', 'Our 840D and 1000D shells are woven from reclaimed post-industrial fishing nets and plastic yarn, certified to the Global Recycled Standard.'],
            ['cruelty_free', 'Vegetable-tanned leather', 'Hides from LWG Gold-rated tanneries, tanned with tree bark and mimosa extracts — no chrome, no heavy metals.'],
            ['handshake', 'Fair facilities', 'ISO-14001 workshops paying audited living wages, with solar-powered tooling.'],
            ['construction', 'Free lifetime repairs', 'Zipper, seam or hardware — we fix it free, forever, with prepaid pickup.'],
          ].map(([icon, t, d]) => (
            <div key={t} className="flex gap-3">
              <span className="w-11 h-11 rounded-xl bg-secondary-container text-on-secondary-fixed flex items-center justify-center shrink-0"><Icon name={icon} /></span>
              <div><h3 className="text-headline-sm">{t}</h3><p className="text-body-sm text-on-surface-variant">{d}</p></div>
            </div>
          ))}
          <div className="flex gap-space-sm pt-space-sm">
            <Link to="/shop" className="btn-primary">Shop responsibly</Link>
            <Link to="/blog" className="btn-tonal">Read the journal</Link>
          </div>
        </div>
      </section>
    </>
  );
}
