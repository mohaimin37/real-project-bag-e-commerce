import { useState } from 'react';
import { useSelector } from 'react-redux';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { adminApi } from '../lib/api';
import { cn, compact, formatDate, formatINR, imgUrl } from '../lib/format';
import { ErrorState, Icon, Skeleton } from '../components/ui';
import { PageHeader, Panel, StatCard, useChartColors } from './kit';

const PERIODS = [
  ['day', 'Daily', 'last 30 days'],
  ['week', 'Weekly', 'last 12 weeks'],
  ['month', 'Monthly', 'last 12 months'],
];

// Validated with the dataviz palette checker (lightness, chroma, CVD, contrast) for both themes.
const SERIES = {
  light: { primary: '#00917c', secondary: '#eb6834' },
  dark: { primary: '#13a58e', secondary: '#d95926' },
};

const pct = (cur, prev) => (prev ? ((cur - prev) / prev) * 100 : cur ? 100 : 0);

function useSeriesColors() {
  const theme = useSelector((s) => s.ui.theme);
  return SERIES[theme === 'dark' ? 'dark' : 'light'];
}

function ChartTooltip({ active, payload, label, format = (v) => v.toLocaleString('en-IN') }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-inverse-surface text-inverse-on-surface px-3 py-2 shadow-lift text-body-sm">
      <p className="text-label-md mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
          <span className="opacity-80">{p.name}</span>
          <span className="ml-auto font-semibold tabular-nums">{format(p.value, p.dataKey)}</span>
        </p>
      ))}
    </div>
  );
}

function Axes({ cc, money }) {
  return (
    <>
      <CartesianGrid vertical={false} stroke={cc.grid} />
      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: cc.axis, fontSize: 11 }} minTickGap={16} />
      <YAxis tickLine={false} axisLine={false} tick={{ fill: cc.axis, fontSize: 11 }} width={money ? 52 : 36} allowDecimals={false} tickFormatter={(v) => (money ? `₹${compact(v)}` : compact(v))} />
    </>
  );
}

