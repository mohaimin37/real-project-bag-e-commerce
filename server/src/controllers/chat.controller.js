import mongoose from 'mongoose';
import ChatThread from '../models/ChatThread.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { parsePagination, paginated } from '../utils/helpers.js';
import { sendEmail } from '../services/email.service.js';
import env from '../config/env.js';

function makeThreadId() {
  const d = new Date();
  const dateStr = d.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CHT-${dateStr}-${rand}`;
}

/**
 * Get active chat thread for current visitor or user.
 */
export const getActiveChat = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const sessionId = req.headers['x-chat-session'] || req.query.sessionId;
  const orderId = req.query.orderId;

  const query = {};
  if (orderId) {
    query.orderId = orderId;
  } else if (userId) {
    query.user = userId;
  } else if (sessionId) {
    query.sessionId = sessionId;
  } else {
    return res.json({ success: true, thread: null });
  }

  // Find most recent thread matching criteria
  const thread = await ChatThread.findOne(query).sort({ updatedAt: -1 });
  res.json({ success: true, thread });
});

/**
 * Customer sends a message.
 */
export const sendCustomerMessage = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const sessionId = req.headers['x-chat-session'] || req.body.sessionId || `guest_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const text = String(req.body.text || req.body.message || '').trim();
  const orderId = req.body.orderId ? String(req.body.orderId).trim() : '';
  const topic = req.body.topic ? String(req.body.topic).trim() : (orderId ? 'Cancellation Support' : 'General Support');

  if (!text) {
    throw ApiError.badRequest('Message text is required');
  }

  let customerName = req.user?.name || req.body.customerName || 'Customer';
  let customerEmail = req.user?.email || req.body.customerEmail || '';
  let customerPhone = req.user?.phone?.number ? `${req.user.phone.dialCode || ''} ${req.user.phone.number}` : req.body.customerPhone || '';

  let orderContext = null;
  let orderRef = null;
  if (orderId) {
    const o = await Order.findOne({ orderId }).select('orderId grandTotal orderStatus cancellation user').lean();
    if (o) {
      orderRef = o._id;
      orderContext = {
        orderId: o.orderId,
        grandTotal: o.grandTotal,
        orderStatus: o.orderStatus,
        cancellationReason: o.cancellation?.reason || '',
      };
      if (!customerName || customerName === 'Customer') customerName = o.customerName || customerName;
      if (!customerEmail) customerEmail = o.email || customerEmail;
    }
  }

  // Try to find existing open thread for this order or user
  let thread = null;
  if (orderId) {
    thread = await ChatThread.findOne({ orderId, status: { $ne: 'closed' } });
  }
  if (!thread && userId) {
    thread = await ChatThread.findOne({ user: userId, status: { $ne: 'closed' } }).sort({ updatedAt: -1 });
  }
  if (!thread && sessionId) {
    thread = await ChatThread.findOne({ sessionId, status: { $ne: 'closed' } }).sort({ updatedAt: -1 });
  }

  const messageItem = {
    sender: 'customer',
    senderName: customerName,
    text,
    orderContext: orderContext || undefined,
    createdAt: new Date(),
  };

  if (!thread) {
    thread = new ChatThread({
      threadId: makeThreadId(),
      user: userId || null,
      sessionId,
      customerName,
      customerEmail,
      customerPhone,
      topic,
      orderId: orderId || '',
      order: orderRef || null,
      orderContext: orderContext || undefined,
      status: 'waiting_admin',
      unreadAdmin: 1,
      unreadCustomer: 0,
      lastMessage: {
        text,
        sender: 'customer',
        senderName: customerName,
        createdAt: new Date(),
      },
      messages: [messageItem],
    });
  } else {
    // If thread was resolved, re-open it
    thread.status = 'waiting_admin';
    thread.unreadAdmin = (thread.unreadAdmin || 0) + 1;
    if (orderId && !thread.orderId) {
      thread.orderId = orderId;
      thread.order = orderRef || thread.order;
      thread.orderContext = orderContext || thread.orderContext;
    }
    if (userId && !thread.user) thread.user = userId;
    if (customerName && thread.customerName === 'Customer') thread.customerName = customerName;
    if (customerEmail && !thread.customerEmail) thread.customerEmail = customerEmail;
    thread.lastMessage = {
      text,
      sender: 'customer',
      senderName: customerName,
      createdAt: new Date(),
    };
    thread.messages.push(messageItem);
  }

  await thread.save();
  res.status(201).json({ success: true, thread, message: messageItem });
});

/**
 * Mark chat messages as read by customer.
 */
export const markCustomerRead = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  const thread = await ChatThread.findOne({ threadId });
  if (!thread) throw ApiError.notFound('Chat thread not found');

  thread.unreadCustomer = 0;
  const now = new Date();
  thread.messages.forEach((m) => {
    if (m.sender !== 'customer' && !m.readAt) {
      m.readAt = now;
    }
  });

  await thread.save();
  res.json({ success: true, unreadCustomer: 0 });
});

