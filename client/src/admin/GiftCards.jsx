import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { formatDate, formatDateTime, formatINR } from '../lib/format';
import { Badge, Button, EmptyState, Field, Icon, Input, Modal, Pagination, Skeleton, Toggle } from '../components/ui';
import { DataTable, FilterSelect, PageHeader, SearchBox, Toolbar, useListParams } from './kit';

function cardState(c) {
  if (!c.isActive) return ['Inactive', 'neutral'];
  if (c.expiryDate && new Date(c.expiryDate) < Date.now()) return ['Expired', 'danger'];
  if (c.currentBalance <= 0) return ['Used up', 'neutral'];
  return ['Active', 'teal'];
}

function IssueForm({ onDone }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [expiry, setExpiry] = useState('');
  const [withPin, setWithPin] = useState(false);
  const [note, setNote] = useState('');
  const [issued, setIssued] = useState(null);
  const issue = useMutation({
    mutationFn: () => adminApi.issueGiftCard({ amount: Number(amount), expiryDate: expiry || undefined, withPin, note }),
    onSuccess: (res) => {
      setIssued(res);
      qc.invalidateQueries({ queryKey: ['admin', 'giftcards'] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (issued) {
    return (
      <div className="flex flex-col gap-space-md">
        <p className="text-body-md">Gift card issued. Share these details with the customer — <strong>the PIN is shown only now</strong> and can’t be viewed again.</p>
        <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-1">
          <p className="text-label-sm uppercase tracking-wider text-outline">Code</p>
          <p className="text-headline-sm font-mono tracking-wider">{issued.card.code}</p>
          {issued.pin && (
            <>
              <p className="text-label-sm uppercase tracking-wider text-outline mt-2">PIN</p>
              <p className="text-headline-sm font-mono tracking-widest">{issued.pin}</p>
            </>
          )}
          <p className="text-body-sm mt-2">Value {formatINR(issued.card.initialBalance)} · expires {formatDate(issued.card.expiryDate)}</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="tonal"
            icon="content_copy"
            onClick={async () => {
              await navigator.clipboard.writeText(`WILDTANE gift card\nCode: ${issued.card.code}${issued.pin ? `\nPIN: ${issued.pin}` : ''}\nValue: ${formatINR(issued.card.initialBalance)}`).catch(() => {});
              toast.success('Copied');
            }}
          >
            Copy details
          </Button>
          <Button onClick={onDone}>Done</Button>
        </div>
      </div>
    );
  }
  return (
    <form
      className="grid grid-cols-1 md:grid-cols-2 gap-space-md"
      onSubmit={(e) => {
        e.preventDefault();
        if (!(Number(amount) > 0)) return toast.error('Enter an amount above ₹0');
        issue.mutate();
      }}
    >
      <Field label="Value (₹)" required><Input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
      <Field label="Expires on" hint="Blank = one year from today"><Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></Field>
      <Field label="Note (internal)" className="md:col-span-2" hint="e.g. who it was sold or given to"><Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} /></Field>
      <div className="md:col-span-2 flex items-center justify-between gap-2 pt-2">
        <Toggle checked={withPin} onChange={setWithPin} label="Protect with a 4-digit PIN" />
        <div className="flex gap-2">
          <Button type="button" variant="tonal" onClick={onDone}>Cancel</Button>
          <Button type="submit" loading={issue.isPending}>Issue gift card</Button>
        </div>
      </div>
      <p className="md:col-span-2 text-label-sm font-normal text-outline">A random, hard-to-guess code is generated. The card is usable at checkout straight away.</p>
    </form>
  );
}

function CardDetail({ id, onClose }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'giftcard', id], queryFn: () => adminApi.giftCard(id) });
  const adjust = useMutation({
    mutationFn: (body) => adminApi.adjustGiftCard(id, body),
    onSuccess: () => {
      toast.success('Gift card updated');
      setAmount('');
      setNote('');
      qc.invalidateQueries({ queryKey: ['admin', 'giftcard', id] });
      qc.invalidateQueries({ queryKey: ['admin', 'giftcards'] });
    },
    onError: (e) => toast.error(e.message),
  });
  if (isLoading) return <Skeleton className="h-64" />;
  const c = data.card;
  const [label, tone] = cardState(c);
  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-headline-sm font-mono tracking-wider">{c.code}</p>
          <p className="text-body-sm text-on-surface-variant">Issued {formatDate(c.createdAt)} · expires {formatDate(c.expiryDate)}{c.hasPin ? ' · PIN protected' : ''}</p>
        </div>
        <Badge tone={tone}>{label}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl bg-surface-container-low"><p className="text-label-sm text-outline">Balance</p><p className="text-headline-sm">{formatINR(c.currentBalance)}</p></div>
        <div className="p-3 rounded-xl bg-surface-container-low"><p className="text-label-sm text-outline">Original value</p><p className="text-headline-sm">{formatINR(c.initialBalance)}</p></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2 items-end">
        <Field label="Change balance (₹)" hint="+ adds, − removes"><Input type="number" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Reason (saved in the log)"><Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} /></Field>
        <Button disabled={!Number(amount) || note.trim().length < 3} loading={adjust.isPending} onClick={() => adjust.mutate({ amount: Number(amount), note })}>Apply</Button>
      </div>
      <div className="flex justify-between gap-2">
        <Button
          variant="tonal"
          icon={c.isActive ? 'block' : 'check_circle'}
          onClick={() => {
            const reason = window.prompt(c.isActive ? 'Why are you switching this card off?' : 'Why are you switching this card back on?');
            if (reason && reason.trim().length >= 3) adjust.mutate({ isActive: !c.isActive, note: reason.trim() });
          }}
        >
          {c.isActive ? 'Switch off' : 'Switch on'}
        </Button>
        <Button variant="tonal" onClick={onClose}>Close</Button>
      </div>
      <section>
        <h3 className="text-label-lg mb-2">Ledger</h3>
        <div className="card divide-y divide-surface-container-high max-h-72 overflow-y-auto">
          {data.ledger.length === 0 ? (
            <p className="p-3 text-body-sm text-outline">No movements yet.</p>
          ) : (
            data.ledger.map((t) => (
              <div key={t._id} className="p-3 flex items-center gap-3 text-body-sm">
                <span className="w-24 capitalize text-label-md">{t.type}</span>
                <span className="flex-1 min-w-0 truncate text-on-surface-variant">
                  {t.orderId && `${t.orderId} · `}{t.note}{t.by?.name ? ` · by ${t.by.name}` : ''}
                </span>
                <span className="text-outline whitespace-nowrap">{formatDateTime(t.createdAt)}</span>
                <span className={t.amount < 0 ? 'text-error w-24 text-right' : 'text-success w-24 text-right'}>{t.amount > 0 ? '+' : ''}{formatINR(t.amount)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default function GiftCards() {
  const [p, set] = useListParams({ page: '1' });
  const [issuing, setIssuing] = useState(false);
  const [openId, setOpenId] = useState(null);
  const query = useQuery({ queryKey: ['admin', 'giftcards', p], queryFn: () => adminApi.giftCards(p), placeholderData: keepPreviousData });

  const columns = [
    { key: 'code', header: 'Code', render: (c) => <span className="inline-flex px-2 py-1 rounded-lg border border-dashed border-outline-variant text-label-lg font-mono tracking-wider">{c.code}</span> },
    { key: 'balance', header: 'Balance', render: (c) => <span className="text-label-lg">{formatINR(c.currentBalance)} <span className="text-label-sm font-normal text-outline">of {formatINR(c.initialBalance)}</span></span> },
    { key: 'expiry', header: 'Expires', render: (c) => <span className="whitespace-nowrap">{formatDate(c.expiryDate)}</span> },
    { key: 'pin', header: 'PIN', render: (c) => (c.hasPin ? <Icon name="lock" className="text-[18px] text-outline" /> : '—') },
    { key: 'state', header: 'Status', render: (c) => { const [l, t] = cardState(c); return <Badge tone={t}>{l}</Badge>; } },
  ];

  return (
    <>
      <PageHeader
        title="Gift cards"
        subtitle="Issue WILDTANE gift cards, check balances and see every redemption. Customers apply them at checkout and pay any remainder another way."
        actions={<Button icon="add" onClick={() => setIssuing(true)}>Issue gift card</Button>}
      />
      <Toolbar>
        <SearchBox value={p.q} onChange={(q) => set({ q })} placeholder="Search code…" />
        <FilterSelect label="Status" value={p.status} onChange={(v) => set({ status: v })} options={[['', 'All'], ['active', 'Switched on'], ['inactive', 'Switched off']]} />
      </Toolbar>
      <DataTable
        columns={columns}
        rows={query.data?.items || []}
        loading={query.isLoading}
        error={query.error}
        onRetry={query.refetch}
        onRowClick={(c) => setOpenId(c._id)}
        empty={<EmptyState icon="card_giftcard" title="No gift cards yet" action={<Button onClick={() => setIssuing(true)}>Issue a gift card</Button>} />}
      />
      <Pagination className="mt-space-md" page={query.data?.page} pages={query.data?.pages} onChange={(page) => set({ page })} />
      <Modal open={issuing} onClose={() => setIssuing(false)} title="Issue a gift card" size="lg">
        {issuing && <IssueForm onDone={() => setIssuing(false)} />}
      </Modal>
      <Modal open={Boolean(openId)} onClose={() => setOpenId(null)} title="Gift card" size="lg">
        {openId && <CardDetail id={openId} onClose={() => setOpenId(null)} />}
      </Modal>
    </>
  );
}
