import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useConfig } from '../hooks/useStore';
import { cn } from '../lib/format';
import { Breadcrumbs, EmptyState, Icon } from '../components/ui';
import Seo, { breadcrumbLd } from '../components/Seo';
import { FAQ, HELP_FOOTNOTE, HELP_INTRO, SUPPORT, TIPS, TROUBLESHOOTING } from '../content/help';

const fillEmail = (text, config) => text.replaceAll('{{supportEmail}}', config?.supportEmail || 'info@wildtane.com');
const textOf = (item) => [item.q, item.a, ...(item.blocks || []).flatMap((b) => [b.label, ...(b.list || []), ...(b.p || [])])].filter(Boolean).join(' ').toLowerCase();

/** What checkout accepts right now (from store settings), so the FAQ never over-promises. */
function livePayments(config) {
  const methods = config?.paymentMethods || [];
  const on = methods.filter((m) => m.available).map((m) => m.label);
  const soon = methods.filter((m) => !m.available).map((m) => m.label);
  if (!on.length) return null;
  return `On this website right now: ${on.join(', ')}.${soon.length ? ` ${soon.join(', ')} coming soon.` : ''}`;
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="relative block w-full max-w-xl">
      <span className="sr-only">{placeholder}</span>
      <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-outline" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 pl-11 pr-4 rounded-xl bg-surface-container-lowest text-on-surface text-[15px] ring-1 ring-black/[0.06] dark:ring-white/[0.08] focus:outline-none focus:ring-2 focus:ring-secondary"
      />
    </label>
  );
}

/** One question: native <details> (keyboard and screen-reader friendly, works without JavaScript). */
function Accordion({ title, children, open }) {
  return (
    <details open={open} className="group rounded-xl bg-surface-container-lowest ring-1 ring-black/[0.04] dark:ring-white/[0.05] open:shadow-card">
      <summary className="flex items-center justify-between gap-3 cursor-pointer list-none px-4 md:px-5 py-3.5 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
        {title}
        <Icon name="expand_more" className="text-[20px] text-outline shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 md:px-5 pb-4 -mt-1 flex flex-col gap-2.5 text-[14px] leading-relaxed text-on-surface-variant">{children}</div>
    </details>
  );
}

