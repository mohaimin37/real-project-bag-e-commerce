import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Area, Bar, CartesianGrid, Cell, ComposedChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { adminApi } from '../lib/api';
import { cn, compact, formatINR, timeAgo } from '../lib/format';
import { ErrorState, Icon, Img, Skeleton, StatusBadge } from '../components/ui';
import { PageHeader, Panel, StatCard, STAT_TONES, useChartColors } from './kit';

const RANGES = [7, 30, 90];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-inverse-surface text-inverse-on-surface rounded-xl px-3 py-2 shadow-lift text-label-md">
      <p className="opacity-70 mb-1">{new Date(label).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.dataKey === 'revenue' ? formatINR(p.value) : `${p.value} orders`}
        </p>
      ))}
    </div>
  );
}

function Greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const [days, setDays] = useState(30);
  const cc = useChartColors();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({ queryKey: ['admin', 'dashboard', days], queryFn: () => adminApi.dashboard(days) });

  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  const totalStatus = data?.statusBreakdown.reduce((s, x) => s + x.count, 0) || 0;
  const maxTop = Math.max(1, ...(data?.topProducts || []).map((p) => p.revenue));

  return (
    <div className="flex flex-col gap-space-lg">
      <PageHeader
        eyebrow={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        title={<><Greeting />.</>}
        subtitle="Here's how WILDTANE is performing."
        actions={
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-container-low">
            {RANGES.map((d) => (
              <button key={d} type="button" onClick={() => setDays(d)} className={cn('px-3 h-8 rounded-lg text-label-md transition-colors', days === d ? 'bg-surface-container-lowest shadow-card' : 'text-on-surface-variant hover:text-on-surface')}>
                {d}D
              </button>
            ))}
            <button type="button" onClick={() => refetch()} className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface" aria-label="Refresh">
              <Icon name="refresh" className={cn('text-[18px]', isFetching && 'animate-spin')} />
            </button>
          </div>
        }
      />

      {/* Alerts */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
          {[
            ['pending_actions', 'Pending orders', data.alerts.pendingOrders, '/admin/orders?status=Pending', 'amber'],
            ['domain', 'New corporate leads', data.alerts.newCorporate, '/admin/enquiries/corporate?status=new', 'teal'],
            ['mail', 'Unread messages', data.alerts.newContact, '/admin/enquiries/contact?status=new', 'navy'],
            ['notifications_active', 'Failed alerts', data.alerts.failedNotifications, '/admin/notifications?status=failed', 'red'],
          ].map(([icon, label, n, to, tone]) => (
            <Link key={label} to={to} className={cn('group flex items-center gap-3 p-space-md rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-card', n ? 'bg-surface-container-lowest border-transparent shadow-card' : 'border-surface-container-high')}>
              <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center', tone === 'amber' && 'bg-tertiary-fixed text-tertiary-container', tone === 'teal' && 'bg-secondary-container text-on-secondary-fixed', tone === 'navy' && 'bg-primary-fixed text-primary-container', tone === 'red' && 'bg-error-container text-on-error-container')}>
                <Icon name={icon} />
              </span>
              <div className="min-w-0">
                <p className="text-headline-md leading-none">{n}</p>
                <p className="text-label-sm font-normal text-on-surface-variant truncate">{label}</p>
              </div>
              <Icon name="arrow_forward" className="ml-auto text-outline group-hover:text-secondary transition-colors text-[18px]" />
            </Link>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        {isLoading
          ? [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)
          : [
              ['payments', 'Revenue', formatINR(Math.round(data.kpis.revenue.value)), data.kpis.revenue.change, 'revenue', 'teal'],
              ['shopping_cart_checkout', 'Orders', data.kpis.orders.value, data.kpis.orders.change, 'orders', 'navy'],
              ['avg_pace', 'Avg. order value', formatINR(Math.round(data.kpis.aov.value)), data.kpis.aov.change, 'revenue', 'amber'],
              ['person_add', 'New customers', data.kpis.customers.value, data.kpis.customers.change, null, 'teal'],
            ].map(([icon, label, value, change, key, tone]) => (
              <StatCard key={label} icon={icon} label={label} value={value} change={change} series={key ? data.series : null} dataKey={key} tone={tone} hint={`vs previous ${days} days`} />
            ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-space-md">
        <Panel
          className="xl:col-span-2"
          title="Revenue & orders"
          action={data && <span className="text-label-md text-on-surface-variant">{formatINR(data.kpis.revenue.value)} · {data.kpis.orders.value} orders</span>}
        >
          {isLoading ? (
            <Skeleton className="h-72" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.series} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#006b5d" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#006b5d" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={cc.grid} />
                  <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} tick={{ fontSize: 11, fill: cc.axis }} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis yAxisId="r" tickFormatter={(v) => `₹${compact(v)}`} tick={{ fontSize: 11, fill: cc.axis }} axisLine={false} tickLine={false} width={56} />
                  <YAxis yAxisId="o" orientation="right" hide />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: cc.cursor }} />
                  <Bar yAxisId="o" dataKey="orders" fill={cc.muted} radius={[4, 4, 0, 0]} maxBarSize={14} />
                  <Area yAxisId="r" type="monotone" dataKey="revenue" stroke="#006b5d" strokeWidth={2.5} fill="url(#rev)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Order pipeline">
          {isLoading ? (
            <Skeleton className="h-72" />
          ) : (
            <div className="flex flex-col gap-space-md">
              <div className="relative h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.statusBreakdown} dataKey="count" nameKey="status" innerRadius={52} outerRadius={78} paddingAngle={2} stroke="none">
                      {data.statusBreakdown.map((s, i) => <Cell key={s.status} fill={STAT_TONES[i % STAT_TONES.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} orders`, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-headline-lg leading-none">{totalStatus}</span>
                  <span className="text-label-sm font-normal text-outline">all-time</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-space-md gap-y-1.5">
                {data.statusBreakdown.map((s, i) => (
                  <Link key={s.status} to={`/admin/orders?status=${encodeURIComponent(s.status)}`} className="flex items-center gap-2 text-label-md hover:text-secondary">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: STAT_TONES[i % STAT_TONES.length] }} />
                    <span className="truncate font-normal">{s.status}</span>
                    <span className="ml-auto">{s.count}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-space-md">
        <Panel className="xl:col-span-2" title="Recent orders" action={<Link to="/admin/orders" className="text-label-md text-secondary hover:underline">View all</Link>} bodyClassName="px-0">
          {isLoading ? (
            <div className="px-space-lg"><Skeleton className="h-64" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <tbody>
                  {data.recentOrders.map((o) => (
                    <tr key={o._id} className="border-t border-surface-container-high hover:bg-surface-container-low transition-colors">
                      <td className="px-space-lg py-3">
                        <Link to={`/admin/orders/${o.orderId}`} className="text-label-lg hover:text-secondary">{o.orderId}</Link>
                        <p className="text-label-sm font-normal text-outline">{timeAgo(o.createdAt)}</p>
                      </td>
                      <td className="px-2 py-3">
                        <p className="truncate max-w-[180px]">{o.customerName}</p>
                        <p className="text-label-sm font-normal text-outline">{o.items.reduce((n, i) => n + i.quantity, 0)} items</p>
                      </td>
                      <td className="px-2 py-3"><StatusBadge status={o.orderStatus} /></td>
                      <td className="px-space-lg py-3 text-right text-label-lg">{formatINR(o.grandTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Top products" action={<span className="text-label-sm font-normal text-outline">by revenue</span>}>
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : data.topProducts.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant py-space-lg text-center">No sales in this period yet.</p>
          ) : (
            <div className="flex flex-col gap-space-md">
              {data.topProducts.map((p, i) => (
                <div key={p._id} className="flex items-center gap-3">
                  <span className="text-label-md text-outline w-4">{i + 1}</span>
                  <Img src={p.image} alt="" className="w-10 h-10 rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-label-lg truncate">{p.name}</p>
                    <div className="h-1.5 rounded-full bg-surface-container-high mt-1 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-secondary to-secondary-fixed-dim" style={{ width: `${(p.revenue / maxTop) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-label-lg">{formatINR(p.revenue)}</p>
                    <p className="text-label-sm font-normal text-outline">{p.units} sold</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-space-md">
        <Panel className="xl:col-span-2" title="Low stock" action={<Link to="/admin/inventory?stockStatus=low" className="text-label-md text-secondary hover:underline">Manage inventory</Link>}>
          {isLoading ? (
            <Skeleton className="h-40" />
          ) : data.lowStock.length === 0 ? (
            <div className="flex items-center gap-3 py-space-md text-body-sm text-on-surface-variant"><Icon name="check_circle" className="text-secondary" /> All products are comfortably stocked.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
              {data.lowStock.map((p) => (
                <Link key={p._id} to={`/admin/products/${p._id}`} className="flex items-center gap-3 p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
                  <Img src={p.images?.[0]?.url} alt="" className="w-12 h-12 rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-label-lg truncate">{p.name}</p>
                    <p className="text-label-sm font-normal text-outline truncate">{p.variants.filter((v) => v.stock <= p.lowStockThreshold).map((v) => `${v.name}: ${v.stock}`).join(' · ')}</p>
                  </div>
                  <span className={cn('px-2 py-1 rounded-lg text-label-md', p.stock === 0 ? 'bg-error-container text-on-error-container' : 'bg-tertiary-fixed text-tertiary-container')}>{p.stock} left</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Store health">
          {isLoading ? (
            <Skeleton className="h-40" />
          ) : (
            <div className="flex flex-col gap-3">
              {[
                ['inventory_2', 'Products', data.totals.products],
                ['group', 'Customers', data.totals.customers],
                ['receipt_long', 'Orders (all time)', data.totals.orders],
                ['reviews', 'Reviews', data.totals.reviews],
              ].map(([icon, label, n]) => (
                <div key={label} className="flex items-center gap-3 text-body-sm">
                  <Icon name={icon} className="text-outline text-[20px]" />
                  <span className="flex-1 text-on-surface-variant">{label}</span>
                  <span className="text-label-lg">{n}</span>
                </div>
              ))}
              <div className="h-px bg-surface-container-high my-1" />
              {[
                ['WhatsApp alerts', data.alerts.whatsappConfigured, 'Cloud API', 'Logged (dev)'],
                ['Image storage', data.alerts.cloudinaryConfigured, 'Cloudinary', 'Local disk'],
              ].map(([label, ok, on, off]) => (
                <div key={label} className="flex items-center gap-2 text-body-sm">
                  <span className={cn('w-2 h-2 rounded-full', ok ? 'bg-secondary' : 'bg-on-tertiary-container')} />
                  <span className="flex-1 text-on-surface-variant">{label}</span>
                  <span className="text-label-md">{ok ? on : off}</span>
                </div>
              ))}
              <Link to="/admin/settings" className="text-label-md text-secondary hover:underline mt-1">Store settings →</Link>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