// ── Admin Endpoints ──────────────────────────────────────────

/**
 * List chat threads for Admin.
 */
export const adminListThreads = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 25 });
  const filter = {};

  if (req.query.status && req.query.status !== 'all') {
    filter.status = req.query.status;
  }
  if (req.query.topic) {
    filter.topic = new RegExp(req.query.topic, 'i');
  }
  if (req.query.hasOrder === 'true') {
    filter.orderId = { $exists: true, $ne: '' };
  }
  if (req.query.q) {
    const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 50), 'i');
    filter.$or = [
      { threadId: rx },
      { customerName: rx },
      { customerEmail: rx },
      { customerPhone: rx },
      { orderId: rx },
      { 'lastMessage.text': rx },
    ];
  }

  const [items, total, unreadCount] = await Promise.all([
    ChatThread.find(filter)
      .sort({ unreadAdmin: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-messages')
      .lean(),
    ChatThread.countDocuments(filter),
    ChatThread.countDocuments({ unreadAdmin: { $gt: 0 } }),
  ]);

  res.json({
    success: true,
    unreadTotal: unreadCount,
    ...paginated(items, total, page, limit),
  });
});

/**
 * Get single thread details for Admin.
 */
export const adminGetThread = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  const thread = await ChatThread.findOne({
    $or: [{ threadId }, mongoose.isValidObjectId(threadId) ? { _id: threadId } : null].filter(Boolean),
  }).populate('user', 'name email phone avatar createdAt');

  if (!thread) throw ApiError.notFound('Chat thread not found');

  // Reset admin unread when admin opens the thread
  if (thread.unreadAdmin > 0) {
    thread.unreadAdmin = 0;
    const now = new Date();
    thread.messages.forEach((m) => {
      if (m.sender === 'customer' && !m.readAt) {
        m.readAt = now;
      }
    });
    await thread.save();
  }

  res.json({ success: true, thread });
});

/**
 * Admin replies to customer in chat thread.
 */
