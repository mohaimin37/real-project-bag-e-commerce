import { useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { cn, formatDate, formatDateTime, PAYMENT_LABELS } from '../../lib/format';
import { countryName } from '../../lib/countries';
import { useMoney, useUser } from '../../hooks/useStore';
import { useAuthActions } from '../../hooks/useAuth';
import { AddressCard, AddressForm, emptyAddress } from '../../components/AddressForm';
import OrderTimeline from '../../components/OrderTimeline';
import ImageDrop from '../../components/ImageDrop';
import Coins, { CoinBalanceCard, useMyCoins } from './Coins';
import { ProductGrid, useProductsByIds } from '../../components/product';
import { Button, CountrySelect, EmptyState, ErrorState, Field, Icon, Img, Input, Modal, Pagination, PhoneInput, Skeleton, Stars, StatusBadge, Textarea, useConfirm } from '../../components/ui';
import { applyServerErrors } from '../Auth';
import { useSelector } from 'react-redux';
import Seo from '../../components/Seo';

const NAV = [
  ['', 'space_dashboard', 'Overview'],
  ['orders', 'receipt_long', 'My orders'],
  ['coins', 'savings', 'My coins'],
  ['profile', 'person', 'Profile'],
  ['addresses', 'location_on', 'Addresses'],
  ['reviews', 'reviews', 'My reviews'],
  ['recent', 'history', 'Recently viewed'],
  ['security', 'shield_lock', 'Security'],
];

function Profile() {
  const user = useUser();
  const { refreshUser } = useAuthActions();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting, isDirty }, reset } = useForm({
    resolver: zodResolver(
      z.object({
        name: z.string().trim().min(2, 'Enter your name'),
        phone: z.object({ dialCode: z.string(), number: z.string().trim().regex(/^[0-9\s-]{5,16}$/, 'Enter a valid phone number') }),
        country: z.string().length(2),
        nationality: z.string().length(2),
      })
    ),
    defaultValues: { name: user.name, phone: { dialCode: user.phone?.dialCode || '+91', number: user.phone?.number || '' }, country: user.country, nationality: user.nationality },
  });
  const [progress, setProgress] = useState(null);
  const avatar = useMutation({
    mutationFn: (file) => api.uploadAvatar(file, setProgress),
    onSuccess: (res) => {
      refreshUser(res.user);
      toast.success('Photo updated');
    },
    onError: (e) => toast.error(e.message),
    onSettled: () => setProgress(null),
  });
  const onSubmit = async (values) => {
    try {
      const res = await api.updateProfile(values);
      refreshUser(res.user);
      reset(values);
      toast.success('Profile saved');
    } catch (err) {
      applyServerErrors(err, setError);
      toast.error(err.message);
    }
  };
  return (
    <div className="flex flex-col gap-space-lg">
      <div className="card p-space-lg flex items-center gap-space-md">
        <ImageDrop
          shape="circle"
          label="Change profile photo"
          value={user.avatar?.url ? user.avatar : null}
          onChange={(file) => file && avatar.mutate(file)}
          busy={avatar.isPending}
          progress={progress}
        />
        <div className="min-w-0">
          <h2 className="text-headline-md">{user.name}</h2>
          <p className="text-body-sm text-on-surface-variant">{user.email}</p>
          <p className="text-label-sm font-normal text-outline">Member since {formatDate(user.createdAt)}</p>
          <p className="mt-1.5 text-[12px] text-on-surface-variant flex items-center gap-1">
            <Icon name="photo_camera" className="text-[15px] text-secondary" />
            {avatar.isPending ? 'Uploading your photo…' : 'Tap your photo, drag one onto it or paste to change it.'}
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="card p-space-lg grid grid-cols-1 md:grid-cols-2 gap-space-md" noValidate>
        <h3 className="md:col-span-2 text-headline-sm">Personal details</h3>
        <Field label="Full name" error={errors.name?.message} htmlFor="p-name">
          <Input id="p-name" error={errors.name} {...register('name')} />
        </Field>
        <Field label="Email" hint="Contact support to change your email">
          <Input value={user.email} disabled readOnly />
        </Field>
        <Field label="Mobile number" error={errors.phone?.number?.message} className="md:col-span-2">
          <PhoneInput dialProps={register('phone.dialCode')} numberProps={register('phone.number')} error={errors.phone?.number} />
        </Field>
        <Field label="Country of residence">
          <CountrySelect {...register('country')} />
        </Field>
        <Field label="Nationality">
          <CountrySelect {...register('nationality')} />
        </Field>
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save changes</Button>
        </div>
      </form>
    </div>
  );
}

