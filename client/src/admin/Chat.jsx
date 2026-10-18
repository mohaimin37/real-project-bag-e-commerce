import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { cn, formatDateTime, formatINR, initials } from '../lib/format';
import { Button, EmptyState, Icon, PageLoader, Skeleton, Spinner, StatusBadge } from '../components/ui';
import { PageHeader } from './kit';

export default function AdminChat() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [activeThreadId, setActiveThreadId] = useState(params.get('threadId') || '');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef(null);

  const orderIdParam = params.get('orderId');

  // Query threads list with auto-polling every 3.5s
  const { data: threadsData, isLoading: loadingThreads } = useQuery({
    queryKey: ['admin', 'chat-threads', filterStatus, searchQuery],
    queryFn: () =>
      adminApi.chatThreads({
        status: filterStatus === 'all' ? undefined : filterStatus,
        q: searchQuery.trim() || undefined,
        limit: 50,
      }),
    refetchInterval: 3500,
  });

  const threads = threadsData?.items || [];

  // Automatically select thread if orderIdParam passed or first thread
  useEffect(() => {
    if (orderIdParam && threads.length > 0) {
      const matched = threads.find((t) => t.orderId === orderIdParam);
      if (matched) setActiveThreadId(matched.threadId);
    } else if (!activeThreadId && threads.length > 0) {
      setActiveThreadId(threads[0].threadId);
    }
  }, [orderIdParam, threads, activeThreadId]);

  // Query active thread with full messages, polling every 3s
  const { data: activeData, isLoading: loadingActive } = useQuery({
    queryKey: ['admin', 'chat-thread', activeThreadId],
    queryFn: () => adminApi.chatThread(activeThreadId),
    enabled: Boolean(activeThreadId),
    refetchInterval: 3000,
  });

  const activeThread = activeData?.thread;
  const messages = activeThread?.messages || [];

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeThreadId]);

  const [notifyEmail, setNotifyEmail] = useState(true);

  // Send reply mutation
  const sendReply = useMutation({
    mutationFn: (payload) => adminApi.sendAdminChatMessage(activeThreadId, payload),
    onSuccess: (data) => {
      setReplyText('');
      if (data?.emailOutcome?.delivered) {
        toast.success(`Reply sent & delivered to ${activeThread?.customerEmail || 'customer'} from info@wildtane.com`);
      } else if (data?.emailOutcome?.error) {
        toast.error(`Reply posted in chat, but email notice failed: ${data.emailOutcome.error}`);
      } else {
        toast.success('Reply sent to customer');
      }
      qc.invalidateQueries({ queryKey: ['admin', 'chat-thread', activeThreadId] });
      qc.invalidateQueries({ queryKey: ['admin', 'chat-threads'] });
    },
    onError: (err) => toast.error(err.message || 'Failed to send reply'),
  });

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: (status) => adminApi.updateChatStatus(activeThreadId, status),
    onSuccess: (res) => {
      toast.success(`Chat marked as ${res.thread.status}`);
      qc.invalidateQueries({ queryKey: ['admin', 'chat-thread', activeThreadId] });
      qc.invalidateQueries({ queryKey: ['admin', 'chat-threads'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSend = (e) => {
    e?.preventDefault();
    const trimmed = replyText.trim();
    if (!trimmed || sendReply.isPending) return;
    sendReply.mutate({ text: trimmed, notifyEmail });
  };

  const QUICK_REPLIES = [
    'Hello! How can we assist you today?',
    'We have verified your cancellation request and are processing it.',
    'Your refund will be returned via UPI / original payment method within 3-5 business days.',
    'Could you please share your UPI ID or QR scanner image for refund processing?',
    'Your order is on its way. Let us know if you need anything else!',
  ];

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-100px)]">
      <PageHeader
        title="Support Chat"
        eyebrow="Customer Care"
        subtitle="Live user support, order cancellation inquiries, refund requests and customer messaging."
      />

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 rounded-2xl border border-surface-container-high bg-surface-container-lowest overflow-hidden shadow-sm">
        {/* Left Column: Conversations List (lg:col-span-4) */}
        <div className="lg:col-span-4 flex flex-col border-r border-surface-container-high h-full min-h-0 bg-surface-container-low/40">
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-surface-container-high flex flex-col gap-2">
            <div className="relative">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, order ID, text..."
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-surface-container-lowest text-[13px] border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-secondary"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[12px]">
              {[
                ['all', 'All'],
                ['waiting_admin', 'Needs Reply'],
                ['open', 'Open'],
                ['resolved', 'Resolved'],
              ].map(([st, label]) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0',
                    filterStatus === st
                      ? 'bg-secondary text-on-secondary font-bold'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Threads List */}
          <div className="flex-1 overflow-y-auto divide-y divide-surface-container-high min-h-0">
            {loadingThreads && threads.length === 0 && (
              <div className="p-4 flex flex-col gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            )}

            {!loadingThreads && threads.length === 0 && (
              <div className="p-6 text-center text-outline text-body-sm">
                <Icon name="chat_bubble_outline" className="text-[32px] mx-auto mb-2 opacity-60" />
                No chat conversations found.
              </div>
            )}

            {threads.map((t) => {
              const active = t.threadId === activeThreadId;
              const hasUnread = t.unreadAdmin > 0;
              const isCancellation = t.topic?.toLowerCase().includes('cancellation') || t.orderId;

              return (
                <div
                  key={t._id}
                  onClick={() => {
                    setActiveThreadId(t.threadId);
                    setParams({ threadId: t.threadId });
                  }}
                  className={cn(
                    'p-3 cursor-pointer transition-all flex items-start gap-2.5',
                    active
                      ? 'bg-secondary/10 border-l-4 border-secondary'
                      : 'hover:bg-surface-container/60',
                    hasUnread && !active && 'bg-amber-500/5'
                  )}
                >
                  <span className="w-9 h-9 rounded-full bg-secondary/20 text-secondary font-bold text-label-md flex items-center justify-center shrink-0">
                    {initials(t.customerName || 'Customer')}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className={cn('text-[13px] truncate', hasUnread ? 'font-bold text-on-surface' : 'font-medium')}>
                        {t.customerName}
                      </span>
                      <span className="text-[10px] text-outline shrink-0">
                        {formatDateTime(t.updatedAt || t.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      {isCancellation && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/15 text-rose-500">
                          {t.orderId ? `Order #${t.orderId}` : 'Cancellation'}
                        </span>
                      )}
                      <span
                        className={cn(
                          'px-1.5 py-0.2 rounded text-[10px] font-semibold',
                          t.status === 'resolved'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : t.status === 'waiting_admin'
                            ? 'bg-amber-500/15 text-amber-500'
                            : 'bg-surface-container-high text-outline'
                        )}
                      >
                        {t.status === 'waiting_admin' ? 'Awaiting Reply' : t.status}
                      </span>
                      {hasUnread && (
                        <span className="ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-600 text-white animate-pulse">
                          {t.unreadAdmin} new
                        </span>
                      )}
                    </div>

                    <p className={cn('text-[11.5px] truncate', hasUnread ? 'font-semibold text-on-surface' : 'text-on-surface-variant')}>
                      {t.lastMessage?.text || 'No messages yet'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Conversation (lg:col-span-8) */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-0 bg-surface-container-lowest">
          {!activeThreadId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-outline">
              <Icon name="forum" className="text-[48px] text-secondary/40 mb-3" />
              <p className="font-semibold text-label-lg text-on-surface">Select a conversation to view and reply</p>
              <p className="text-body-sm text-outline max-w-sm mt-1">
                Customer questions, order cancellation requests and live messages will appear here.
              </p>
            </div>
          ) : loadingActive && !activeThread ? (
            <div className="flex-1 flex items-center justify-center">
              <Spinner className="w-8 h-8 text-secondary" />
            </div>
          ) : (
            <>
              {/* Conversation Top Header */}
              <div className="p-3.5 border-b border-surface-container-high flex flex-wrap items-center justify-between gap-3 bg-surface-container-low/30">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-full bg-secondary/20 text-secondary font-bold text-headline-sm flex items-center justify-center shrink-0">
                    {initials(activeThread?.customerName || 'Customer')}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-label-lg text-on-surface truncate">
                        {activeThread?.customerName}
                      </h3>
                      {activeThread?.user?._id && (
                        <Link
                          to={`/admin/customers/${activeThread.user._id}`}
                          className="text-[11px] text-secondary hover:underline font-semibold"
                        >
                          Customer profile →
                        </Link>
                      )}
                    </div>
                    <p className="text-[11.5px] text-on-surface-variant truncate">
                      {activeThread?.customerEmail} {activeThread?.customerPhone && `· ${activeThread.customerPhone}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateStatus.mutate(activeThread?.status === 'resolved' ? 'open' : 'resolved')}
                    disabled={updateStatus.isPending}
                    className={cn(
                      'btn-sm gap-1.5',
                      activeThread?.status === 'resolved' ? 'btn-tonal' : 'btn-primary'
                    )}
                  >
                    <Icon name={activeThread?.status === 'resolved' ? 'refresh' : 'check_circle'} className="text-[16px]" />
                    {activeThread?.status === 'resolved' ? 'Reopen Chat' : 'Mark Resolved'}
                  </button>
                </div>
              </div>

              {/* Order Context Banner if attached */}
              {activeThread?.orderId && (
                <div className="px-4 py-2.5 bg-rose-500/10 border-b border-rose-500/20 text-body-sm flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon name="assignment" className="text-[18px] text-rose-500 shrink-0" />
                    <div>
                      <span className="font-bold text-on-surface text-[12.5px]">
                        Order #{activeThread.orderId}
                      </span>
                      {activeThread.orderContext?.grandTotal && (
                        <span className="text-[12px] text-on-surface-variant ml-2">
                          Total: <b>{formatINR(activeThread.orderContext.grandTotal)}</b>
                        </span>
                      )}
                      {activeThread.orderContext?.cancellationReason && (
                        <p className="text-[11.5px] text-rose-400">
                          Cancellation Reason: <b>{activeThread.orderContext.cancellationReason}</b>
                        </p>
                      )}
                    </div>
                  </div>
                  <Link
                    to={`/admin/orders/${activeThread.orderId}`}
                    className="btn-tonal btn-sm text-[11px] gap-1 shrink-0"
                  >
                    <Icon name="open_in_new" className="text-[14px]" /> Open Order
                  </Link>
                </div>
              )}

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0 bg-surface-container-lowest">
                {messages.length === 0 && (
                  <div className="m-auto text-center text-outline text-body-sm">
                    No messages in this conversation yet.
                  </div>
                )}

                {messages.map((m) => {
                  const isAdmin = m.sender === 'admin';
                  const isSystem = m.sender === 'system';

                  if (isSystem) {
                    return (
                      <div key={m._id || m.createdAt} className="flex justify-center my-1.5">
                        <div className="max-w-[85%] px-3.5 py-2 rounded-xl bg-surface-container-high/70 border border-outline-variant/30 text-[12px] text-on-surface-variant text-center flex items-center gap-2">
                          <Icon name="info" className="text-[16px] text-secondary shrink-0" />
                          <span>{m.text}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m._id || m.createdAt}
                      className={cn(
                        'flex flex-col max-w-[80%]',
                        isAdmin ? 'self-end items-end' : 'self-start items-start'
                      )}
                    >
                      <span className="text-[11px] font-bold text-outline mb-1 flex items-center gap-1">
                        {isAdmin ? <Icon name="shield_person" className="text-[13px] text-secondary" /> : null}
                        {m.senderName || (isAdmin ? 'Admin' : 'Customer')}
                      </span>
                      <div
                        className={cn(
                          'px-4 py-2.5 rounded-2xl text-[13.5px] leading-relaxed shadow-2xs whitespace-pre-wrap break-words',
                          isAdmin
                            ? 'bg-secondary text-on-secondary rounded-br-xs font-medium'
                            : 'bg-surface-container-high text-on-surface rounded-bl-xs border border-outline-variant/40'
                        )}
                      >
                        {m.text}
                      </div>
                      <span className="text-[10px] text-outline mt-0.5 px-1">
                        {formatDateTime(m.createdAt)}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Reply Suggestions */}
              <div className="px-3 pt-2 bg-surface-container border-t border-surface-container-high flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <span className="text-[11px] text-outline font-semibold uppercase tracking-wider shrink-0 mr-1">
                  Quick:
                </span>
                {QUICK_REPLIES.map((qr) => (
                  <button
                    key={qr}
                    type="button"
                    onClick={() => setReplyText(qr)}
                    className="px-2 py-1 rounded-lg bg-surface-container-lowest hover:bg-secondary/15 hover:text-secondary text-[11px] text-on-surface border border-outline-variant/30 transition-colors whitespace-nowrap shrink-0"
                  >
                    {qr.slice(0, 32)}…
                  </button>
                ))}
              </div>

              {/* Reply Composer */}
              <div className="p-3 bg-surface-container border-t border-surface-container-high flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] text-outline px-1 flex-wrap gap-2">
                  <span className="flex items-center gap-1">
                    <Icon name="mail" className="text-[13px] text-secondary" />
                    Sender: <b className="text-on-surface">info@wildtane.com</b>
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-on-surface">
                    <input
                      type="checkbox"
                      checked={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.checked)}
                      className="rounded accent-secondary"
                    />
                    <span>Also email this reply to customer</span>
                  </label>
                </div>

                <form onSubmit={handleSend} className="flex items-end gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type reply to customer (Enter to send)..."
                    rows={2}
                    className="flex-1 max-h-32 resize-none rounded-xl bg-surface-container-lowest px-3.5 py-2 text-[13.5px] text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-secondary"
                  />
                  <Button
                    type="submit"
                    size="md"
                    icon="send"
                    disabled={!replyText.trim() || sendReply.isPending}
                    loading={sendReply.isPending}
                  >
                    Reply
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
