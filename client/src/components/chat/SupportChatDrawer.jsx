import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { useUser } from '../../hooks/useStore';
import { setChatOpen } from '../../store';
import { cn, formatDateTime, formatINR } from '../../lib/format';
import { Drawer, Icon, Spinner } from '../ui';
import { LogoMark } from '../Brand';

const SESSION_KEY = 'wt-chat-session-id';
function getSessionId() {
  try {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `ses_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return 'ses_guest';
  }
}

export default function SupportChatDrawer() {
  const dispatch = useDispatch();
  const qc = useQueryClient();
  const user = useUser();
  const open = useSelector((s) => s.ui.chatOpen);
  const context = useSelector((s) => s.ui.chatContext);
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);
  const sessionId = getSessionId();

  const orderId = context?.orderId || '';
  const topic = context?.topic || (orderId ? 'Cancellation Support' : 'General Support');

  // Fetch active chat thread with auto-polling every 3.5 seconds
  const { data, isLoading } = useQuery({
    queryKey: ['chat', 'active', orderId, user?._id || sessionId],
    queryFn: () => api.activeChat({ orderId: orderId || undefined, sessionId }),
    refetchInterval: open ? 3500 : 15000,
  });

  const thread = data?.thread;
  const messages = thread?.messages || [];

  // Scroll to bottom when messages change
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, open]);

  // Mark as read when opened and there are unread customer messages
  const markRead = useMutation({
    mutationFn: (id) => api.markChatRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat', 'active'] });
    },
  });

  useEffect(() => {
    if (open && thread?.threadId && thread.unreadCustomer > 0) {
      markRead.mutate(thread.threadId);
    }
  }, [open, thread?.threadId, thread?.unreadCustomer]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (msgText) =>
      api.sendChatMessage({
        text: msgText,
        orderId: orderId || undefined,
        topic,
        sessionId,
        customerName: user?.name,
        customerEmail: user?.email,
        customerPhone: user?.phone ? `${user.phone.dialCode || ''} ${user.phone.number}` : undefined,
      }),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['chat'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to send message');
    },
  });

  const handleSend = (e) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };

  const handleQuickQuestion = (q) => {
    if (sendMutation.isPending) return;
    sendMutation.mutate(q);
  };

  const close = () => dispatch(setChatOpen(false));

  return (
    <Drawer
      open={open}
      onClose={close}
      side="right"
      width="max-w-md"
      title={
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-full bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
            <Icon name="support_agent" className="text-[20px]" />
          </span>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-label-lg leading-tight flex items-center gap-1.5">
              WILDTANE Support
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Online" />
            </span>
            <span className="text-[11px] text-outline">Live agent · Replies in minutes</span>
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-full bg-surface-container-lowest">
        {/* Context Banner: Cancelled Order or General */}
        {(orderId || context?.orderId || thread?.orderId) && (
          <div className="px-4 py-2.5 bg-rose-500/10 border-b border-rose-500/20 text-body-sm flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[12px] text-rose-500 flex items-center gap-1">
                <Icon name="cancel" className="text-[15px]" /> Order #{orderId || thread?.orderId}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500">
                Cancellation Assistance
              </span>
            </div>
            {(context?.cancellationReason || thread?.orderContext?.cancellationReason) && (
              <p className="text-[11.5px] text-on-surface-variant truncate">
                Reason: {context?.cancellationReason || thread?.orderContext?.cancellationReason}
              </p>
            )}
            <p className="text-[10.5px] text-outline">
              Our team can help verify your refund, cancel status, or answer questions.
            </p>
          </div>
        )}

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
          {/* Welcome Card if new or no messages */}
          {messages.length === 0 && !isLoading && (
            <div className="my-auto flex flex-col items-center text-center p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 gap-3">
              <span className="w-12 h-12 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center">
                <Icon name="forum" className="text-[28px]" />
              </span>
              <div>
                <h3 className="font-bold text-headline-sm text-on-surface">How can we help you?</h3>
                <p className="text-[13px] text-on-surface-variant mt-1 leading-relaxed">
                  Send a message below to chat with our customer support team. We're here to help with your orders, refunds, UPI payments, and products.
                </p>
              </div>

              {/* Quick Prompt Chips */}
              <div className="flex flex-col gap-1.5 w-full pt-1 text-left">
                <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">Quick questions:</span>
                {(orderId ? [
                  'How will my refund for this cancelled order be paid?',
                  'Can I change my order delivery instead of cancelling?',
                  'When will UPI / Online refund reflect in my bank?',
                ] : [
                  'How do returns and 7-day exchanges work?',
                  'Can you check my order delivery status?',
                  'How does UPI payment and instant refund work?',
                ]).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleQuickQuestion(q)}
                    className="text-left text-[12px] p-2 rounded-xl bg-surface-container-high/60 hover:bg-secondary/15 hover:text-secondary border border-outline-variant/30 transition-all font-medium"
                  >
                    💬 {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && messages.length === 0 && (
            <div className="flex items-center justify-center py-10">
              <Spinner className="w-6 h-6 text-secondary" />
            </div>
          )}

          {/* Message Stream */}
          {messages.map((m) => {
            const isCustomer = m.sender === 'customer';
            const isSystem = m.sender === 'system';

            if (isSystem) {
              return (
                <div key={m._id || m.createdAt} className="flex justify-center my-1">
                  <div className="max-w-[85%] px-3.5 py-2 rounded-xl bg-surface-container-high/80 border border-outline-variant/40 text-[12px] text-on-surface-variant text-center flex items-center gap-2">
                    <Icon name="info" className="text-[16px] text-secondary shrink-0" />
                    <span>{m.text}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={m._id || m.createdAt}
                className={cn('flex flex-col max-w-[82%]', isCustomer ? 'self-end items-end' : 'self-start items-start')}
              >
                {!isCustomer && (
                  <span className="text-[11px] font-bold text-secondary mb-1 flex items-center gap-1">
                    <Icon name="shield_person" className="text-[13px]" />
                    {m.senderName || 'WILDTANE Support'}
                  </span>
                )}
                <div
                  className={cn(
                    'px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed shadow-2xs break-words whitespace-pre-wrap',
                    isCustomer
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

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-surface-container border-t border-surface-container-high flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your message..."
            rows={1}
            className="flex-1 max-h-24 resize-none rounded-xl bg-surface-container-lowest px-3.5 py-2 text-[13.5px] text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-secondary"
          />
          <button
            type="submit"
            disabled={!text.trim() || sendMutation.isPending}
            className="w-10 h-10 rounded-xl bg-secondary text-on-secondary flex items-center justify-center shrink-0 disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all shadow-sm"
            aria-label="Send message"
          >
            {sendMutation.isPending ? <Spinner className="w-4 h-4" /> : <Icon name="send" className="text-[18px]" />}
          </button>
        </form>
      </div>
    </Drawer>
  );
}
