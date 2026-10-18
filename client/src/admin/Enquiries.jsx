import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { cn, formatDateTime, imgUrl, timeAgo } from '../lib/format';
import { countryName } from '../lib/countries';
import { Button, Drawer, EmptyState, Field, Icon, Input, Modal, Pagination, Textarea, useConfirm } from '../components/ui';
import NotFound from '../pages/NotFound';
import { DataTable, PageHeader, SearchBox, Toolbar, useListParams } from './kit';

const CONFIG = {
  corporate: {
    title: 'Corporate enquiries',
    subtitle: 'Bulk and custom-branding leads from the Corporate Bulk page.',
    statuses: ['new', 'contacted', 'quoted', 'won', 'closed'],
  },
  contact: {
    title: 'Contact messages',
    subtitle: 'Messages from the Contact page.',
    statuses: ['new', 'read', 'replied', 'closed'],
  },
};

const TONE = { new: 'bg-secondary text-on-secondary', contacted: 'bg-primary-fixed text-primary-container', read: 'bg-primary-fixed text-primary-container', quoted: 'bg-tertiary-fixed text-tertiary-container', replied: 'bg-secondary-container text-on-secondary-fixed', won: 'bg-secondary-container text-on-secondary-fixed', closed: 'bg-surface-container-highest text-on-surface-variant' };

function Pill({ status }) {
  return <span className={cn('px-2.5 py-1 rounded-full text-label-sm uppercase whitespace-nowrap', TONE[status])}>{status}</span>;
}