const FLOW = ['Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
const FRIENDLY = {
  Pending: 'Order received',
  Confirmed: 'Confirmed',
  Processing: 'Being prepared',
  Packed: 'Packed',
  Shipped: 'On the way',
  'Out for Delivery': 'Arriving today',
  Delivered: 'Delivered',
};

/** Slim progress bar for an order: placed → delivered. */
function OrderProgress({ status }) {
  const idx = FLOW.indexOf(status);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1" aria-hidden="true">
        {FLOW.map((s, i) => <span key={s} className={cn('h-1.5 flex-1 rounded-full', i <= idx ? 'bg-secondary' : 'bg-surface-container-high')} />)}
      </div>
      <div className="flex justify-between text-label-sm font-normal text-outline">
        <span>Placed</span>
        <span className="text-secondary font-semibold">{FRIENDLY[status] || status}</span>
        <span>Delivered</span>
      </div>
    </div>
  );
}

function Overview() {
  const user = useUser();
  const money = useMoney();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['orders', 'overview'], queryFn: api.myOverview, refetchInterval: 60 * 1000 });
  const coins = useMyCoins();
  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-3 gap-space-md">{[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-24" />)}</div>;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  const s = data.stats;
  const tiles = [
    ['receipt_long', 'Orders placed', s.orders, '/account/orders'],
    ['payments', 'Total spent', money(s.spent), '/account/orders?group=delivered'],
    ['local_shipping', 'On the way', s.active, '/account/orders?group=active'],
    ['favorite', 'In wishlist', s.wishlist, '/wishlist'],
    ['location_on', 'Saved addresses', s.addresses, '/account/addresses'],
    ['reviews', 'Reviews written', s.reviews, '/account/reviews'],
  ];
  return (
    <div className="flex flex-col gap-space-lg">
      {coins.data && <CoinBalanceCard coins={coins.data} />}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-space-md">
        {tiles.map(([icon, label, value, to]) => (
          <Link key={label} to={to} className="card p-space-md flex items-center gap-3 hover:shadow-lift transition-shadow">
            <span className="w-11 h-11 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0"><Icon name={icon} /></span>
            <span className="min-w-0">
              <span className="block text-headline-sm tabular-nums truncate">{value}</span>
              <span className="block text-label-sm font-normal text-on-surface-variant">{label}</span>
            </span>
          </Link>
        ))}
      </div>

      <section className="flex flex-col gap-space-sm">
        <h2 className="text-headline-sm">Orders on the way</h2>
        {data.activeOrders.length === 0 ? (
          <div className="card p-space-lg flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
            <p className="text-body-md text-on-surface-variant">Nothing on the way right now.</p>
            <Link to="/shop" className="btn-primary">Find something new</Link>
          </div>
        ) : (
          data.activeOrders.map((o) => {
            const last = o.statusHistory?.[o.statusHistory.length - 1];
            return (
              <Link key={o._id} to={`/account/orders/${o.orderId}`} className="card p-space-md flex flex-col gap-space-sm hover:shadow-lift transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-3 shrink-0">
                    {o.items.slice(0, 3).map((it, i) => <Img key={i} src={it.image} alt="" className="w-12 h-12 rounded-lg ring-2 ring-surface-container-lowest" />)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-label-lg truncate">{o.items.map((i) => i.productName).join(', ')}</p>
                    <p className="text-label-sm font-normal text-outline">{o.orderId} · {money(o.grandTotal)}</p>
                  </div>
                  <span className="text-label-md text-secondary flex items-center gap-1 shrink-0">Track <Icon name="chevron_right" className="text-[16px]" /></span>
                </div>
                <OrderProgress status={o.orderStatus} />
                <p className="text-label-sm font-normal text-on-surface-variant">
                  Last update {formatDateTime(last?.at || o.createdAt)}
                  {last?.note ? ` · ${last.note}` : ''}
                  {o.trackingNumber ? ` · ${o.courier ? `${o.courier} ` : ''}${o.trackingNumber}` : ''}
                </p>
              </Link>
            );
          })
        )}
      </section>

      {data.recentOrders.length > 0 && (
        <section className="flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-headline-sm">Recent orders</h2>
            <Link to="/account/orders" className="text-label-md text-secondary hover:underline">See all orders</Link>
          </div>
          <div className="card divide-y divide-surface-container-high">
            {data.recentOrders.map((o) => (
              <Link key={o._id} to={`/account/orders/${o.orderId}`} className="flex items-center gap-3 p-space-md hover:bg-surface-container-low">
                <Img src={o.items[0]?.image} alt="" className="w-11 h-11 rounded-lg shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm truncate">{o.items.map((i) => i.productName).join(', ')}</p>
                  <p className="text-label-sm font-normal text-outline">{formatDate(o.createdAt)} · {o.orderId}</p>
                </div>
                <StatusBadge status={o.orderStatus} />
                <span className="text-label-lg w-24 text-right hidden sm:block">{money(o.grandTotal)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="text-label-sm font-normal text-outline">
        Member since {formatDate(s.memberSince || user.createdAt)} · {s.items} item{s.items === 1 ? '' : 's'} ordered · {s.delivered} delivered
      </p>
    </div>
  );
}

const ORDER_TABS = [
  ['', 'All'],
  ['active', 'On the way'],
  ['delivered', 'Delivered'],
  ['cancelled', 'Cancelled & returned'],
];

function Orders() {
  const [params, setParams] = useSearchParams();
  const group = params.get('group') || '';
  const page = Number(params.get('page')) || 1;
  const [q, setQ] = useState(params.get('q') || '');
  const money = useMoney();
  const set = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['orders', page, group, params.get('q') || ''],
    queryFn: () => api.myOrders({ page, group, q: params.get('q') || '' }),
    placeholderData: keepPreviousData,
  });
  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex flex-col sm:flex-row sm:items-center gap-space-sm">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {ORDER_TABS.map(([value, label]) => (
            <button key={label} type="button" onClick={() => set({ group: value, page: '' })} className={cn('chip h-9', group === value ? 'bg-primary text-on-primary' : 'bg-surface-container-low hover:bg-surface-container-high')}>
              {label}
            </button>
          ))}
        </div>
        <form className="relative sm:ml-auto sm:w-64" onSubmit={(e) => { e.preventDefault(); set({ q: q.trim(), page: '' }); }}>
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order no. or bag" className="input h-10 pl-10" aria-label="Search your orders" />
        </form>
      </div>
      {isLoading ? (
        <div className="flex flex-col gap-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data.items.length ? (
        group || params.get('q') ? (
          <EmptyState icon="search_off" title="No orders match" description="Try another tab or search." action={<button type="button" className="btn-tonal" onClick={() => { setQ(''); set({ group: '', q: '', page: '' }); }}>Show all orders</button>} />
        ) : (
          <EmptyState icon="receipt_long" title="No orders yet" description="When you place an order, you can track it here." action={<Link to="/shop" className="btn-primary">Start shopping</Link>} />
        )
      ) : (
        <OrderList items={data.items} money={money} page={data.page} pages={data.pages} onPage={(pg) => set({ page: String(pg) })} />
      )}
    </div>
  );
}