export const adminSendMessage = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  const text = String(req.body.text || '').trim();
  if (!text) throw ApiError.badRequest('Message text is required');

  const thread = await ChatThread.findOne({
    $or: [{ threadId }, mongoose.isValidObjectId(threadId) ? { _id: threadId } : null].filter(Boolean),
  });
  if (!thread) throw ApiError.notFound('Chat thread not found');

  const adminName = req.user?.name ? `${req.user.name} (Support)` : 'WILDTANE Support';
  const messageItem = {
    sender: 'admin',
    senderName: adminName,
    text,
    createdAt: new Date(),
  };

  thread.messages.push(messageItem);
  thread.lastMessage = {
    text,
    sender: 'admin',
    senderName: adminName,
    createdAt: new Date(),
  };
  thread.status = 'waiting_customer';
  thread.unreadCustomer = (thread.unreadCustomer || 0) + 1;
  thread.unreadAdmin = 0;

  await thread.save();

  // If customer has an email, dispatch email notification from info@wildtane.com
  let targetEmail = (thread.customerEmail || '').trim();
  if (!targetEmail && thread.user) {
    const u = await User.findById(thread.user).select('email').lean();
    if (u?.email) targetEmail = u.email.trim();
  }

  let emailOutcome = null;
  const notifyEmail = req.body.notifyEmail !== false;
  if (notifyEmail && targetEmail && !targetEmail.endsWith('@example.com')) {
    try {
      emailOutcome = await sendEmail({
        to: targetEmail,
        subject: `New Message from WILDTANE Support [${thread.threadId}]`,
        text: [
          `Hi ${thread.customerName || 'Customer'},`,
          '',
          `WILDTANE Support has replied to your message:`,
          '',
          `"${text}"`,
          '',
          thread.orderId ? `Order Reference: #${thread.orderId}` : '',
          `You can view and reply to this chat anytime at: ${env.siteUrl}/help`,
          '',
          'Warm regards,',
          'WILDTANE Support Team',
          'info@wildtane.com · 8920550465',
        ].filter(Boolean).join('\n'),
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
            <h2 style="margin:0 0 12px;color:#111827;">WILDTANE Support</h2>
            <p style="font-size:15px;color:#374151;">Hi ${thread.customerName || 'Customer'},</p>
            <p style="font-size:15px;color:#374151;">Our support team has sent you a new message regarding <b>${thread.topic || 'Support Inquiry'}</b>:</p>
            <div style="background:#f3f4f6;border-left:4px solid #111827;padding:12px 16px;border-radius:6px;margin:16px 0;font-size:15px;color:#1f2937;white-space:pre-line;">
              ${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
            </div>
            ${thread.orderId ? `<p style="font-size:13px;color:#6b7280;margin:10px 0;">Order Reference: <b>#${thread.orderId}</b></p>` : ''}
            <div style="margin:20px 0;">
              <a href="${env.siteUrl}/help" style="background:#111827;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600;display:inline-block;">Open Support Chat</a>
            </div>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
            <p style="font-size:12px;color:#9ca3af;margin:0;">WILDTANE Customer Care · info@wildtane.com · +91 8920550465</p>
          </div>
        `,
      });
    } catch (err) {
      console.error('[chat:email] Email delivery error:', err.message);
      emailOutcome = { delivered: false, error: err.message };
    }
  }

  res.status(201).json({ success: true, thread, message: messageItem, emailOutcome });
});

/**
 * Admin updates thread status (open, resolved, closed).
 */
export const adminUpdateStatus = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  const status = String(req.body.status || '').trim();
  if (!['open', 'waiting_admin', 'waiting_customer', 'resolved', 'closed'].includes(status)) {
    throw ApiError.badRequest('Invalid status');
  }

  const thread = await ChatThread.findOneAndUpdate(
    { $or: [{ threadId }, mongoose.isValidObjectId(threadId) ? { _id: threadId } : null].filter(Boolean) },
    { $set: { status } },
    { returnDocument: 'after' }
  );
  if (!thread) throw ApiError.notFound('Chat thread not found');

  res.json({ success: true, thread });
});

/**
 * Admin chat stats for sidebar counter.
 */
export const adminChatStats = asyncHandler(async (req, res) => {
  const [unreadTotal, openCount, cancellationCount] = await Promise.all([
    ChatThread.countDocuments({ unreadAdmin: { $gt: 0 } }),
    ChatThread.countDocuments({ status: { $in: ['open', 'waiting_admin'] } }),
    ChatThread.countDocuments({ topic: /cancellation/i, status: { $in: ['open', 'waiting_admin'] } }),
  ]);
  res.json({ success: true, unreadTotal, openCount, cancellationCount });
});

/**
 * Helper: Automatically creates or updates a ChatThread when an order is cancelled by user.
 */
export async function createOrUpdateCancellationChat(order, reason, user) {
  try {
    let thread = await ChatThread.findOne({ orderId: order.orderId });
    const orderContext = {
      orderId: order.orderId,
      grandTotal: order.grandTotal,
      orderStatus: 'Cancelled',
      cancellationReason: reason || 'Customer request',
    };

    const sysMsg = {
      sender: 'system',
      senderName: 'WILDTANE Order Desk',
      text: `Cancellation requested for Order #${order.orderId}. Reason: ${reason || 'Not specified'}. If online paid, your refund will be processed in accordance with the store policy. Chat with our support team below for any updates.`,
      orderContext,
      createdAt: new Date(),
    };

    if (!thread) {
      thread = new ChatThread({
        threadId: makeThreadId(),
        user: user?._id || order.user || null,
        customerName: order.customerName || user?.name || 'Customer',
        customerEmail: order.email || user?.email || '',
        customerPhone: order.phone || (user?.phone ? `${user.phone.dialCode || ''} ${user.phone.number}` : ''),
        topic: `Cancellation Support · #${order.orderId}`,
        orderId: order.orderId,
        order: order._id,
        orderContext,
        status: 'open',
        unreadAdmin: 1,
        unreadCustomer: 0,
        lastMessage: {
          text: sysMsg.text,
          sender: 'system',
          senderName: sysMsg.senderName,
          createdAt: new Date(),
        },
        messages: [sysMsg],
      });
    } else {
      thread.orderContext = orderContext;
      thread.status = 'open';
      thread.unreadAdmin = (thread.unreadAdmin || 0) + 1;
      thread.lastMessage = {
        text: sysMsg.text,
        sender: 'system',
        senderName: sysMsg.senderName,
        createdAt: new Date(),
      };
      thread.messages.push(sysMsg);
    }

    await thread.save();
    return thread;
  } catch (err) {
    console.error('Failed to create cancellation chat:', err);
    return null;
  }
}

/**
 * Helper: Automatically pushes admin cancellation decision message into the chat thread.
 */
export async function addAdminCancellationMessage(orderId, adminMessage, adminUser) {
  try {
    if (!adminMessage || !adminMessage.trim()) return null;
    const thread = await ChatThread.findOne({ orderId });
    if (!thread) return null;

    const adminName = adminUser?.name ? `${adminUser.name} (Support)` : 'WILDTANE Support';
    const msg = {
      sender: 'admin',
      senderName: adminName,
      text: adminMessage.trim(),
      createdAt: new Date(),
    };

    thread.messages.push(msg);
    thread.lastMessage = {
      text: msg.text,
      sender: 'admin',
      senderName: adminName,
      createdAt: new Date(),
    };
    thread.status = 'waiting_customer';
    thread.unreadCustomer = (thread.unreadCustomer || 0) + 1;
    await thread.save();
    return thread;
  } catch (err) {
    console.error('Failed to add admin cancellation chat message:', err);
    return null;
  }
}