function Detail({ kind, item, onClose }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [notes, setNotes] = useState(item.adminNotes || '');
  useEffect(() => setNotes(item.adminNotes || ''), [item]);
  const update = useMutation({
    mutationFn: (body) => adminApi.updateEnquiry(kind, item._id, body),
    onSuccess: () => { toast.success('Saved'); qc.invalidateQueries({ queryKey: ['admin', 'enquiries', kind] }); qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] }); },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => adminApi.deleteEnquiry(kind, item._id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['admin', 'enquiries', kind] }); onClose(); },
  });
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyForm, setReplyForm] = useState({
    to: item.email || '',
    subject: kind === 'corporate' ? `WILDTANE corporate quote for ${item.company}` : `Re: ${item.subject || 'Your enquiry'}`,
    message: '',
  });

  const sendReply = useMutation({
    mutationFn: (body) => adminApi.replyEnquiryEmail(kind, item._id, body),
    onSuccess: (res) => {
      toast.success(res.message || 'Reply delivered from info@wildtane.com');
      setReplyModalOpen(false);
      qc.invalidateQueries({ queryKey: ['admin', 'enquiries', kind] });
    },
    onError: (e) => toast.error(e.message),
  });

  const rows =
    kind === 'corporate'
      ? [['Company', item.company], ['Contact', item.contactPerson], ['Email', item.email], ['Phone', item.phone], ['Country', countryName(item.country)], ['Address', item.address], ['Product type', item.productType], ['Quantity', `${item.quantity} units`], ['Customisation', item.customization], ['Message', item.message]]
      : [['Name', item.name], ['Email', item.email], ['Phone', item.phone], ['Subject', item.subject], ['Order ID', item.orderId], ['Message', item.message]];
  const subject = kind === 'corporate' ? `WILDTANE corporate quote for ${item.company}` : `Re: ${item.subject}`;

  return (
    <div className="p-space-lg flex flex-col gap-space-lg">
      <div className="flex items-center justify-between gap-2">
        <span className="text-label-sm font-normal text-outline">Received {formatDateTime(item.createdAt)}</span>
        <Pill status={item.status} />
      </div>
      <dl className="flex flex-col gap-3">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k}>
            <dt className="text-label-sm uppercase tracking-wider text-outline">{k}</dt>
            <dd className="text-body-sm whitespace-pre-line">{v}</dd>
          </div>
        ))}
      </dl>
      {item.logo?.url && (
        <a href={imgUrl(item.logo.url)} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container">
          {/\.(png|jpe?g|webp|gif|svg)$/i.test(item.logo.url) || item.logo.url.includes('cloudinary') ? <img src={imgUrl(item.logo.url)} alt="Company logo" className="w-14 h-14 object-contain rounded bg-white" /> : <Icon name="description" className="text-[32px]" />}
          <span className="text-label-md">{item.logo.originalName || 'Uploaded logo'}</span>
          <Icon name="download" className="ml-auto" />
        </a>
      )}
      <Button
        variant="filled"
        icon="send"
        className="w-full justify-center gap-2"
        onClick={() => {
          setReplyForm({
            to: item.email || '',
            subject: kind === 'corporate' ? `WILDTANE corporate quote for ${item.company}` : `Re: ${item.subject || 'Your enquiry'}`,
            message: '',
          });
          setReplyModalOpen(true);
        }}
      >
        Send Email Reply (from info@wildtane.com)
      </Button>
      <Field label="Status">
        <div className="flex flex-wrap gap-1.5">
          {CONFIG[kind].statuses.map((s) => (
            <button key={s} type="button" onClick={() => update.mutate({ status: s })} className={cn('chip h-8 capitalize', item.status === s ? 'bg-primary text-on-primary' : 'bg-surface-container-low hover:bg-surface-container-high')}>{s}</button>
          ))}
        </div>
      </Field>
      <Field label="Internal notes">
        <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Quote sent, follow up Friday…" />
      </Field>
      <div className="flex justify-between">
        <Button variant="tonal" icon="delete" className="text-error" onClick={async () => (await confirm({ title: 'Delete this enquiry?', confirmLabel: 'Delete' })) && remove.mutate()}>Delete</Button>
        <Button loading={update.isPending} onClick={() => update.mutate({ adminNotes: notes })}>Save notes</Button>
      </div>

      <Modal open={replyModalOpen} onClose={() => setReplyModalOpen(false)} title={`Reply to ${item.contactPerson || item.name || 'Enquiry'}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendReply.mutate(replyForm);
          }}
          className="flex flex-col gap-4 p-space-md"
        >
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container-low text-label-sm text-outline">
            <Icon name="verified_user" className="text-secondary text-[18px]" />
            <span>Replying directly from authenticated sender <b>info@wildtane.com</b></span>
          </div>
          <div>
            <label className="block text-label-sm uppercase tracking-wider text-outline mb-1">Recipient</label>
            <Input
              type="email"
              required
              value={replyForm.to}
              onChange={(e) => setReplyForm({ ...replyForm, to: e.target.value })}
              placeholder="recipient@example.com"
            />
          </div>
          <div>
            <label className="block text-label-sm uppercase tracking-wider text-outline mb-1">Subject</label>
            <Input
              type="text"
              required
              value={replyForm.subject}
              onChange={(e) => setReplyForm({ ...replyForm, subject: e.target.value })}
              placeholder="Subject line"
            />
          </div>
          <div>
            <label className="block text-label-sm uppercase tracking-wider text-outline mb-1">Reply Message</label>
            <Textarea
              rows={5}
              required
              value={replyForm.message}
              onChange={(e) => setReplyForm({ ...replyForm, message: e.target.value })}
              placeholder="Write your reply to the customer…"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="tonal" type="button" onClick={() => setReplyModalOpen(false)}>Cancel</Button>
            <Button variant="filled" type="submit" icon="send" loading={sendReply.isPending} disabled={!replyForm.to || !replyForm.message.trim()}>
              Send Email Reply
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function Enquiries() {
  const { kind } = useParams();
  const cfg = CONFIG[kind];
  const [p, set] = useListParams({ page: '1' });
  const [openId, setOpenId] = useState(null);
  const query = useQuery({ queryKey: ['admin', 'enquiries', kind, p], queryFn: () => adminApi.enquiries(kind, { ...p, limit: 15 }), placeholderData: keepPreviousData, enabled: Boolean(cfg) });
  if (!cfg) return <NotFound />;
  const open = query.data?.items.find((i) => i._id === openId);
  const counts = query.data?.statusCounts || {};

  const columns =
    kind === 'corporate'
      ? [
          { key: 'company', header: 'Company', render: (r) => <div><p className="text-label-lg">{r.company}</p><p className="text-label-sm font-normal text-outline">{r.contactPerson} · {r.email}</p></div> },
          { key: 'type', header: 'Product', render: (r) => r.productType },
          { key: 'qty', header: 'Qty', align: 'right', render: (r) => <span className="text-label-lg">{r.quantity}</span> },
          { key: 'country', header: 'Country', render: (r) => countryName(r.country) },
          { key: 'logo', header: 'Logo', render: (r) => (r.logo?.url ? <Icon name="attach_file" className="text-secondary" /> : '—') },
          { key: 'when', header: 'Received', render: (r) => <span className="whitespace-nowrap text-on-surface-variant">{timeAgo(r.createdAt)}</span> },
          { key: 'status', header: 'Status', render: (r) => <Pill status={r.status} /> },
        ]
      : [
          { key: 'name', header: 'From', render: (r) => <div><p className="text-label-lg">{r.name}</p><p className="text-label-sm font-normal text-outline">{r.email}</p></div> },
          { key: 'subject', header: 'Subject', render: (r) => <div className="max-w-md"><p className="truncate">{r.subject}</p><p className="text-label-sm font-normal text-outline truncate">{r.message}</p></div> },
          { key: 'order', header: 'Order', render: (r) => r.orderId || '—' },
          { key: 'when', header: 'Received', render: (r) => <span className="whitespace-nowrap text-on-surface-variant">{timeAgo(r.createdAt)}</span> },
          { key: 'status', header: 'Status', render: (r) => <Pill status={r.status} /> },
        ];

  return (
    <>
      <PageHeader title={cfg.title} subtitle={cfg.subtitle} />
      <div className="flex gap-2 overflow-x-auto scrollbar-none mb-space-md">
        {['', ...cfg.statuses].map((s) => (
          <button key={s || 'all'} type="button" onClick={() => set({ status: s })} className={cn('chip capitalize', (p.status || '') === s ? 'bg-primary text-on-primary' : 'bg-surface-container-low hover:bg-surface-container-high')}>
            {s || 'All'} {s && counts[s] ? <span className="opacity-70">({counts[s]})</span> : null}
          </button>
        ))}
      </div>
      <Toolbar><SearchBox value={p.q} onChange={(q) => set({ q })} placeholder="Search…" /></Toolbar>
      <DataTable columns={columns} rows={query.data?.items || []} loading={query.isLoading} error={query.error} onRetry={query.refetch} onRowClick={(r) => setOpenId(r._id)} empty={<EmptyState icon="inbox" title="Inbox zero" description="No enquiries match this view." />} />
      <Pagination className="mt-space-md" page={query.data?.page} pages={query.data?.pages} onChange={(page) => set({ page })} />
      <Drawer open={Boolean(open)} onClose={() => setOpenId(null)} title={open ? (kind === 'corporate' ? open.company : open.name) : ''} width="max-w-lg">
        {open && <Detail kind={kind} item={open} onClose={() => setOpenId(null)} />}
      </Drawer>
    </>
  );
}