/** Horizontal bar list: label · bar · value. */
function BarList({ rows, color, empty = 'No data yet' }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-body-sm text-on-surface-variant py-space-md">{empty}</p>;
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <li key={r.key} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-body-sm">
            <span className="truncate flex items-center gap-2">{r.icon}{r.label}</span>
            <span className="text-label-lg tabular-nums">{r.value.toLocaleString('en-IN')}{r.suffix}</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Reports() {
  const [period, setPeriod] = useState('day');
  const [showTable, setShowTable] = useState(false);
  const cc = useChartColors();
  const col = useSeriesColors();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'reports', period],
    queryFn: () => adminApi.reports(period),
    placeholderData: keepPreviousData,
    refetchInterval: 60 * 1000,
  });
  const [, , rangeLabel] = PERIODS.find(([k]) => k === period);

  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  const c = data?.current;
  const p = data?.previous;
  const b = data?.buckets || [];
  const hasTraffic = b.some((x) => x.visitors > 0);
  const tiles = c
    ? [
        ['groups', 'Visitors', compact(c.visitors), pct(c.visitors, p.visitors), 'visitors', 'teal'],
        ['receipt_long', 'Orders', c.orders.toLocaleString('en-IN'), pct(c.orders, p.orders), 'orders', 'navy'],
        ['payments', 'Revenue', formatINR(c.revenue), pct(c.revenue, p.revenue), 'revenue', 'teal'],
        ['percent', 'Conversion rate', `${c.conversion}%`, pct(c.conversion, p.conversion), 'conversion', 'amber'],
        ['shopping_cart', 'Avg. order value', formatINR(c.avgOrderValue), pct(c.avgOrderValue, p.avgOrderValue), null, 'navy'],
        ['person_add', 'New customers', c.newCustomers.toLocaleString('en-IN'), pct(c.newCustomers, p.newCustomers), 'newCustomers', 'amber'],
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={`Visitors and sales over the ${rangeLabel}, compared with the ${rangeLabel.replace('last', 'previous')}. Updates every minute.`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex p-1 rounded-xl bg-surface-container-low" role="tablist" aria-label="Report period">
              {PERIODS.map(([k, labelText]) => (
                <button key={k} type="button" role="tab" aria-selected={period === k} onClick={() => setPeriod(k)} className={cn('px-3.5 h-9 rounded-lg text-label-md transition-colors', period === k ? 'bg-surface-container-lowest shadow-card text-on-surface' : 'text-on-surface-variant hover:text-on-surface')}>
                  {labelText}
                </button>
              ))}
            </div>
            {isFetching && <Icon name="progress_activity" className="animate-spin text-outline" />}
          </div>
        }
      />

      {/* Right now + today */}
      <div className="card p-space-md mb-space-md flex flex-wrap items-center gap-x-space-xl gap-y-space-sm">
        <span className="flex items-center gap-2 text-label-lg">
          <span className="relative flex h-2.5 w-2.5"><span className="absolute inset-0 rounded-full bg-secondary animate-ping opacity-60" /><span className="relative h-2.5 w-2.5 rounded-full bg-secondary" /></span>
          {data ? data.liveVisitors : '–'} on the site right now
        </span>
        {data?.today && (
          <>
            <span className="text-body-sm text-on-surface-variant">Today: <b className="text-on-surface">{data.today.visitors}</b> visitors</span>
            <span className="text-body-sm text-on-surface-variant"><b className="text-on-surface">{data.today.orders}</b> orders</span>
            <span className="text-body-sm text-on-surface-variant"><b className="text-on-surface">{formatINR(data.today.revenue)}</b> sales</span>
            <span className="text-body-sm text-on-surface-variant"><b className="text-on-surface">{data.today.newCustomers}</b> new customers</span>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-space-md mb-space-md">
        {isLoading
          ? [1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)
          : tiles.map(([icon, labelText, value, change, key, tone]) => (
              <StatCard key={labelText} icon={icon} label={labelText} value={value} change={change} series={key ? b : null} dataKey={key} tone={tone} hint={`vs previous ${rangeLabel.replace('last ', '')}`} />
            ))}
      </div>

      {!isLoading && !hasTraffic && (
        <p className="mb-space-md p-space-md rounded-xl bg-surface-container-low text-body-sm text-on-surface-variant flex items-start gap-2">
          <Icon name="info" className="text-secondary" /> Visitor counting started with this update, so traffic charts fill in as people browse the store. Sales figures include all past orders.
        </p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-md mb-space-md">
        <Panel title="Visitors">
          <div className="h-64 px-2 pb-space-md" role="img" aria-label="Visitors and page views over time">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={b} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="visFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={col.primary} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={col.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Axes cc={cc} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: cc.cursor }} />
                <Legend verticalAlign="top" height={28} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} formatter={(value) => <span className="text-on-surface-variant">{value}</span>} />
                <Area type="monotone" name="Visitors" dataKey="visitors" stroke={col.primary} strokeWidth={2} fill="url(#visFill)" activeDot={{ r: 5, strokeWidth: 2, stroke: cc.tipFg }} />
                <Area type="monotone" name="Page views" dataKey="pageViews" stroke={col.secondary} strokeWidth={2} fill="none" strokeDasharray="5 3" activeDot={{ r: 5, strokeWidth: 2, stroke: cc.tipFg }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Sales (₹)">
          <div className="h-64 px-2 pb-space-md" role="img" aria-label="Revenue over time">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={b} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="20%">
                <Axes cc={cc} money />
                <Tooltip content={<ChartTooltip format={(v) => formatINR(v)} />} cursor={{ fill: cc.hover }} />
                <Bar name="Revenue" dataKey="revenue" fill={col.primary} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Orders">
          <div className="h-56 px-2 pb-space-md" role="img" aria-label="Orders over time">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={b} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="20%">
                <Axes cc={cc} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: cc.hover }} />
                <Bar name="Orders" dataKey="orders" fill={col.secondary} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Conversion rate (% of visitors who ordered)">
          <div className="h-56 px-2 pb-space-md" role="img" aria-label="Conversion rate over time">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={b} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={cc.grid} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: cc.axis, fontSize: 11 }} minTickGap={16} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: cc.axis, fontSize: 11 }} width={36} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<ChartTooltip format={(v) => `${v}%`} />} cursor={{ stroke: cc.cursor }} />
                <Line type="monotone" name="Conversion" dataKey="conversion" stroke={col.primary} strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: cc.tipFg }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel
        title={`Breakdown by ${period}`}
        className="mb-space-md"
        action={
          <button type="button" className="text-label-md text-secondary hover:underline" onClick={() => setShowTable(!showTable)} aria-expanded={showTable}>
            {showTable ? 'Hide table' : 'Show as table'}
          </button>
        }
      >
        {showTable && (
          <div className="overflow-x-auto px-space-lg pb-space-md">
            <table className="w-full text-body-sm tabular-nums">
              <thead>
                <tr className="text-left text-label-sm uppercase tracking-wider text-outline">
                  {['Period', 'Visitors', 'New', 'Page views', 'Orders', 'Items', 'Revenue', 'Conversion', 'New customers'].map((h, i) => <th key={h} className={cn('py-2 pr-4', i > 0 && 'text-right')}>{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high">
                {[...b].reverse().map((r) => (
                  <tr key={r.start}>
                    <td className="py-2 pr-4 whitespace-nowrap">{period === 'day' ? formatDate(r.start, { weekday: 'short', day: 'numeric', month: 'short' }) : period === 'week' ? `Week of ${r.label}` : r.label}</td>
                    <td className="py-2 pr-4 text-right">{r.visitors}</td>
                    <td className="py-2 pr-4 text-right">{r.newVisitors}</td>
                    <td className="py-2 pr-4 text-right">{r.pageViews}</td>
                    <td className="py-2 pr-4 text-right">{r.orders}</td>
                    <td className="py-2 pr-4 text-right">{r.items}</td>
                    <td className="py-2 pr-4 text-right">{formatINR(r.revenue)}</td>
                    <td className="py-2 pr-4 text-right">{r.conversion}%</td>
                    <td className="py-2 text-right">{r.newCustomers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-space-md">
        <Panel title="Most viewed products">
          <div className="px-space-lg pb-space-md flex flex-col gap-2">
            {(data?.topProducts || []).length === 0 ? (
              <p className="text-body-sm text-on-surface-variant py-space-md">No product views yet</p>
            ) : (
              data.topProducts.map((pr) => (
                <a key={pr.slug} href={`/product/${pr.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-1.5 -mx-1.5 rounded-lg hover:bg-surface-container-low">
                  {pr.image ? <img src={imgUrl(pr.image)} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <span className="w-10 h-10 rounded-lg bg-surface-container-low" />}
                  <span className="flex-1 min-w-0 text-body-sm truncate">{pr.name}</span>
                  <span className="text-label-lg tabular-nums">{pr.views}</span>
                </a>
              ))
            )}
          </div>
        </Panel>
        <Panel title="Top pages">
          <div className="px-space-lg pb-space-md">
            <BarList color={col.primary} rows={(data?.topPages || []).map((x) => ({ key: x.path, label: x.path === '/' ? 'Home' : x.path, value: x.views }))} />
          </div>
        </Panel>
        <Panel title="Where visitors come from">
          <div className="px-space-lg pb-space-md">
            <BarList color={col.primary} rows={(data?.sources || []).map((x) => ({ key: x.source, label: x.source === 'direct' ? 'Direct / typed in' : x.source, value: x.visitors }))} />
          </div>
        </Panel>
        <Panel title="Devices">
          <div className="px-space-lg pb-space-md">
            <BarList
              color={col.primary}
              rows={['mobile', 'desktop', 'tablet']
                .filter((d) => data?.devices?.[d])
                .map((d) => ({ key: d, label: d[0].toUpperCase() + d.slice(1), value: data.devices[d], icon: <Icon name={d === 'mobile' ? 'smartphone' : d === 'tablet' ? 'tablet' : 'computer'} className="text-[18px] text-outline" /> }))}
            />
          </div>
        </Panel>
      </div>
    </>
  );
}