function Blocks({ blocks, config }) {
  return blocks.map((b, i) => (
    <div key={i} className="flex flex-col gap-1.5">
      {b.label && <p className="text-[12px] font-semibold uppercase tracking-wider text-on-surface">{b.label}</p>}
      {b.p?.map((t) => <p key={t}>{fillEmail(t, config)}</p>)}
      {b.list && (
        <ul className="flex flex-col gap-1.5">
          {b.list.map((t) => (
            <li key={t} className="flex gap-2">
              <Icon name="check_circle" className="text-[17px] text-secondary mt-0.5 shrink-0" />
              <span>{fillEmail(t, config)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  ));
}

function ContactCard({ config }) {
  const email = config?.supportEmail || 'info@wildtane.com';
  return (
    <section aria-labelledby="support-title" className="rounded-2xl bg-band text-on-band ring-1 ring-accent/30 p-5 md:p-7 grid md:grid-cols-[1fr_auto] gap-5 items-center">
      <div className="flex flex-col gap-2">
        <h2 id="support-title" className="font-display text-[24px] md:text-[28px] leading-tight">Still need help?</h2>
        <p className="text-[14px] text-on-band/75">
          Email <a href={`mailto:${email}`} className="text-accent font-semibold underline underline-offset-2">{email}</a>. Response time: {SUPPORT.responseTime}.
        </p>
        <p className="text-[13px] text-on-band/60">Please always share: {SUPPORT.share.join(' · ')}.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={`mailto:${email}`} className="btn bg-accent text-on-accent hover:brightness-105"><Icon name="mail" className="text-[18px]" /> Email us</a>
        <Link to="/contact" className="btn border border-on-band/25 text-on-band hover:bg-on-band/10">Contact form</Link>
      </div>
    </section>
  );
}

function Tips() {
  return (
    <section aria-labelledby="tips-title" className="flex flex-col gap-3">
      <h2 id="tips-title" className="text-[18px] font-semibold">Important tips</h2>
      <ul className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {TIPS.map(([icon, text]) => (
          <li key={text} className="flex flex-col gap-2 p-4 rounded-2xl bg-surface-container-lowest ring-1 ring-black/[0.04] dark:ring-white/[0.05]">
            <span className="w-10 h-10 rounded-xl bg-band text-accent flex items-center justify-center"><Icon name={icon} className="text-[20px]" /></span>
            <span className="text-[13px] leading-snug">{text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** /help: troubleshooting guide with search and topic shortcuts. */
export default function HelpCentre() {
  const { data: config } = useConfig();
  const { hash } = useLocation();
  // Links like /help#payments (footer) open at that topic.
  useEffect(() => {
    if (!hash) return undefined;
    const t = setTimeout(() => document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    return () => clearTimeout(t);
  }, [hash]);
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const sections = useMemo(
    () => TROUBLESHOOTING.map((s) => ({ ...s, items: query ? s.items.filter((it) => textOf(it).includes(query)) : s.items })).filter((s) => s.items.length),
    [query]
  );
  const crumbs = [{ label: 'Home', to: '/' }, { label: 'Help Centre' }];

  return (
    <div className="container-x max-w-5xl py-6 md:py-10 flex flex-col gap-8">
      <Seo title="Help Centre — Payments, Delivery, Returns & Account" description="Fix common issues with payments, delivery, damaged or wrong products, returns, refunds and account sign-in at WILDTANE." canonical="/help" jsonLd={breadcrumbLd(crumbs)} />
      <Breadcrumbs items={crumbs} />

      <header className="flex flex-col gap-3">
        <span className="eyebrow">Help Centre</span>
        <h1 className="text-[32px] md:text-[44px] leading-tight">How can we help?</h1>
        <p className="text-body-md text-on-surface-variant max-w-2xl">{HELP_INTRO}</p>
        <SearchBox value={q} onChange={setQ} placeholder="Search: refund, delivery, payment…" />
      </header>

      {!query && (
        <nav aria-label="Help topics" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {TROUBLESHOOTING.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="group flex flex-col gap-2 p-4 rounded-2xl bg-surface-container-lowest ring-1 ring-black/[0.04] dark:ring-white/[0.05] hover:shadow-lift transition-shadow">
              <Icon name={s.icon} className="text-[24px] text-secondary" />
              <span className="text-[13px] font-semibold leading-tight">{s.title}</span>
            </a>
          ))}
          <Link to="/faq" className="flex flex-col gap-2 p-4 rounded-2xl bg-band text-on-band ring-1 ring-accent/30 hover:shadow-lift transition-shadow">
            <Icon name="quiz" className="text-[24px] text-accent" />
            <span className="text-[13px] font-semibold leading-tight">FAQs</span>
          </Link>
        </nav>
      )}

      {sections.length === 0 ? (
        <EmptyState icon="search_off" title="No matching help topics" description="Try another word, browse the FAQs, or email us." action={<Link to="/faq" className="btn-tonal">Browse FAQs</Link>} />
      ) : (
        sections.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-24 flex flex-col gap-2.5" aria-labelledby={`${s.id}-title`}>
            <h2 id={`${s.id}-title`} className="flex items-center gap-2 text-[19px] md:text-[21px] font-semibold">
              <Icon name={s.icon} className="text-[22px] text-secondary" /> {s.title}
            </h2>
            {s.items.map((it) => (
              <Accordion key={it.q} title={it.q} open={Boolean(query)}>
                <Blocks blocks={it.blocks} config={config} />
              </Accordion>
            ))}
          </section>
        ))
      )}

      <Tips />
      <ContactCard config={config} />
      <p className="text-[12px] text-outline">
        {HELP_FOOTNOTE} See also our <Link to="/return-policy" className="underline">Return, Refund & Exchange Policy</Link> and <Link to="/shipping-policy" className="underline">Shipping & Delivery Policy</Link>.
      </p>
    </div>
  );
}

/** /faq: grouped questions, with FAQPage structured data for search engines. */
export function FaqPage() {
  const { data: config } = useConfig();
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const answer = (it) => [fillEmail(it.a, config), it.live === 'payments' ? livePayments(config) : null].filter(Boolean).join(' ');
  const groups = useMemo(
    () => FAQ.map((g) => ({ ...g, items: query ? g.items.filter((it) => textOf(it).includes(query)) : g.items })).filter((g) => g.items.length),
    [query]
  );
  const crumbs = [{ label: 'Home', to: '/' }, { label: 'Help Centre', to: '/help' }, { label: 'FAQs' }];
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.flatMap((g) => g.items).map((it) => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: answer(it) } })),
  };

  return (
    <div className="container-x max-w-5xl py-6 md:py-10 flex flex-col gap-8">
      <Seo title="Frequently Asked Questions" description="Answers about ordering, payments, delivery times, returns, exchanges, refunds and your WILDTANE account." canonical="/faq" jsonLd={[breadcrumbLd(crumbs), faqLd]} />
      <Breadcrumbs items={crumbs} />

      <header className="flex flex-col gap-3">
        <span className="eyebrow">FAQs</span>
        <h1 className="text-[32px] md:text-[44px] leading-tight">Frequently asked questions</h1>
        <SearchBox value={q} onChange={setQ} placeholder="Search the FAQs…" />
      </header>

      {!query && (
        <nav aria-label="FAQ topics" className="flex gap-2 overflow-x-auto scrollbar-none -mx-3 px-3 md:mx-0 md:px-0 md:flex-wrap">
          {FAQ.map((g) => (
            <a key={g.id} href={`#${g.id}`} className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-surface-container-lowest ring-1 ring-black/[0.06] dark:ring-white/[0.08] text-[13px] font-medium hover:ring-secondary">
              <Icon name={g.icon} className="text-[16px] text-secondary" /> {g.title}
            </a>
          ))}
        </nav>
      )}

      {groups.length === 0 ? (
        <EmptyState icon="search_off" title="No matching questions" description="Try another word or visit the Help Centre." action={<Link to="/help" className="btn-tonal">Help Centre</Link>} />
      ) : (
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-8">
          {groups.map((g) => (
            <section key={g.id} id={g.id} className="scroll-mt-24 flex flex-col gap-2.5" aria-labelledby={`faq-${g.id}`}>
              <h2 id={`faq-${g.id}`} className="flex items-center gap-2 text-[18px] font-semibold">
                <Icon name={g.icon} className="text-[20px] text-secondary" /> {g.title}
              </h2>
              {g.items.map((it) => (
                <Accordion key={it.q} title={it.q} open={Boolean(query)}>
                  <p>{answer(it)}</p>
                </Accordion>
              ))}
            </section>
          ))}
        </div>
      )}

      <ContactCard config={config} />
      <p className={cn('text-[12px] text-outline')}>
        Can't find your answer? Try the <Link to="/help" className="underline">Help Centre troubleshooting guide</Link>.
      </p>
    </div>
  );
}
