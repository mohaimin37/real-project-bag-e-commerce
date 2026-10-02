import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { adminApi } from '../lib/api';
import { cn, compact, formatINR, PAYMENT_LABELS } from '../lib/format';
import { countryByCode } from '../lib/countries';
import { ErrorState, Skeleton } from '../components/ui';
import { PageHeader, Panel, STAT_TONES, useChartColors } from './kit';

export default function Analytics() {
  const cc = useChartColors();
  const axis = { fontSize: 11, fill: cc.axis };
  const tip = { contentStyle: { background: cc.tipBg, border: 'none', borderRadius: 12, color: cc.tipFg, fontSize: 12 }, itemStyle: { color: cc.tipFg } };
  const [days, setDays] = useState(90);
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['admin', 'analytics', days], queryFn: () => adminApi.analytics(days) });
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  const maxCountry = Math.max(1, ...(data?.byCountry || []).map((c) => c.revenue));

  return (
    <div className="flex flex-col gap-space-lg">
      <PageHeader
        title="Analytics"
        subtitle="Revenue mix, customer geography and buying patterns (cancelled and returned orders excluded)."
        actions={
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-container-low">
            {[30, 90, 180, 365].map((d) => (
              <button key={d} type="button" onClick={() => setDays(d)} className={cn('px-3 h-8 rounded-lg text-label-md', days === d ? 'bg-surface-container-lowest shadow-card' : 'text-on-surface-variant')}>
                {d === 365 ? '1Y' : `${d}D`}
              </button>
            ))}
          </div>
        }
      />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-space-md">
        <Panel className="xl:col-span-2" title="Revenue by subcategory">
          {isLoading ? <Skeleton className="h-72" /> : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byCategory} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={cc.grid} />
                  <XAxis type="number" tickFormatter={(v) => `₹${compact(v)}`} tick={axis} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={axis} axisLine={false} tickLine={false} width={110} />
                  <Tooltip {...tip} formatter={(v) => formatINR(v)} cursor={{ fill: cc.hover }} />
                  <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={22}>
                    {data.byCategory.map((_, i) => <Cell key={i} fill={STAT_TONES[i % STAT_TONES.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
        <Panel title="Payment methods">
          {isLoading ? <Skeleton className="h-72" /> : (
            <div className="flex flex-col gap-space-md">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.byPayment} dataKey="revenue" nameKey="method" innerRadius={48} outerRadius={76} paddingAngle={2} stroke="none">
                      {data.byPayment.map((_, i) => <Cell key={i} fill={STAT_TONES[i % STAT_TONES.length]} />)}
                    </Pie>
                    <Tooltip {...tip} formatter={(v, n) => [formatINR(v), PAYMENT_LABELS[n] || n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {data.byPayment.map((p, i) => (
                <div key={p.method} className="flex items-center gap-2 text-body-sm">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: STAT_TONES[i % STAT_TONES.length] }} />
                  <span className="flex-1">{PAYMENT_LABELS[p.method] || p.method}</span>
                  <span className="text-outline">{p.orders} orders</span>
                  <span className="text-label-lg">{formatINR(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-md">
        <Panel title="Top destinations">
          {isLoading ? <Skeleton className="h-64" /> : (
            <div className="flex flex-col gap-3">
              {data.byCountry.map((c) => {
                const ct = countryByCode(c.country);
                return (
                  <div key={c.country} className="flex items-center gap-3">
                    <span className="text-headline-sm w-8">{ct?.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-body-sm"><span>{ct?.name || c.country}</span><span className="text-label-lg">{formatINR(c.revenue)}</span></div>
                      <div className="h-1.5 rounded-full bg-surface-container-high mt-1 overflow-hidden"><div className="h-full rounded-full bg-secondary" style={{ width: `${(c.revenue / maxCountry) * 100}%` }} /></div>
                    </div>
                    <span className="text-label-sm font-normal text-outline w-16 text-right">{c.orders} orders</span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
        <Panel title="Orders by weekday">
          {isLoading ? <Skeleton className="h-64" /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byWeekday}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={cc.grid} />
                  <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} />
                  <YAxis tick={axis} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
                  <Tooltip {...tip} cursor={{ fill: cc.hover }} />
                  <Bar dataKey="orders" fill="#006b5d" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>
      <Panel title="Coupon performance">
        {isLoading ? <Skeleton className="h-32" /> : data.coupons.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">No coupon redemptions in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead><tr className="text-left text-label-sm uppercase tracking-wider text-outline"><th className="py-2">Code</th><th>Orders</th><th>Discount given</th><th className="text-right">Revenue</th></tr></thead>
              <tbody>
                {data.coupons.map((c) => (
                  <tr key={c.code} className="border-t border-surface-container-high">
                    <td className="py-2.5 text-label-lg">{c.code}</td><td>{c.orders}</td><td>{formatINR(c.discount)}</td><td className="text-right">{formatINR(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
