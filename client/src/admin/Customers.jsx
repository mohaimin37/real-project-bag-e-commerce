import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { cn, formatDate, formatINR, initials, timeAgo } from '../lib/format';
import { countryByCode } from '../lib/countries';
import { Badge, EmptyState, ErrorState, Icon, Pagination, Skeleton, Stars, StatusBadge } from '../components/ui';
import { DataTable, FilterSelect, PageHeader, SearchBox, Toolbar, useListParams } from './kit';
import { CoinIcon } from '../components/coins';

const FILTERS = [
  ['', 'Everyone', 'groups'],
  ['unread', 'New messages', 'mark_email_unread'],
  ['open-orders', 'Orders to ship', 'local_shipping'],
  ['orders', 'Have ordered', 'receipt_long'],
  ['cart', 'Items left in bag', 'shopping_bag'],
  ['blocked', 'Blocked', 'block'],
];

const ACTIVITY_ICON = { joined: 'person_add', login: 'login', order: 'receipt_long', message: 'chat', review: 'star', cart: 'shopping_bag' };
const MSG_TONE = { new: 'danger', read: 'amber', replied: 'teal', closed: 'neutral', contacted: 'teal', quoted: 'teal', won: 'teal' };

/** WhatsApp link from a phone like "+91 98200 12345". */
const waLink = (phone) => `https://wa.me/${phone.replace(/\D/g, '')}`;

function Stat({ icon, label, value, highlight }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl text-center', highlight ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-low')}>
      <Icon name={icon} className="text-[17px] opacity-80" />
      <span className="text-[14px] font-bold leading-tight tabular-nums">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-outline">{label}</span>
    </div>
  );
}

