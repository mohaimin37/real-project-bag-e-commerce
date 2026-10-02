import { Link, useParams } from 'react-router-dom';
import { useConfig } from '../hooks/useStore';
import { formatINR } from '../lib/format';
import { Breadcrumbs } from '../components/ui';
import NotFound from './NotFound';
import Seo from '../components/Seo';

const PAGES = {
  shipping: {
    title: 'Global Delivery',
    body: (c) => [
      ['Where we ship', 'We deliver across India and to the UAE, Saudi Arabia, Qatar, Bahrain, Kuwait, Oman, the UK, the EU and the US.'],
      ['Delivery options', (c?.shippingMethods || []).map((m) => `${m.label}: ${m.eta} — ${m.price ? formatINR(m.price) : 'free'}`).join(' · ') || 'Standard and express options are shown at checkout.'],
      ['Free shipping', `Standard shipping is free on orders above ${formatINR(c?.freeShippingThreshold || 0)}.`],
      ['Duties & taxes', 'Domestic prices include GST. International orders may attract import duties payable on delivery.'],
    ],
  },
  returns: {
    title: 'Returns & Exchanges',
    body: () => [
      ['30-day returns', 'Unused items in original packaging can be returned within 30 days of delivery.'],
      ['How to return', 'Contact our care team with your order ID. We arrange a pickup and refund within 5–7 business days after inspection.'],
      ['Exchanges', 'Want a different colourway? We exchange free of charge, subject to stock.'],
    ],
  },
  warranty: {
    title: 'Lifetime Warranty',
    body: () => [
      ['What is covered', 'Manufacturing defects in zippers, seams, buckles, straps and hardware — for the life of the product.'],
      ['How claims work', 'Choose "Lifetime repair claim" on our contact form with your order ID and photos. We arrange a prepaid pickup.'],
      ['What is not covered', 'Normal wear and patina, accidental damage and misuse — though we will always offer an affordable repair.'],
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    body: () => [
      ['What we collect', 'Your name, contact details, addresses and order history — only what is needed to deliver your orders and support you.'],
      ['Payments', 'We never store card numbers. Online payments are processed by certified payment gateways.'],
      ['Your rights', 'You can update your details in your account or ask us to delete your data at any time.'],
    ],
  },
  terms: {
    title: 'Terms of Service',
    body: () => [
      ['Orders', 'An order is confirmed once our team verifies it. Prices are in INR and include applicable GST.'],
      ['Cancellations', 'Orders can be cancelled from your account until they are processed for dispatch.'],
      ['Liability', 'Our liability is limited to the value of the products purchased.'],
    ],
  },
  compliance: {
    title: 'Compliance & Ethics',
    body: () => [
      ['Supplier code', 'All workshops are audited annually for wages, safety and environmental standards.'],
      ['Materials', 'Recycled materials are GRS-certified; leather comes from LWG Gold-rated tanneries.'],
    ],
  },
};

export default function InfoPage() {
  const { slug } = useParams();
  const { data: config } = useConfig();
  const page = PAGES[slug];
  if (!page) return <NotFound />;
  return (
    <div className="container-x max-w-3xl py-space-xl flex flex-col gap-space-lg">
      <Seo title={page.title} description={`${page.title} at WILDTANE: ${page.body(config).map(([, p]) => p).join(' ').slice(0, 140)}`} canonical={`/pages/${slug}`} />
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: page.title }]} />
      <h1 className="text-headline-xl-mobile md:text-headline-xl">{page.title}</h1>
      {page.body(config).map(([h, p]) => (
        <section key={h} className="card p-space-lg">
          <h2 className="text-headline-sm mb-1">{h}</h2>
          <p className="text-body-md text-on-surface-variant">{p}</p>
        </section>
      ))}
      <p className="text-body-sm text-on-surface-variant">Still have questions? <Link to="/contact" className="text-secondary underline">Contact our care team</Link>.</p>
    </div>
  );
}
