import { useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useConfig } from '../hooks/useStore';
import { cn, formatINR } from '../lib/format';
import { Breadcrumbs, Icon } from '../components/ui';
import Seo, { breadcrumbLd } from '../components/Seo';
import { COMPANY, POLICIES, POLICY_LAST_UPDATED, policyBySlug } from '../content/policies';
import NotFound from './NotFound';

const anchor = (heading) => heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Fills {{tokens}} from store settings; a missing contact setting becomes a [PLACEHOLDER]. */
function fill(text, config) {
  const methods = (config?.shippingMethods || []).map((m) => `${m.label}: ${m.eta}${m.price ? ` (${formatINR(m.price)})` : ' (free)'}`);
  const address = config?.businessAddress?.trim();
  const values = {
    storeName: config?.storeName || 'WILDTANE',
    supportEmail: config?.supportEmail || '[SUPPORT EMAIL]',
    supportPhone: config?.supportPhone || '[CONTACT NUMBER]',
    businessAddress: address || '[BUSINESS ADDRESS]',
    // Address phrases simply drop out while no business address is set in Admin → Settings.
    addressSuffix: address ? `, ${address}` : '',
    writeToUs: address ? `, or write to us at ${address}` : '',
    supportHours: config?.supportHours || '[CUSTOMER CARE HOURS]',
    grievanceName: config?.grievanceOfficer?.name ? `${config.grievanceOfficer.name}, ${config.grievanceOfficer.designation || 'Grievance Officer'}` : '[GRIEVANCE OFFICER NAME]',
    grievanceEmail: config?.grievanceOfficer?.email || config?.supportEmail || '[SUPPORT EMAIL]',
    grievancePhone: config?.grievanceOfficer?.phone || config?.supportPhone || '[CONTACT NUMBER]',
    taxLabel: config?.taxLabel || 'GST',
    freeShippingThreshold: config?.freeShippingThreshold ? formatINR(config.freeShippingThreshold) : '[FREE SHIPPING THRESHOLD]',
    shippingOptions: methods.length ? `Current options: ${methods.join('; ')}.` : '',
    freeShippingLine: config?.freeShippingThreshold ? `Standard shipping is free on orders above ${formatINR(config.freeShippingThreshold)}.` : '',
  };
  return text.replace(/\{\{(\w+)\}\}/g, (m, key) => values[key] ?? m).replace(/\s{2,}/g, ' ').trim();
}

/** Highlights [PLACEHOLDERS] so they are easy to find and replace before launch. */
function Text({ children }) {
  return children.split(/(\[[^\]]+\])/g).map((part, i) =>
    /^\[[^\]]+\]$/.test(part) ? (
      <mark key={i} title="Placeholder: replace this in client/src/content/policies.js" className="bg-[#f6e3a6] text-[#3a2a00] rounded px-1 py-px font-medium">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

const plain = (s) => s.replace(/\s*\[[^\]]+\]/g, '').replace(/\s{2,}/g, ' ').trim();

function PolicyNav({ active }) {
  return (
    <nav aria-label="Policies" className="flex flex-col gap-0.5">
      {POLICIES.map((p) => (
        <NavLink
          key={p.slug}
          to={`/${p.slug}`}
          className={cn(
            'flex items-center gap-2.5 px-3 h-10 rounded-lg text-[13px] transition-colors',
            active === p.slug ? 'bg-secondary/10 text-secondary font-semibold' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          )}
        >
          <Icon name={p.icon} className="text-[18px]" /> {p.short}
        </NavLink>
      ))}
    </nav>
  );
}

function HelpCard({ config }) {
  return (
    <aside className="rounded-2xl bg-inverse-surface text-inverse-on-surface p-5 md:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <span className="w-11 h-11 rounded-full bg-inverse-on-surface/10 flex items-center justify-center shrink-0">
        <Icon name="support_agent" className="text-[22px]" />
      </span>
      <div className="flex-1">
        <h2 className="text-[16px] font-semibold">Still have a question?</h2>
        <p className="text-[13px] opacity-80">
          Our care team is happy to help{config?.supportEmail ? <> at <a href={`mailto:${config.supportEmail}`} className="underline underline-offset-2">{config.supportEmail}</a></> : null}.
        </p>
      </div>
      <Link to="/contact" className="btn bg-inverse-on-surface text-inverse-surface hover:opacity-90 shrink-0">Contact us</Link>
    </aside>
  );
}