function Section({ icon, title, action, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-outline"><Icon name={icon} className="text-[15px]" /> {title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function Messages({ list, email }) {
  return list.map((m) => (
    <Link
      key={m._id}
      to={`/admin/enquiries/${m.kind}?q=${encodeURIComponent(email)}`}
      className={cn('block p-2.5 rounded-xl text-[12px] transition-colors hover:bg-surface-container', m.status === 'new' ? 'bg-error-container/40 ring-1 ring-error/20' : 'bg-surface-container-low')}
    >
      <span className="flex items-center gap-1.5">
        <Icon name={m.kind === 'corporate' ? 'domain' : 'mail'} className="text-[15px] text-secondary" />
        <b className="flex-1 truncate font-semibold">{m.title}</b>
        <Badge tone={MSG_TONE[m.status] || 'neutral'}>{m.status}</Badge>
      </span>
      {m.text && <span className="block mt-1 text-on-surface-variant line-clamp-2">“{m.text}”</span>}
      <span className="block mt-1 text-[11px] text-outline">{timeAgo(m.at)}</span>
    </Link>
  ));
}

function ContactButtons({ email, phone }) {
  const btn = 'inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-[12px] font-semibold';
  return (
    <div className="flex flex-wrap gap-1.5">
      <a href={`mailto:${email}`} className={btn}><Icon name="mail" className="text-[15px]" /> Email</a>
      {phone && <a href={`tel:${phone.replace(/\s/g, '')}`} className={btn}><Icon name="call" className="text-[15px]" /> Call</a>}
      {phone && <a href={waLink(phone)} target="_blank" rel="noreferrer" className={btn}><Icon name="chat" className="text-[15px]" /> WhatsApp</a>}
    </div>
  );
}

/** One box per customer with everything they have shared or done. */
function CustomerCard({ c }) {
  const country = countryByCode(c.country);
  const place = c.address ? `${c.address.city}, ${c.address.state} ${c.address.postalCode}` : country?.name;
  return (
    <article className={cn('card surface-card border border-outline-variant/60 p-4 flex flex-col gap-3.5', c.messages.unread > 0 && 'ring-2 ring-error/40', !c.isActive && 'opacity-70')}>
      {/* Who */}
      <header className="flex items-start gap-3">
        {c.avatar ? (
          <img src={c.avatar} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
        ) : (
          <span className="w-11 h-11 rounded-full bg-secondary text-on-secondary text-[14px] font-bold flex items-center justify-center shrink-0">{initials(c.name)}</span>
        )}
        <div className="flex-1 min-w-0">
          <Link to={`/admin/customers/${c._id}`} className="block text-[15px] font-semibold truncate hover:text-secondary">{c.name}</Link>
          <p className="text-[12px] text-on-surface-variant truncate">{c.email}</p>
          <p className="text-[11px] text-outline">Active {timeAgo(c.lastActive)} · joined {formatDate(c.createdAt)}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {c.messages.unread > 0 && <Badge tone="danger">{c.messages.unread} new msg</Badge>}
          {!c.isActive && <Badge tone="danger">Blocked</Badge>}
          {c.subscribedAt && <Badge tone="mint">Newsletter</Badge>}
        </div>
      </header>

      {/* Details they gave */}
      <div className="grid grid-cols-1 gap-1 text-[12px] text-on-surface-variant">
        {c.phone && <span className="flex items-center gap-1.5"><Icon name="call" className="text-[15px] text-outline" /> {c.phone}</span>}
        {place && <span className="flex items-center gap-1.5"><Icon name="location_on" className="text-[15px] text-outline" /> {country?.flag} {place}{c.addressCount > 1 ? ` · ${c.addressCount} addresses` : ''}</span>}
        <span className="flex items-center gap-1.5"><CoinIcon className="w-[15px] h-[15px]" /> {c.coins || 0} coins</span>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <Stat icon="receipt_long" label="Orders" value={c.orders.count} highlight={c.orders.open > 0} />
        <Stat icon="payments" label="Spent" value={formatINR(c.orders.spent).replace('.00', '')} />
        <Stat icon="favorite" label="Wishlist" value={c.wishlist} />
        <Stat icon="shopping_bag" label="In bag" value={c.cart.items} highlight={c.cart.items > 0} />
      </div>

      {c.orders.latest && (
        <Section icon="receipt_long" title={c.orders.open ? `Latest order · ${c.orders.open} to ship` : 'Latest order'}>
          <Link to={`/admin/orders/${c.orders.latest.orderId}`} className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-[12px]">
            <b className="font-semibold">{c.orders.latest.orderId}</b>
            <StatusBadge status={c.orders.latest.status} className="!text-[11px] !px-2 !py-0.5" />
            <span className="ml-auto font-semibold">{formatINR(c.orders.latest.total)}</span>
          </Link>
        </Section>
      )}

      {c.messages.count > 0 && (
        <Section icon="forum" title={`Messages (${c.messages.count})`}>
          <Messages list={c.messages.latest} email={c.email} />
        </Section>
      )}

      {c.cart.items > 0 && (
        <Section icon="shopping_bag" title={`In their bag · ${formatINR(c.cart.value)}`}>
          <p className="text-[12px] text-on-surface-variant line-clamp-2">{c.cart.names.join(', ')}</p>
        </Section>
      )}

      {c.reviews.latest && (
        <Section icon="star" title={`Reviews (${c.reviews.count})`}>
          <div className="text-[12px]">
            <span className="flex items-center gap-1.5"><Stars value={c.reviews.latest.rating} size={13} /> <span className="truncate font-medium">{c.reviews.latest.product}</span></span>
            {c.reviews.latest.text && <p className="mt-0.5 text-on-surface-variant line-clamp-2">“{c.reviews.latest.text}”</p>}
          </div>
        </Section>
      )}

      <Section icon="history" title="Recent activity">
        <ol className="flex flex-col gap-1">
          {c.activity.map((a, i) => (
            <li key={i} className="flex items-center gap-2 text-[12px]">
              <Icon name={ACTIVITY_ICON[a.type] || 'circle'} className="text-[14px] text-secondary shrink-0" />
              <span className="flex-1 truncate">{a.text}</span>
              <span className="text-[11px] text-outline whitespace-nowrap">{timeAgo(a.at)}</span>
            </li>
          ))}
        </ol>
      </Section>

      <footer className="mt-auto pt-3 border-t border-surface-container-high flex items-center justify-between gap-2">
        <ContactButtons email={c.email} phone={c.phone} />
        <Link to={`/admin/customers/${c._id}`} className="text-[12px] font-semibold text-secondary flex items-center gap-0.5 whitespace-nowrap">
          Full profile <Icon name="arrow_forward" className="text-[15px]" />
        </Link>
      </footer>
    </article>
  );
}

/** Someone who wrote to the store without creating an account. */
function GuestCard({ g }) {
  return (
    <article className={cn('card p-4 flex flex-col gap-3 border border-dashed border-outline-variant', g.messages.unread > 0 && 'ring-2 ring-error/40')}>
      <header className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center shrink-0"><Icon name="person" /></span>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold truncate">{g.name || 'Guest'}</p>
          <p className="text-[12px] text-on-surface-variant truncate">{g.email}</p>
          <p className="text-[11px] text-outline">Last message {timeAgo(g.lastActive)}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge>No account</Badge>
          {g.messages.unread > 0 && <Badge tone="danger">{g.messages.unread} new msg</Badge>}
        </div>
      </header>
      {g.phone && <span className="flex items-center gap-1.5 text-[12px] text-on-surface-variant"><Icon name="call" className="text-[15px] text-outline" /> {g.phone}</span>}
      <Section icon="forum" title={`Messages (${g.messages.count})`}>
        <Messages list={g.messages.latest} email={g.email} />
      </Section>
      <footer className="mt-auto pt-3 border-t border-surface-container-high">
        <ContactButtons email={g.email} phone={g.phone} />
      </footer>
    </article>
  );
}

function Board({ p, set }) {
  const query = useQuery({
    queryKey: ['admin', 'customer-board', p],
    queryFn: () => adminApi.customerBoard({ q: p.q, show: p.show, page: p.page, limit: 24 }),
    placeholderData: keepPreviousData,
    refetchInterval: 60 * 1000, // new messages and orders appear without reloading
  });
  const d = query.data;
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />;
  const tiles = d
    ? [
        ['groups', 'Customers', d.summary.customers, ''],
        ['mark_email_unread', 'Unread messages', d.summary.unreadMessages, 'unread'],
        ['local_shipping', 'Orders to ship', d.summary.openOrders, 'open-orders'],
        ['shopping_bag', 'Items left in bag', d.summary.abandonedCarts, 'cart'],
        ['person', 'Guests who wrote', d.summary.guests, ''],
      ]
    : [];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
        {!d
          ? [1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-[68px] rounded-xl" />)
          : tiles.map(([icon, label, value, f]) => (
              <button
                key={label}
                type="button"
                disabled={!f}
                onClick={() => set({ show: p.show === f ? '' : f })}
                className={cn('card p-3 flex items-center gap-3 text-left transition-shadow enabled:hover:shadow-lift', f && p.show === f && 'ring-2 ring-secondary', label === 'Unread messages' && value > 0 && 'ring-2 ring-error/40')}
              >
                <span className="w-9 h-9 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center"><Icon name={icon} className="text-[20px]" /></span>
                <span><span className="block text-[18px] font-bold leading-tight">{value}</span><span className="block text-[11px] text-outline">{label}</span></span>
              </button>
            ))}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-2">
        <div className="lg:w-80"><SearchBox value={p.q} onChange={(q) => set({ q })} placeholder="Name, email or phone…" /></div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {FILTERS.map(([v, label, icon]) => (
            <button key={v} type="button" onClick={() => set({ show: v })} className={cn('inline-flex items-center gap-1 h-9 px-3 rounded-full text-[12px] font-semibold whitespace-nowrap border transition-colors', (p.show || '') === v ? 'bg-on-surface text-surface-container-lowest border-on-surface' : 'border-surface-container-high hover:border-outline')}>
              <Icon name={icon} className="text-[15px]" /> {label}
            </button>
          ))}
        </div>
        {query.isFetching && d && <span className="text-[11px] text-outline lg:ml-auto">Refreshing…</span>}
      </div>

      {!d ? (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-[420px] rounded-xl" />)}</div>
      ) : d.items.length === 0 && d.guests.length === 0 ? (
        <EmptyState icon="group" title="Nobody matches" description="Try another search or filter." />
      ) : (
        <div className={cn('grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 items-start transition-opacity', query.isPlaceholderData && 'opacity-60')}>
          {d.items.map((c) => <CustomerCard key={c._id} c={c} />)}
        </div>
      )}
      <Pagination page={d?.page} pages={d?.pages} onChange={(page) => set({ page })} />

      {d?.guests.length > 0 && (
        <section className="flex flex-col gap-3 pt-2">
          <h2 className="text-[15px] font-semibold flex items-center gap-2"><Icon name="person" className="text-secondary" /> Guests who wrote to you <span className="text-[12px] font-normal text-outline">— no account yet</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 items-start">{d.guests.map((g) => <GuestCard key={g.email} g={g} />)}</div>
        </section>
      )}
    </div>
  );
}

function Table({ p, set }) {
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ['admin', 'customers', p], queryFn: () => adminApi.customers({ ...p, limit: 15 }), placeholderData: keepPreviousData });
  const columns = [
    {
      key: 'name',
      header: 'Customer',
      render: (u) => (
        <div className="flex items-center gap-3 min-w-[200px]">
          <span className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-fixed text-label-md flex items-center justify-center shrink-0">{initials(u.name)}</span>
          <div className="min-w-0">
            <p className="text-label-lg truncate flex items-center gap-2">{u.name} {u.role === 'admin' && <Badge tone="dark">Admin</Badge>} {!u.isActive && <Badge tone="danger">Blocked</Badge>}</p>
            <p className="text-label-sm font-normal text-outline truncate">{u.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: (u) => <span className="whitespace-nowrap">{u.phone?.number ? `${u.phone.dialCode} ${u.phone.number}` : '—'}</span> },
    { key: 'country', header: 'Country', render: (u) => <span className="whitespace-nowrap">{countryByCode(u.country)?.flag} {countryByCode(u.country)?.name}</span> },
    { key: 'orders', header: 'Orders', align: 'right', render: (u) => u.orders },
    { key: 'spent', header: 'Lifetime value', align: 'right', render: (u) => <span className="text-label-lg">{formatINR(u.spent)}</span> },
    { key: 'joined', header: 'Joined', render: (u) => <span className="whitespace-nowrap text-on-surface-variant">{formatDate(u.createdAt)}</span> },
  ];
  return (
    <>
      <Toolbar>
        <SearchBox value={p.q} onChange={(q) => set({ q })} placeholder="Name, email or phone…" />
        <FilterSelect label="Role" value={p.role} onChange={(v) => set({ role: v })} options={[['', 'All roles'], ['customer', 'Customers'], ['admin', 'Admins']]} />
        <FilterSelect label="Status" value={p.status} onChange={(v) => set({ status: v })} options={[['', 'Any status'], ['active', 'Active'], ['blocked', 'Blocked']]} />
      </Toolbar>
      <DataTable columns={columns} rows={query.data?.items || []} loading={query.isLoading} error={query.error} onRetry={query.refetch} onRowClick={(u) => navigate(`/admin/customers/${u._id}`)} empty={<EmptyState icon="group" title="No customers found" />} />
      <Pagination className="mt-space-md" page={query.data?.page} pages={query.data?.pages} onChange={(page) => set({ page })} />
    </>
  );
}

export default function Customers() {
  const [p, set] = useListParams({ page: '1' });
  const view = p.view === 'table' ? 'table' : 'cards';
  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Everyone who shops or writes to you — one box per person with their details, orders, messages and latest activity. Updates every minute."
        actions={
          <div className="flex p-1 rounded-xl bg-surface-container-low" role="tablist">
            {[['cards', 'grid_view', 'Cards'], ['table', 'table_rows', 'Table']].map(([k, icon, label]) => (
              <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => set({ view: k === 'cards' ? '' : k, show: '', page: '' })} className={cn('flex items-center gap-1.5 px-3 h-8 rounded-lg text-label-md', view === k ? 'bg-surface-container-lowest shadow-card' : 'text-on-surface-variant')}>
                <Icon name={icon} className="text-[18px]" /> {label}
              </button>
            ))}
          </div>
        }
      />
      {view === 'cards' ? <Board p={p} set={set} /> : <Table p={p} set={set} />}
    </>
  );
}