function OrderList({ items, money, page, pages, onPage }) {
  return (
    <div className="flex flex-col gap-space-md">
      {items.map((o) => (
        <Link key={o._id} to={`/account/orders/${o.orderId}`} className="card p-space-md hover:shadow-lift transition-shadow flex flex-col sm:flex-row sm:items-center gap-space-md">
          <div className="flex -space-x-3 shrink-0">
            {o.items.slice(0, 3).map((it, i) => <Img key={i} src={it.image} alt="" className="w-14 h-14 rounded-lg ring-2 ring-surface-container-lowest" />)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-label-lg">{o.orderId}</span>
              <StatusBadge status={o.orderStatus} />
            </div>
            <p className="text-body-sm text-on-surface-variant truncate">{o.items.map((i) => i.productName).join(', ')}</p>
            <p className="text-label-sm font-normal text-outline">{formatDateTime(o.createdAt)} · {o.items.reduce((n, i) => n + i.quantity, 0)} items</p>
          </div>
          <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1">
            <span className="text-price-md">{money(o.grandTotal)}</span>
            <span className="text-label-md text-secondary flex items-center gap-1">Details <Icon name="chevron_right" className="text-[16px]" /></span>
          </div>
        </Link>
      ))}
      <Pagination page={page} pages={pages} onChange={onPage} />
    </div>
  );
}

function OrderDetail() {
  const { id } = useParams();
  const money = useMoney();
  const qc = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const { data: o, isLoading, isError, error, refetch } = useQuery({ queryKey: ['order', id], queryFn: () => api.myOrder(id), select: (d) => d.order });
  const cancel = useMutation({
    mutationFn: () => api.cancelOrder(id, reason),
    onSuccess: () => {
      toast.success('Order cancelled');
      setCancelOpen(false);
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['my-coins'] }); // spent coins come back, earned ones are removed
    },
    onError: (e) => toast.error(e.message),
  });
  if (isLoading) return <Skeleton className="h-96" />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  const a = o.shippingAddress;
  // Cancellation policy: within 24 hours of ordering and before it ships (the server checks too).
  const canCancel = ['Pending', 'Confirmed'].includes(o.orderStatus) && Date.now() - new Date(o.createdAt).getTime() < 24 * 60 * 60 * 1000;
  return (
    <div className="flex flex-col gap-space-lg">
      <Link to="/account/orders" className="text-label-md text-secondary flex items-center gap-1 w-fit"><Icon name="arrow_back" className="text-[16px]" /> All orders</Link>
      <div className="card p-space-lg flex flex-wrap items-center justify-between gap-space-md">
        <div>
          <p className="text-label-sm uppercase tracking-wider text-outline">Order</p>
          <h2 className="text-headline-md">{o.orderId}</h2>
          <p className="text-body-sm text-on-surface-variant">Placed {formatDateTime(o.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={o.orderStatus} />
          <StatusBadge status={o.paymentStatus} />
          {canCancel && <Button variant="tonal" size="sm" icon="cancel" className="text-error" onClick={() => setCancelOpen(true)}>Cancel order</Button>}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-space-lg">
        <div className="lg:col-span-3 card p-space-lg flex flex-col gap-3">
          <h3 className="text-headline-sm">Items</h3>
          {o.items.map((it) => (
            <div key={`${it.productId}-${it.variant?.id}`} className="flex gap-3 items-center">
              <Img src={it.image} alt="" className="w-16 h-16 rounded-lg shrink-0" />
              <div className="flex-1 min-w-0">
                {it.slug ? <Link to={`/product/${it.slug}`} className="text-label-lg hover:text-secondary truncate block">{it.productName}</Link> : <p className="text-label-lg">{it.productName}</p>}
                <p className="text-label-sm font-normal text-outline">{it.variant?.name} · SKU {it.SKU}</p>
                <p className="text-label-sm font-normal text-outline">{it.quantity} × {money(it.unitPrice)}</p>
              </div>
              <span className="text-label-lg">{money(it.totalPrice)}</span>
            </div>
          ))}
          <div className="h-px bg-surface-container-high" />
          <div className="flex flex-col gap-1 text-body-sm">
            <div className="flex justify-between"><span className="text-on-surface-variant">Subtotal</span><span>{money(o.subtotal)}</span></div>
            {o.discount > 0 && <div className="flex justify-between text-secondary"><span>Discount {o.coupon?.code && `(${o.coupon.code})`}</span><span>−{money(o.discount)}</span></div>}
            {o.coinDiscount > 0 && <div className="flex justify-between text-success"><span>Coins used ({o.coinsRedeemed})</span><span>−{money(o.coinDiscount)}</span></div>}
            <div className="flex justify-between"><span className="text-on-surface-variant">Shipping ({o.shippingMethod?.label})</span><span>{o.shipping ? money(o.shipping) : 'Free'}</span></div>
            <div className="flex justify-between"><span className="text-on-surface-variant">Tax</span><span>{money(o.tax)}</span></div>
            <div className="flex justify-between text-headline-sm pt-1"><span>Total</span><span>{money(o.grandTotal)}</span></div>
            <p className="text-label-sm font-normal text-outline">Paid via {PAYMENT_LABELS[o.paymentMethod] || o.paymentMethod}</p>
            {o.coinsEarned > 0 && <p className="mt-1 text-[12px] px-2.5 py-2 rounded-lg bg-[#c08a2e]/10 text-on-surface">{o.orderStatus === 'Cancelled' || o.orderStatus === 'Returned' ? `The ${o.coinsEarned} coins from this order were removed.` : <>This order earned you <b>{o.coinsEarned} WILDTANE Coins</b> — use them on your next order.</>}</p>}
          </div>
          <div className="grid sm:grid-cols-2 gap-space-md pt-space-sm">
            <div>
              <p className="text-label-sm uppercase tracking-wider text-outline mb-1">Delivery address</p>
              <p className="text-body-sm text-on-surface-variant flex flex-col">
                <span className="text-on-surface font-semibold">{a.fullName}</span>
                <span>{a.addressLine1}{a.addressLine2 && `, ${a.addressLine2}`}</span>
                <span>{a.city}, {a.state} {a.postalCode}</span>
                <span>{countryName(a.country)}</span>
                <span>{a.phone}</span>
              </p>
            </div>
            {(o.trackingNumber || o.courier) && (
              <div>
                <p className="text-label-sm uppercase tracking-wider text-outline mb-1">Tracking</p>
                <p className="text-body-sm">{o.courier}</p>
                <p className="text-label-lg">{o.trackingNumber}</p>
              </div>
            )}
          </div>
        </div>
        <div className="lg:col-span-2 card p-space-lg">
          <h3 className="text-headline-sm mb-space-md">Status timeline</h3>
          <OrderTimeline order={o} />
        </div>
      </div>
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this order?" size="sm">
        <div className="flex flex-col gap-space-md">
          <p className="text-body-sm text-on-surface-variant">Items will be released back to stock. This can't be undone.</p>
          <Field label="Reason (optional)">
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="tonal" onClick={() => setCancelOpen(false)}>Keep order</Button>
            <Button variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate()}>Cancel order</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Addresses() {
  const user = useUser();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null); // 'new' | address
  const { data, isLoading } = useQuery({ queryKey: ['addresses'], queryFn: api.addresses, select: (d) => d.addresses });
  const setData = (res) => qc.setQueryData(['addresses'], { addresses: res.addresses });
  const remove = useMutation({ mutationFn: api.deleteAddress, onSuccess: (res) => { setData(res); toast.success('Address removed'); }, onError: (e) => toast.error(e.message) });
  const makeDefault = useMutation({ mutationFn: api.setDefaultAddress, onSuccess: (res) => { setData(res); toast.success('Default address updated'); } });

  return (
    <div className="flex flex-col gap-space-lg">
      <div className="flex items-center justify-between">
        <p className="text-body-sm text-on-surface-variant">{data?.length || 0} of 10 saved addresses</p>
        <Button icon="add" size="sm" onClick={() => setEditing('new')} disabled={data?.length >= 10}>Add address</Button>
      </div>
      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-space-md">{[1, 2].map((i) => <Skeleton key={i} className="h-48" />)}</div>
      ) : !data?.length ? (
        <EmptyState icon="location_on" title="No saved addresses" description="Save addresses for faster checkout." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          {data.map((a) => (
            <AddressCard
              key={a._id}
              address={a}
              actions={
                <>
                  <button type="button" className="text-label-md text-secondary hover:underline" onClick={() => setEditing(a)}>Edit</button>
                  {!a.isDefault && <button type="button" className="text-label-md hover:underline" onClick={() => makeDefault.mutate(a._id)}>Set default</button>}
                  <button
                    type="button"
                    className="text-label-md text-error hover:underline ml-auto"
                    onClick={async () => {
                      if (await confirm({ title: 'Delete this address?', message: `${a.label} — ${a.addressLine1}`, confirmLabel: 'Delete' })) remove.mutate(a._id);
                    }}
                  >
                    Delete
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'New address' : 'Edit address'} size="lg">
        {editing && (
          <AddressForm
            defaultValues={editing === 'new' ? emptyAddress(user) : editing}
            onCancel={() => setEditing(null)}
            onSubmit={async (values) => {
              const res = editing === 'new' ? await api.addAddress(values) : await api.updateAddress(editing._id, values);
              setData(res);
              setEditing(null);
              toast.success('Address saved');
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function MyReviews() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { data, isLoading } = useQuery({ queryKey: ['my-reviews'], queryFn: api.myReviews, select: (d) => d.reviews });
  const remove = useMutation({ mutationFn: api.deleteReview, onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-reviews'] }); toast.success('Review deleted'); } });
  if (isLoading) return <Skeleton className="h-40" />;
  if (!data?.length) return <EmptyState icon="reviews" title="No reviews yet" description="Reviews you write on products appear here." />;
  return (
    <div className="flex flex-col gap-space-md">
      {data.map((r) => (
        <div key={r._id} className="card p-space-md flex gap-space-md">
          <Img src={r.product?.images?.[0]?.url} alt="" className="w-16 h-16 rounded-lg shrink-0" />
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <Link to={`/product/${r.product?.slug}`} className="text-label-lg hover:text-secondary">{r.product?.name}</Link>
            <Stars value={r.rating} />
            {r.title && <p className="text-label-lg">{r.title}</p>}
            <p className="text-body-sm text-on-surface-variant">{r.comment}</p>
            <p className="text-label-sm font-normal text-outline">{formatDate(r.createdAt)} {r.isVerifiedPurchase && '· Verified purchase'} {r.status !== 'approved' && `· ${r.status}`}</p>
          </div>
          <button type="button" className="btn-icon text-error self-start" aria-label="Delete review" onClick={async () => (await confirm({ title: 'Delete this review?', confirmLabel: 'Delete' })) && remove.mutate(r._id)}>
            <Icon name="delete" />
          </button>
        </div>
      ))}
    </div>
  );
}

function Recent() {
  const { data, isLoading } = useQuery({ queryKey: ['recently-viewed'], queryFn: api.recentlyViewed, select: (d) => d.products });
  const guestIds = useSelector((s) => s.guestLists.recent);
  const guest = useProductsByIds(data?.length ? [] : guestIds);
  const list = data?.length ? data : guest.data;
  if (!isLoading && !list?.length) return <EmptyState icon="history" title="Nothing viewed yet" description="Products you browse will show up here." />;
  return <ProductGrid products={list || []} loading={isLoading} count={3} className="lg:grid-cols-2 xl:grid-cols-3" />;
}

function Security() {
  const { logout } = useAuthActions();
  const navigate = useNavigate();
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(
      z
        .object({
          currentPassword: z.string().min(1, 'Enter your current password'),
          newPassword: z.string().min(8, 'Use at least 8 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number'),
          confirm: z.string(),
        })
        .refine((d) => d.newPassword === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })
    ),
  });
  const onSubmit = async ({ confirm: _confirm, ...values }) => {
    try {
      await api.changePassword(values);
      reset();
      toast.success('Password updated. Other devices were signed out.');
    } catch (err) {
      applyServerErrors(err, setError);
      toast.error(err.message);
    }
  };
  return (
    <div className="flex flex-col gap-space-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="card p-space-lg flex flex-col gap-space-md max-w-lg" noValidate>
        <h3 className="text-headline-sm">Change password</h3>
        <Field label="Current password" error={errors.currentPassword?.message}><Input type="password" autoComplete="current-password" error={errors.currentPassword} {...register('currentPassword')} /></Field>
        <Field label="New password" error={errors.newPassword?.message}><Input type="password" autoComplete="new-password" error={errors.newPassword} {...register('newPassword')} /></Field>
        <Field label="Confirm new password" error={errors.confirm?.message}><Input type="password" autoComplete="new-password" error={errors.confirm} {...register('confirm')} /></Field>
        <Button type="submit" loading={isSubmitting} className="self-start">Update password</Button>
      </form>
      <div className="card p-space-lg flex flex-col sm:flex-row sm:items-center justify-between gap-space-md max-w-lg">
        <div>
          <h3 className="text-headline-sm">Sign out everywhere</h3>
          <p className="text-body-sm text-on-surface-variant">Ends sessions on all devices, including this one.</p>
        </div>
        <Button
          variant="tonal"
          icon="logout"
          onClick={async () => {
            await api.logoutAll().catch(() => {});
            await logout();
            toast.success('Signed out on all devices');
            navigate('/login');
          }}
        >
          Sign out all
        </Button>
      </div>
    </div>
  );
}

export default function Account() {
  const user = useUser();
  const { logout } = useAuthActions();
  const navigate = useNavigate();
  return (
    <div className="container-x py-space-xl">
      <Seo title="My Account" noindex />
      <div className="flex flex-col gap-1 mb-space-lg">
        <span className="eyebrow">My account</span>
        <h1 className="text-headline-xl-mobile md:text-headline-xl">Hello, {user.name.split(' ')[0]}.</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-start">
        <nav className="lg:col-span-3 card p-2 flex lg:flex-col overflow-x-auto scrollbar-none lg:sticky lg:top-32" aria-label="Account">
          {NAV.map(([to, icon, label]) => (
            <NavLink key={label} to={to ? `/account/${to}` : '/account'} end={to === ''} className={({ isActive }) => cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-sm whitespace-nowrap transition-colors', isActive ? 'bg-primary text-on-primary' : 'hover:bg-surface-container-low')}>
              <Icon name={icon} className="text-[20px]" /> {label}
            </NavLink>
          ))}
          <Link to="/wishlist" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-sm whitespace-nowrap hover:bg-surface-container-low"><Icon name="favorite" className="text-[20px]" /> Wishlist</Link>
          {user.role === 'admin' && <Link to="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-sm whitespace-nowrap text-secondary font-semibold hover:bg-surface-container-low"><Icon name="dashboard" className="text-[20px]" /> Admin</Link>}
          <button type="button" onClick={async () => { await logout(); navigate('/'); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-sm whitespace-nowrap text-error hover:bg-surface-container-low">
            <Icon name="logout" className="text-[20px]" /> Sign out
          </button>
        </nav>
        <div className="lg:col-span-9">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="profile" element={<Profile />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="coins" element={<Coins />} />
            <Route path="addresses" element={<Addresses />} />
            <Route path="reviews" element={<MyReviews />} />
            <Route path="recent" element={<Recent />} />
            <Route path="security" element={<Security />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