export function PoliciesIndex() {
  const { data: config } = useConfig();
  return (
    <div className="container-x max-w-5xl py-6 md:py-10 flex flex-col gap-6">
      <Seo title="Store Policies" description="Returns, replacements, shipping, cancellations, refunds, privacy and terms at WILDTANE, all in one place." canonical="/policies" jsonLd={breadcrumbLd([{ label: 'Home', to: '/' }, { label: 'Policies' }])} />
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Policies' }]} />
      <header className="flex flex-col gap-2 max-w-2xl">
        <span className="eyebrow">Help centre</span>
        <h1 className="text-[30px] md:text-[40px] leading-tight">Store policies</h1>
        <p className="text-body-md text-on-surface-variant">Everything about returns, delivery, cancellations, refunds and how we look after your data.</p>
      </header>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {POLICIES.map((p) => (
          <li key={p.slug}>
            <Link to={`/${p.slug}`} className="group h-full flex flex-col gap-3 p-5 rounded-2xl bg-surface-container-lowest ring-1 ring-black/[0.04] dark:ring-white/[0.05] hover:shadow-lift transition-shadow">
              <span className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                <Icon name={p.icon} className="text-[20px]" />
              </span>
              <span className="text-[16px] font-semibold flex items-center gap-1">
                {p.title}
                <Icon name="arrow_forward" className="text-[16px] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </span>
              <span className="text-[13px] text-on-surface-variant line-clamp-3">{plain(fill(p.description, config))}</span>
            </Link>
          </li>
        ))}
      </ul>
      <HelpCard config={config} />
    </div>
  );
}

export default function Policy({ slug }) {
  const { data: config } = useConfig();
  const { hash } = useLocation();
  const policy = policyBySlug(slug);
  // Links like /return-policy#refund-policy open at that section.
  useEffect(() => {
    if (!hash) return undefined;
    const t = setTimeout(() => document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    return () => clearTimeout(t);
  }, [hash, slug]);
  if (!policy) return <NotFound />;
  const crumbs = [{ label: 'Home', to: '/' }, { label: 'Policies', to: '/policies' }, { label: policy.title }];
  const description = plain(fill(policy.description, config));

  return (
    <div className="container-x max-w-6xl py-6 md:py-10">
      <Seo title={policy.title} description={description} canonical={`/${policy.slug}`} jsonLd={breadcrumbLd(crumbs)} />
      <Breadcrumbs items={crumbs} />

      {/* Phones: other policies as a sideways-scrolling row. */}
      <div className="lg:hidden flex gap-2 overflow-x-auto scrollbar-none -mx-3 px-3 mt-4">
        {POLICIES.map((p) => (
          <Link
            key={p.slug}
            to={`/${p.slug}`}
            className={cn('shrink-0 h-8 px-3 rounded-full text-[12px] font-medium inline-flex items-center border', p.slug === slug ? 'bg-on-surface text-surface-container-lowest border-on-surface' : 'bg-surface-container-lowest border-surface-container-high')}
          >
            {p.short}
          </Link>
        ))}
      </div>

      <div className="mt-5 lg:mt-8 grid lg:grid-cols-[230px_1fr] gap-8 items-start">
        <aside className="hidden lg:flex flex-col gap-6 sticky top-20">
          <PolicyNav active={slug} />
          <div>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-outline">On this page</p>
            <ul className="flex flex-col border-l border-surface-container-high ml-3">
              {policy.sections.map((s) => (
                <li key={s.heading}>
                  <a href={`#${anchor(s.heading)}`} className="block pl-3 py-1 -ml-px border-l border-transparent text-[12px] text-on-surface-variant hover:text-on-surface hover:border-secondary">
                    {s.heading}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <article className="min-w-0 flex flex-col gap-6">
          <header className="flex flex-col gap-3 pb-6 border-b border-surface-container-high">
            <span className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center">
              <Icon name={policy.icon} className="text-[24px]" />
            </span>
            <h1 className="text-[30px] md:text-[40px] leading-tight">{policy.title}</h1>
            <p className="text-body-md text-on-surface-variant max-w-2xl">{description}</p>
            <p className="text-[12px] text-outline">
              {policy.effective ? <>Effective date: <Text>{policy.effective}</Text> · {COMPANY}</> : <>Last updated: <Text>{POLICY_LAST_UPDATED}</Text></>}
            </p>
          </header>

          {policy.sections.map((s) => (
            <section key={s.heading} id={anchor(s.heading)} className="scroll-mt-24 flex flex-col gap-2.5">
              <h2 className="text-[19px] md:text-[21px] font-semibold text-on-surface">{s.heading}</h2>
              {s.p?.map((para) => (
                <p key={para.slice(0, 40)} className="text-[15px] leading-relaxed text-on-surface-variant">
                  <Text>{fill(para, config)}</Text>
                </p>
              ))}
              {s.list && (
                <ul className="flex flex-col gap-2">
                  {s.list.map((item) => (
                    <li key={item.slice(0, 40)} className="flex gap-2.5 text-[15px] leading-relaxed text-on-surface-variant">
                      <Icon name="check_circle" className="text-[18px] text-secondary mt-0.5 shrink-0" />
                      <span><Text>{fill(item, config)}</Text></span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <HelpCard config={config} />
        </article>
      </div>
    </div>
  );
}
