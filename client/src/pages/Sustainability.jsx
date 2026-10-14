import { Link } from 'react-router-dom';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import Seo from '../components/Seo';
import { Icon } from '../components/ui';
import BrandValues from '../components/BrandValues';

const CSR_PILLARS = [
  {
    icon: 'eco',
    title: 'Environmental Policy',
    badge: 'Carbon Conscious',
    color: 'from-emerald-500/15 via-teal-500/5 to-transparent border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    description:
      'We minimize industrial runoff and energy usage across our workshops. All production patterns are CAD-optimized to cut textile and leather scrap waste by over 34% compared to traditional cutting.',
  },
  {
    icon: 'inventory_2',
    title: 'Sustainable Packaging',
    badge: '100% Recyclable Paper',
    color: 'from-indigo-500/15 via-violet-500/5 to-transparent border-indigo-500/30 text-indigo-600 dark:text-indigo-400',
    description:
      'WILDTANE packages every delivery in unbleached FSC-certified kraft cardboard, soy-based vegetable inks, and water-activated paper tape. Zero single-use plastic bubble mailers.',
  },
  {
    icon: 'handshake',
    title: 'Ethical Sourcing & Fair Wages',
    badge: 'Artisan Welfare',
    color: 'from-sky-500/15 via-blue-500/5 to-transparent border-sky-500/30 text-sky-600 dark:text-sky-400',
    description:
      'Every master craftsman and artisan in our partner workshops works under safe, air-conditioned, well-lit conditions with above-market living wages, health coverage, and zero child labor tolerance.',
  },
  {
    icon: 'recycling',
    title: 'Recycled Ocean PET Linings',
    badge: 'rPET Certified',
    color: 'from-teal-500/15 via-cyan-500/5 to-transparent border-teal-500/30 text-teal-600 dark:text-teal-400',
    description:
      'The silky, durable ripstop inner linings of our laptop bags and backpacks are woven from 100% recycled post-consumer plastic bottles, diverting plastic from Indian shorelines and landfills.',
  },
  {
    icon: 'published_with_changes',
    title: 'Repair & Circularity Program',
    badge: 'Lifetime Repairability',
    color: 'from-purple-500/15 via-indigo-500/5 to-transparent border-purple-500/30 text-purple-600 dark:text-purple-400',
    description:
      'Instead of planned obsolescence, we engineer modular stress seams, replaceable YKK zipper sliders, and removable strap carabiners so products can be repaired rather than discarded.',
  },
  {
    icon: 'flag',
    title: 'CSR & Community Goals',
    badge: '2026–2030 Roadmap',
    color: 'from-rose-500/15 via-pink-500/5 to-transparent border-rose-500/30 text-rose-600 dark:text-rose-400',
    description:
      'A percentage of each corporate and retail purchase supports educational supply packs for underprivileged artisan communities across Karnataka and Rajasthan.',
  },
];

export default function Sustainability() {
  const crumbs = [
    { label: 'Home', to: '/' },
    { label: 'About', to: '/about' },
    { label: 'Sustainability & CSR' },
  ];

  return (
    <div className="container-x py-space-lg max-w-5xl min-h-[70vh]">
      <Seo
        title="Sustainability & CSR Policy — WILDTANE"
        description="Learn about WILDTANE's commitment to ethical sourcing, zero single-use plastic packaging, recycled PET linings, and artisan community welfare."
        canonical="/sustainability"
      />
      <Breadcrumbs items={crumbs} className="mb-4" />

      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto mb-space-xl">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-2">
          <Icon name="spa" className="text-[16px]" /> Conscious Luxury Carry
        </span>
        <h1 className="text-display-sm sm:text-display-md font-black text-on-surface">
          Sustainability & CSR Policy
        </h1>
        <p className="text-body-lg text-on-surface-variant mt-2 leading-relaxed">
          At WILDTANE, luxury is not measured only by aesthetic elegance, but by the integrity with which our products are sourced, crafted, and delivered.
        </p>
      </div>

      {/* Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-space-xl">
        {CSR_PILLARS.map((p) => (
          <div
            key={p.title}
            className={`p-6 rounded-3xl border bg-gradient-to-br flex flex-col justify-between shadow-xs ${p.color}`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="w-12 h-12 rounded-2xl bg-surface/85 flex items-center justify-center shadow-xs">
                  <Icon name={p.icon} className="text-[26px]" />
                </span>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-surface border border-outline-variant/30 text-on-surface">
                  {p.badge}
                </span>
              </div>
              <h2 className="text-headline-sm font-black text-on-surface">{p.title}</h2>
              <p className="text-body-sm text-on-surface-variant mt-2.5 leading-relaxed">
                {p.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Measurable Targets Section */}
      <div className="card p-6 sm:p-10 mb-space-xl bg-surface-container-low border border-outline-variant/30 rounded-3xl">
        <h2 className="text-headline-md font-black text-on-surface mb-2">Our 2026–2027 Sustainability Targets</h2>
        <p className="text-body-md text-on-surface-variant mb-6 max-w-2xl">
          Concrete, accountable milestones we benchmark each quarter across material procurement and fulfillment operations:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 text-center">
            <span className="font-display text-3xl font-black text-emerald-600 dark:text-emerald-400">100%</span>
            <p className="text-label-md font-bold text-on-surface mt-1">Recycled Packaging</p>
            <p className="text-body-xs text-outline mt-0.5">Zero non-biodegradable plastics in outbound customer parcels</p>
          </div>
          <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 text-center">
            <span className="font-display text-3xl font-black text-indigo-600 dark:text-indigo-400">85%+</span>
            <p className="text-label-md font-bold text-on-surface mt-1">Recycled Linings</p>
            <p className="text-body-xs text-outline mt-0.5">Post-consumer PET textile conversion across entire catalogue</p>
          </div>
          <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 text-center">
            <span className="font-display text-3xl font-black text-sky-600 dark:text-sky-400">0%</span>
            <p className="text-label-md font-bold text-on-surface mt-1">Hazardous Chemicals</p>
            <p className="text-body-xs text-outline mt-0.5">Compliant with REACH and heavy-metal free hardware finishing</p>
          </div>
        </div>
      </div>

      <BrandValues className="mb-space-xl" />

      {/* Call to Action */}
      <div className="text-center py-6 border-t border-surface-container-high flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-headline-sm font-bold text-on-surface text-left">Have questions or want to partner?</h3>
          <p className="text-body-sm text-on-surface-variant text-left">We welcome audits, corporate inquiries, and sustainable partnerships.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/corporate" className="btn-tonal text-xs px-4 py-2.5 rounded-xl font-bold">
            Corporate & Bulk
          </Link>
          <Link to="/contact" className="btn-primary text-xs px-4 py-2.5 rounded-xl font-bold">
            Contact Team
          </Link>
        </div>
      </div>
    </div>
  );
}
