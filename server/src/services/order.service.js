import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import Setting from '../models/Setting.js';
import Notification from '../models/Notification.js';
import { nextSequence } from '../models/Counter.js';
import ApiError from '../utils/ApiError.js';
import { resolveLines, computeTotals } from './cart.service.js';
import { redeemCoupon, releaseCoupon } from './coupon.service.js';
import { moveCoins, reverseOrderCoins } from './coin.service.js';
import { getProvider, verifyRazorpaySignature, createRazorpayOrder, confirmRazorpayPayment, refundUnusedPayment } from './payment.service.js';
import { findUsableCard, redeemGiftCard } from './giftcard.service.js';
import { moveWallet, walletApplicable } from './wallet.service.js';
import { refundCancelledOrder, refundLines, applyRefundWebhook, refundOwed } from './refund.service.js';
import { createForwardShipment, shippingConfigured } from './shipping.service.js';
import { qualifyReferralOnDelivery } from './referral.service.js';
import { notifyAdminOfOrder, notifyCustomerOfOrderApprovalWhatsApp, buildInvoiceCaption, buildWhatsAppChatLink } from './whatsapp.service.js';
import { sendEmail } from './email.service.js';
import { buildInvoiceCoverEmail } from './invoice-email.template.js';
import { generateInvoicePdfBuffer, invoiceFileName } from './pdf-invoice.service.js';
import env from '../config/env.js';

function formatOrderId(seq) {
  const yy = String(new Date().getFullYear()).slice(-2);
  return `WT${yy}-${String(seq).padStart(6, '0')}`;
}

async function resolveAddress(user, { addressId, address, saveAddress }) {
  if (addressId) {
    const saved = user.addresses.id(addressId);
    if (!saved) throw ApiError.badRequest('That saved address no longer exists', [{ field: 'addressId', message: 'Not found' }]);
    return saved.toObject();
  }
  if (saveAddress && user.addresses.length < 10) {
    user.addresses.push({ ...address, isDefault: user.addresses.length === 0 || address.isDefault });
    await user.save();
  }
  return address;
}

const round2 = (n) => Math.round(Number(n) * 100) / 100;

/**
 * Stored value applied before the payment method: gift card first, then the WILDTANE Wallet.
 * Everything is recomputed on the server from the card and the customer's real balance;
 * amounts sent by the browser are ignored.
 */
async function applyStoredValue(user, orderTotal, payload, settings) {
  let payable = round2(orderTotal);
  let giftCard = null;
  const gcCode = payload.giftCardCode || payload.giftCard?.code;
  if (gcCode) {
    if (settings.giftCardsEnabled === false) throw ApiError.badRequest('Gift cards are currently unavailable.');
    const card = await findUsableCard(gcCode, payload.giftCardPin || payload.giftCard?.pin);
    const amount = round2(Math.min(card.currentBalance, payable));
    giftCard = { card, amount };
    payable = round2(payable - amount);
  }
  let walletAmount = 0;
  if (payload.useWallet && payable > 0) {
    walletAmount = walletApplicable(user?.wallet || 0, payable, settings);
    payable = round2(payable - walletAmount);
  }
  return { giftCard, walletAmount, payable };
}

async function loadCheckout(userId, shippingCode) {
  const [user, cart, settings] = await Promise.all([User.findById(userId), Cart.findOne({ user: userId }), Setting.get()]);
  if (!cart || !cart.items.length) throw ApiError.badRequest('Your bag is empty');

  const lines = await resolveLines(cart.items);
  const problems = lines.filter((l) => !l.available || l.issue);
  if (problems.length) {
    throw ApiError.conflict(
      'Some items in your bag changed. Please review your bag before placing the order.',
      problems.map((p) => ({ field: p.variantId, message: `${p.name || 'Item'}: ${p.issue}` }))
    );
  }
  const totals = await computeTotals(lines, {
    userId,
    couponCode: cart.couponCode,
    shippingCode: shippingCode || cart.shippingMethod || 'standard',
    settings,
    strictCoupon: true,
    coinBalance: user?.coins || 0,
    useCoins: cart.useCoins,
  });
  return { user, cart, settings, lines, totals };
}

/**
 * Initiates Razorpay checkout order without creating a database order.
 * Validates stock and computes final totals (after gift card and wallet) before creating the gateway order.
 */
export async function initiateOnlinePayment(userId, payload = {}) {
  const { user, settings, totals } = await loadCheckout(userId, payload.shippingMethod);
  const { giftCard, walletAmount, payable } = await applyStoredValue(user, totals.grandTotal, payload, settings);

  const provider = getProvider('razorpay');
  const availability = provider?.isAvailable({ settings, total: payable });
  if (!provider || !availability.available) {
    throw ApiError.badRequest(availability?.reason || 'Online payment is currently unavailable');
  }
  if (payable <= 0) throw ApiError.badRequest('Nothing is left to pay online. Place the order with your gift card or wallet.');

  const gatewayOrder = await createRazorpayOrder({
    amount: payable,
    currency: totals.currency || 'INR',
    receipt: `chk_${Date.now().toString(36)}`,
    notes: { userId: String(userId) },
  });

  return {
    gatewayOrder,
    keyId: env.razorpay.keyId,
    amount: gatewayOrder.amount,
    currency: gatewayOrder.currency,
    grandTotal: payable,
    giftCardDiscount: giftCard?.amount || 0,
    walletAmount,
  };
}

async function checkAndNotifyLowStock(order) {
  try {
    const alerts = [];
    for (const it of order.items) {
      const prod = await Product.findById(it.productId).select('name variants stock lowStockThreshold');
      if (!prod) continue;
      const v = prod.variants.id(it.variant?.id);
      const remainingVariantStock = v ? v.stock : prod.stock;
      const threshold = prod.lowStockThreshold || 10;
      if (remainingVariantStock <= 20) {
        alerts.push({
          name: prod.name,
          variant: v?.name || 'Default',
          remaining: remainingVariantStock,
          threshold,
        });
        await Notification.create({
          type: 'low_stock_alert',
          channel: 'whatsapp',
          recipient: env.whatsapp.adminNumber || '',
          message: `⚠️ Low Stock Alert: "${prod.name}" (${v?.name || 'Default'}) has only ${remainingVariantStock} units remaining (Threshold: ${threshold}).`,
          provider: env.whatsapp.enabled ? 'whatsapp_cloud' : 'dev_log',
          status: 'logged',
        });
      }
    }
    return alerts;
  } catch (err) {
    console.error(`[inventory] Error checking low stock for order ${order.orderId}:`, err.message);
    return [];
  }
}

/**
 * Creates an order from the user's server cart.
 * If paymentMethod is online (razorpay), payment must be completed and verified first.
 * Stock decrement, coupon redemption, order insert and cart clear run in one
 * MongoDB transaction, so concurrent buyers can never oversell a variant.
 * The WhatsApp admin alert is sent only after the transaction commits.
 */
export async function placeOrder(userId, payload) {
  const { user, settings, lines, totals } = await loadCheckout(userId, payload.shippingMethod);
  const orderTotal = totals.grandTotal; // before gift card / wallet
  const { giftCard: giftCardApplied, walletAmount, payable } = await applyStoredValue(user, orderTotal, payload, settings);
  totals.grandTotal = payable; // what is left for the payment method

  // Gift card / wallet covering everything: no gateway, no cash. Otherwise the chosen method pays the rest.
  const fullyCovered = payable <= 0 && (giftCardApplied || walletAmount > 0);
  const methodCode = fullyCovered ? (giftCardApplied ? 'giftcard' : 'wtwallet') : payload.paymentMethod;
  if (!fullyCovered && ['giftcard', 'wtwallet'].includes(methodCode)) {
    throw ApiError.badRequest(`₹${payable.toLocaleString('en-IN')} is still due. Choose Pay Online or Cash on Delivery for the rest.`);
  }

  const provider = getProvider(methodCode);
  const availability = fullyCovered ? { available: true } : provider?.isAvailable({ settings, total: payable });
  if (!provider || !availability.available) {
    throw ApiError.badRequest(availability?.reason || 'Choose a valid payment method', [{ field: 'paymentMethod', message: 'Unavailable' }]);
  }

  let verifiedPayment = null;
  let capturedPayment = null; // the Razorpay payment, kept so it can be refunded if the order can't be created
  if (fullyCovered) {
    verifiedPayment = { paidAt: new Date(), method: methodCode };
  } else if (methodCode === 'razorpay') {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = payload.paymentDetails || {};
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw ApiError.badRequest('Payment details are required. Complete online payment before placing your order.');
    }
    if (!verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature })) {
      throw ApiError.badRequest('Payment signature verification failed. Order was not placed.');
    }
    if (await Order.exists({ 'paymentDetails.razorpayPaymentId': razorpayPaymentId })) {
      throw ApiError.conflict('This payment has already been used for an order.');
    }
    // The amount actually paid must equal what is due now (the bag may have changed after paying).
    const check = await confirmRazorpayPayment({ razorpayOrderId, razorpayPaymentId }, payable);
    if (!check.ok) {
      // A captured payment for the wrong amount (e.g. the bag changed after paying) goes straight back.
      const refund = await refundUnusedPayment(check.payment, check.reason);
      throw ApiError.badRequest(
        refund
          ? `${check.reason} Your order was not placed and the payment has been refunded (refund ${refund.id}).`
          : `${check.reason} Your order was not placed. If money was taken, contact support with payment ID ${razorpayPaymentId}.`
      );
    }
    capturedPayment = check.payment;
    verifiedPayment = {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      capturedAmountPaise: Number(check.payment.amount),
      gatewayStatus: check.payment.status,
      paidAt: new Date(),
    };
  }

  const address = await resolveAddress(user, payload);
  const { customer } = payload;
  const fullPhone = `${customer.phone.dialCode} ${customer.phone.number}`;
  const addrPhone = address.phone?.number ? `${address.phone.dialCode} ${address.phone.number}` : fullPhone;
  const orderObjectId = new mongoose.Types.ObjectId();

  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      for (const line of lines) {
        // Conditional decrement: only succeeds if the variant still has enough stock.
        const result = await Product.updateOne(
          {
            _id: line.productId,
            isVisible: true,
            variants: { $elemMatch: { _id: line.variantId, stock: { $gte: line.quantity } } },
          },
          { $inc: { 'variants.$.stock': -line.quantity, stock: -line.quantity, soldCount: line.quantity } },
          { session }
        );
        if (!result.modifiedCount) {
          throw ApiError.conflict(`${line.name} (${line.variant.name}) just sold out or has fewer units left. Please update your bag.`);
        }
      }

      if (totals.coupon) await redeemCoupon(totals.coupon, userId, orderObjectId, session);

      const seq = await nextSequence('order', session);
      [order] = await Order.create(
        [
          {
            _id: orderObjectId,
            orderId: formatOrderId(seq),
            user: userId,
            customerName: customer.name,
            email: customer.email,
            phone: fullPhone,
            country: customer.country,
            nationality: customer.nationality,
            shippingAddress: {
              fullName: address.fullName,
              phone: addrPhone,
              addressLine1: address.addressLine1,
              addressLine2: address.addressLine2 || '',
              landmark: address.landmark || '',
              city: address.city,
              state: address.state,
              postalCode: address.postalCode,
              country: address.country,
            },
            items: lines.map((l) => ({
              productId: l.productId,
              productName: l.name,
              slug: l.slug,
              SKU: l.sku,
              image: l.image,
              variant: { id: l.variant._id, name: l.variant.name, colorHex: l.variant.colorHex, size: l.variant.size },
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              totalPrice: l.lineTotal,
            })),
            subtotal: totals.subtotal,
            discount: totals.discount,
            shipping: totals.shipping,
            tax: totals.tax,
            grandTotal: totals.grandTotal,
            currency: totals.currency,
            coupon: totals.coupon ? { code: totals.coupon.code, type: totals.coupon.type, value: totals.coupon.value } : undefined,
            coinsRedeemed: totals.coins.used,
            coinDiscount: totals.coins.discount,
            coinsEarned: totals.coins.willEarn,
            shippingMethod: { code: totals.shippingMethod.code, label: totals.shippingMethod.label, eta: totals.shippingMethod.eta },
            paymentMethod: provider.code,
            paymentStatus: verifiedPayment ? 'Paid' : 'Pending',
            paymentReference: verifiedPayment ? (verifiedPayment.razorpayPaymentId || methodCode.toUpperCase()) : '',
            paymentDetails: verifiedPayment ? { ...verifiedPayment } : undefined,
            orderStatus: verifiedPayment ? 'Confirmed' : 'Pending',
            giftCard: giftCardApplied ? { code: giftCardApplied.card.code, amount: giftCardApplied.amount } : undefined,
            walletAmount,
            statusHistory: [
              {
                status: verifiedPayment ? 'Confirmed' : 'Pending',
                note: verifiedPayment
                  ? fullyCovered ? `Order placed and paid with ${giftCardApplied ? 'gift card' : ''}${giftCardApplied && walletAmount ? ' and ' : ''}${walletAmount ? 'wallet' : ''}` : 'Order placed and payment received online'
                  : 'Order placed (Cash on Delivery)',
                at: new Date(),
              },
            ],
            customerNote: payload.customerNote,
          },
        ],
        { session }
      );

      // Gift card and wallet are spent with conditional updates inside the transaction:
      // if either balance changed since checkout, the whole order rolls back.
      if (giftCardApplied) await redeemGiftCard(giftCardApplied.card, giftCardApplied.amount, { order, userId, session });
      if (walletAmount > 0) {
        await moveWallet(userId, -walletAmount, { type: 'order_debit', key: `order_debit:${order.orderId}`, order, description: `Paid towards order ${order.orderId}`, session });
      }

      // Loyalty coins: spend first (fails if the balance no longer covers it).
      // Note: Coins earned on this order are not credited immediately; they disburse automatically
      // after 1 week of delivery once the 7-day return policy expires.
      if (totals.coins.used > 0) await moveCoins(userId, -totals.coins.used, { type: 'redeemed', order, session, note: `Used on order ${order.orderId}` });

      await Cart.updateOne({ user: userId }, { $set: { items: [], couponCode: null, useCoins: false } }, { session });
    });
  } catch (err) {
    // The customer has paid but the order could not be saved (e.g. the last unit sold a moment ago):
    // return the money at once instead of leaving them charged without an order.
    if (capturedPayment) {
      const refund = await refundUnusedPayment(capturedPayment, `Order not created: ${err.message}`);
      const base = err instanceof ApiError ? err.message : 'Your order could not be created.';
      throw new ApiError(
        err.statusCode || 409,
        refund
          ? `${base} Your payment of ₹${(Number(capturedPayment.amount) / 100).toLocaleString('en-IN')} has been refunded (refund ${refund.id}); it reaches your account as per your bank's timelines.`
          : `${base} We could not refund the payment automatically — please contact support with payment ID ${capturedPayment.id}.`
      );
    }
    throw err;
  } finally {
    await session.endSession();
  }

  const payment = verifiedPayment
    ? { paymentStatus: 'Paid', reference: verifiedPayment.razorpayPaymentId }
    : await provider.initiate(order);

  // Check remaining inventory and alert admin if any purchased item is low in stock
  checkAndNotifyLowStock(order).then((alerts) => {
    notifyAdminOfOrder(order, alerts);
  }).catch((err) => {
    console.error('[notification] notifyAdminOfOrder error:', err);
    notifyAdminOfOrder(order);
  });

  return { order, payment };
}

const CUSTOMER_CANCELLABLE = ['Pending', 'Confirmed'];
const RESTOCK_STATUSES = ['Cancelled', 'Returned'];

async function restoreInventory(order) {
  if (order.inventoryRestored) return;
  for (const item of order.items) {
    // eslint-disable-next-line no-await-in-loop
    await Product.updateOne(
      { _id: item.productId, 'variants._id': item.variant.id },
      { $inc: { 'variants.$.stock': item.quantity, stock: item.quantity, soldCount: -item.quantity } }
    );
  }
  order.inventoryRestored = true;
  if (order.coupon?.code) await releaseCoupon(order.coupon.code, order._id);
  await reverseOrderCoins(order);
  // Rule: If order gets cancelled, coins will not come
  order.coinsEarned = 0;
  order.coinsDisbursed = false;
  order.coinsReversed = true;
}

export async function changeOrderStatus(order, { status, note, trackingNumber, courier, at, notifyCustomer = false, customerMessage = '' }, changedBy) {
  const message = String(customerMessage || '').trim().slice(0, 1000);
  if (order.orderStatus === status && !trackingNumber && !courier && !message) return order;
  if (['Cancelled', 'Returned'].includes(order.orderStatus) && status !== order.orderStatus) {
    throw ApiError.badRequest(`This order is ${order.orderStatus.toLowerCase()} and can no longer change status`);
  }
  const when = at ? new Date(at) : new Date();
  if (when.getTime() > Date.now() + 5 * 60 * 1000) throw ApiError.badRequest('The update time cannot be in the future');
  if (when < order.createdAt) throw ApiError.badRequest('The update time cannot be before the order was placed');
  const statusChanged = status !== order.orderStatus;
  if (statusChanged) {
    order.orderStatus = status;
    if (status === 'Confirmed') {
      order.approvedAt = when;
      order.approvedBy = changedBy;
      order.invoiceSentAt = when;
    }
    order.statusHistory.push({ status, note, changedBy, at: when });
  }
  if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
  if (courier !== undefined) order.courier = courier;
  if (message) order.customerMessages.push({ text: message, status, emailed: Boolean(notifyCustomer && order.email), sentAt: new Date(), by: changedBy });
  if (RESTOCK_STATUSES.includes(status)) await restoreInventory(order);
  if (status === 'Delivered') {
    if (!order.deliveredAt) order.deliveredAt = when;
    if (order.paymentMethod === 'cod' && order.paymentStatus === 'Pending') {
      order.paymentStatus = 'Paid';
    }
  }
  if (statusChanged && status === 'Cancelled') {
    const c = order.cancellation || {};
    order.set('cancellation.status', 'Confirmed');
    order.set('cancellation.confirmedAt', new Date());
    if (!c.requestedAt) order.set('cancellation.requestedAt', new Date());
    if (!c.reason) order.set('cancellation.reason', note || '');
    if (!c.by) order.set('cancellation.by', changedBy && String(changedBy) !== String(order.user) ? 'admin' : 'customer');
  }
  await order.save();

  if (statusChanged && status === 'Cancelled') {
    const owed = refundOwed(order);
    const automatic = (await Setting.get()).cancellationRefunds?.automatic !== false;
    if (!automatic && owed > 0 && !(order.refundDetails?.parts || []).length) {
      // Settings → "Approve refunds first": hold the refund until the team presses Refund now.
      await Order.updateOne({ _id: order._id }, { $set: { 'refundDetails.status': 'Awaiting approval', 'refundDetails.amount': owed } });
      order.set('refundDetails.status', 'Awaiting approval');
      order.set('refundDetails.amount', owed);
    } else {
      // Refund whatever was paid (gateway, gift card, wallet). Awaited so the response shows the real refund state.
      const refunded = await refundCancelledOrder(order._id);
      if (refunded) order.set({ refundDetails: refunded.refundDetails, paymentStatus: refunded.paymentStatus });
    }
  }
  if (statusChanged && status === 'Delivered') qualifyReferralOnDelivery(order);
  if (statusChanged && status === 'Confirmed') autoCreateShipment(order);

  // Fire-and-forget: customer gets Tax Invoice on Confirmation, or status tracking alert
  if (statusChanged && notifyCustomer) {
    if (status === 'Confirmed') {
      Setting.get()
        .then((st) => dispatchInvoice(order, st))
        .catch((e) => console.error('[invoice] dispatch failed:', e.message));
      // The invoice email is standard; a personal message goes as its own short email.
      if (message) notifyCustomerOfStatus(order, when, note, message).catch((e) => console.error('[email] status update failed:', e.message));
    } else {
      notifyCustomerOfStatus(order, when, note, message).catch((e) => console.error('[email] status update failed:', e.message));
    }
  } else if (!statusChanged && message && notifyCustomer) {
    sendOrderMessageEmail(order, message).catch((e) => console.error('[email] order message failed:', e.message));
  }
  return order;
}

/** Books the shipment with the provider when one is configured. Never blocks or fails the status change. */
export async function autoCreateShipment(order) {
  try {
    if (!shippingConfigured() || order.shipment?.shipmentId) return;
    const settings = await Setting.get();
    if (settings.shippingPackage?.autoCreateOnConfirm === false) return;
    await createShipmentForOrder(order);
  } catch (err) {
    console.error(`[shipping] auto shipment for ${order.orderId} failed: ${err.message}`);
  }
}

/** Creates the provider shipment and stores exactly what the provider returned. */
export async function createShipmentForOrder(order) {
  if (['Cancelled', 'Returned', 'Delivered'].includes(order.orderStatus)) throw ApiError.badRequest(`This order is ${order.orderStatus.toLowerCase()}`);
  if (order.shipment?.shipmentId && order.shipment?.awb) throw ApiError.badRequest('A shipment already exists for this order');
  try {
    const shipment = await createForwardShipment(order);
    order.shipment = shipment;
    if (shipment.awb) {
      order.trackingNumber = shipment.awb;
      order.courier = shipment.courier || order.courier;
    }
    order.statusHistory.push({ status: order.orderStatus, note: `Shipment booked with Shiprocket${shipment.awb ? ` (AWB ${shipment.awb})` : ''}`, at: new Date() });
  } catch (err) {
    order.shipment = { ...(order.shipment?.toObject?.() || {}), provider: 'shiprocket', error: err.message, lastSyncedAt: new Date() };
    await order.save();
    throw ApiError.badRequest(`Shipment could not be created: ${err.message}`);
  }
  await order.save();
  return order;
}

/**
 * Emails the Tax Invoice PDF as an attachment with a short covering note.
 * Pass `pdf` (a Buffer) to reuse a PDF already generated for WhatsApp.
 */
export async function sendOrderTaxInvoiceEmail(order, settings, customEmail, pdf = null) {
  const targetEmail = (customEmail || order.email || '').trim();
  if (!targetEmail) return null;
  const currentSettings = settings || (await Setting.get());
  const fileName = invoiceFileName(order);
  const { subject, html, text } = buildInvoiceCoverEmail(order, currentSettings, fileName);

  try {
    // No PDF, no email: the bill is the attachment, so a failure here is reported instead of sending an empty note.
    const content = pdf || (await generateInvoicePdfBuffer(order, currentSettings));
    const outcome = await sendEmail({
      to: targetEmail,
      subject,
      html,
      text,
      attachments: [{ filename: fileName, content, contentType: 'application/pdf' }],
      priority: 'high',
    });

    await Notification.create({
      type: 'customer_invoice',
      channel: 'email',
      order: order._id,
      recipient: targetEmail,
      message: `${subject}\n\n${text}`,
      attachment: fileName,
      provider: outcome?.delivered ? 'smtp' : 'dev_log',
      status: outcome?.delivered ? 'sent' : 'logged',
      providerMessageId: outcome?.messageId,
    }).catch(() => {});

    return outcome;
  } catch (err) {
    console.error(`[email] Tax invoice delivery failed for ${order.orderId}:`, err.message);
    await Notification.create({
      type: 'customer_invoice',
      channel: 'email',
      order: order._id,
      recipient: targetEmail,
      message: `Tax Invoice email failed: ${err.message}`,
      attachment: fileName,
      provider: 'smtp',
      status: 'failed',
      error: err.message,
    }).catch(() => {});
    throw err;
  }
}

/**
 * Generates the Tax Invoice PDF once and sends that same file by email (attachment) and WhatsApp (document).
 * Either channel can be skipped with `email: false` / `phone: false`. Never throws for a failed channel.
 */
export async function dispatchInvoice(order, settings, { email, phone } = {}) {
  const st = settings || (await Setting.get());
  const pdf = await generateInvoicePdfBuffer(order, st);
  const targetEmail = email === false ? '' : (email || order.email || '').trim();
  const targetPhone = phone === false ? '' : (phone || order.shippingAddress?.phone || order.phone || '').trim();

  const [emailRes, waRes] = await Promise.allSettled([
    targetEmail ? sendOrderTaxInvoiceEmail(order, st, targetEmail, pdf) : null,
    targetPhone ? notifyCustomerOfOrderApprovalWhatsApp(order, st, targetPhone, pdf) : null,
  ]);
  const wa = waRes.value;
  const result = {
    email: !targetEmail
      ? null
      : emailRes.status === 'fulfilled'
        ? { to: targetEmail, status: emailRes.value?.delivered ? 'sent' : 'logged' }
        : { to: targetEmail, status: 'failed', error: emailRes.reason?.message },
    whatsapp: !targetPhone ? null : { to: targetPhone, status: wa?.status || 'failed', error: wa?.error },
    fileName: invoiceFileName(order),
    // Only used when the WhatsApp Cloud API is not set up: a chat the admin can attach the PDF to.
    whatsappLink: targetPhone ? buildWhatsAppChatLink(targetPhone, buildInvoiceCaption(order, st)) : '',
  };

  if (result.email?.status !== 'failed' || result.whatsapp?.status === 'sent') {
    order.invoiceSentAt = new Date();
    await order.save().catch(() => {});
  }
  return result;
}

/**
 * Admin approval: a Pending order becomes Confirmed, then the Tax Invoice PDF goes to email and WhatsApp.
 * On an order that is already past Pending it only re-sends the invoice.
 */
export async function approveOrder(order, adminUserId, recipients = {}) {
  if (['Cancelled', 'Returned'].includes(order.orderStatus)) {
    throw ApiError.badRequest(`This order is ${order.orderStatus.toLowerCase()}; its invoice cannot be sent`);
  }
  const settings = await Setting.get();
  const approved = order.orderStatus === 'Pending';
  if (approved) {
    const now = new Date();
    order.orderStatus = 'Confirmed';
    order.approvedAt = now;
    if (adminUserId) order.approvedBy = adminUserId;
    order.statusHistory.push({ status: 'Confirmed', note: 'Approved by admin - Tax Invoice PDF sent to customer', changedBy: adminUserId, at: now });
    await order.save();
  }

  const delivery = await dispatchInvoice(order, settings, recipients);
  const sentTo = [delivery.email?.status !== 'failed' && delivery.email?.to, delivery.whatsapp?.status === 'sent' && 'WhatsApp'].filter(Boolean);
  const message = `${approved ? 'Order approved. ' : ''}${sentTo.length ? `Tax Invoice PDF sent to ${sentTo.join(' and ')}.` : 'Tax Invoice PDF could not be sent.'}`;
  return { order, approved, delivery, whatsappLink: delivery.whatsappLink, message };
}

const STATUS_MESSAGES = {
  Confirmed: 'We have confirmed your order and will start preparing it shortly.',
  Processing: 'Your order is being prepared in our workshop.',
  Packed: 'Your order is packed and waiting for courier pickup.',
  Shipped: 'Your order is on its way.',
  'Out for Delivery': 'Your order is out for delivery today. Please keep your phone handy.',
  Delivered: 'Your order has been delivered. We hope you love it!',
  Cancelled: 'Your order has been cancelled.',
  Returned: 'Your return has been received and checked.',
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** A message from the team about an order, by email (also listed on the customer's order page). */
export async function sendOrderMessageEmail(order, message) {
  if (!order.email) return;
  const link = `${env.siteUrl}/account/orders/${order.orderId}`;
  await sendEmail({
    to: order.email,
    subject: `Message about your order ${order.orderId}`,
    text: [`Hi ${order.customerName},`, '', message, '', `Order: ${order.orderId} (${order.orderStatus})`, `View your order: ${link}`, '', 'WILDTANE'].join('\n'),
    html: `<p>Hi ${esc(order.customerName)},</p><p style="white-space:pre-line">${esc(message)}</p><p style="color:#666">Order <b>${esc(order.orderId)}</b> · ${esc(order.orderStatus)}</p><p><a href="${esc(link)}" style="background:#000;color:#fff;padding:12px 20px;text-decoration:none;border-radius:4px;display:inline-block">View your order</a></p><p>WILDTANE</p>`,
  });
}

/** Sends a team message about an order: saved on the order (customer sees it), emailed if asked. */
export async function addOrderMessage(order, { text, email = true }, adminId) {
  const message = String(text || '').trim().slice(0, 1000);
  if (message.length < 2) throw ApiError.badRequest('Write a message');
  const emailed = Boolean(email && order.email);
  order.customerMessages.push({ text: message, status: order.orderStatus, emailed, sentAt: new Date(), by: adminId });
  await order.save();
  if (emailed) sendOrderMessageEmail(order, message).catch((e) => console.error('[email] order message failed:', e.message));
  return order;
}

async function notifyCustomerOfStatus(order, when, note, message = '') {
  if (!order.email) return;
  const status = order.orderStatus;
  const time = when.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
  const link = `${env.siteUrl}/account/orders/${order.orderId}`;
  const tracking = order.trackingNumber ? `${order.courier ? `${order.courier} · ` : ''}${order.trackingNumber}` : '';
  // Cancellation emails state the refund exactly as it stands (initiated, processed, failed or not needed).
  const refund = status === 'Cancelled' ? refundLines(order) : [];
  const lines = [
    `Hi ${order.customerName},`,
    '',
    message || `${STATUS_MESSAGES[status] || `Your order status is now ${status}.`}`,
    ...(refund.length ? ['', 'Refund:', ...refund.map((l) => `• ${l}`)] : []),
    '',
    `Order: ${order.orderId}`,
    `Status: ${status}`,
    `Updated: ${time} IST`,
    tracking ? `Tracking: ${tracking}` : null,
    note ? `Note: ${note}` : null,
    '',
    `Track your order: ${link}`,
  ].filter((l) => l !== null);
  await sendEmail({
    to: order.email,
    subject: `Order ${order.orderId}: ${status}`,
    text: lines.join('\n'),
    html: `<p>Hi ${esc(order.customerName)},</p><p style="white-space:pre-line">${esc(message || STATUS_MESSAGES[status] || `Your order status is now ${status}.`)}</p>
${refund.length ? `<p><b>Refund</b></p><ul>${refund.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
<table style="border-collapse:collapse;font-size:14px">
<tr><td style="padding:4px 12px 4px 0;color:#666">Order</td><td><b>${esc(order.orderId)}</b></td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666">Status</td><td><b>${esc(status)}</b></td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666">Updated</td><td>${esc(time)} IST</td></tr>
${tracking ? `<tr><td style="padding:4px 12px 4px 0;color:#666">Tracking</td><td>${esc(tracking)}</td></tr>` : ''}
${note ? `<tr><td style="padding:4px 12px 4px 0;color:#666">Note</td><td>${esc(note)}</td></tr>` : ''}
</table>
<p><a href="${esc(link)}" style="background:#000;color:#fff;padding:12px 20px;text-decoration:none;border-radius:4px;display:inline-block">Track your order</a></p>`,
  });
}

// Cancellation policy: Available from time of order placement up to 7 days after delivery (item in hand), then disappears.
export const CANCEL_POST_DELIVERY_DAYS = 7;
export const CANCEL_POST_DELIVERY_MS = CANCEL_POST_DELIVERY_DAYS * 24 * 60 * 60 * 1000;
export const CANCEL_WINDOW_MS = CANCEL_POST_DELIVERY_MS;

/**
 * Customer cancellation. The request is submitted to the admin team (status: 'Requested').
 * Available anytime from order creation up to 7 days after the item is delivered.
 * Once 7 days post-delivery pass, the option expires and disappears.
 */
export async function cancelByCustomer(order, userId, reason) {
  if (order.orderStatus === 'Cancelled') throw ApiError.conflict('This order is already cancelled.');
  if (order.orderStatus === 'Returned') throw ApiError.conflict('This order has already been returned.');
  if (order.cancellation?.status === 'Requested') {
    throw ApiError.conflict('A cancellation request for this order is already in progress and awaiting admin confirmation.');
  }

  // Delivery check: if delivered, must be within 7 days of delivery
  const deliveryTime = order.deliveredAt
    ? new Date(order.deliveredAt).getTime()
    : order.statusHistory?.find((s) => s.status === 'Delivered')?.at
    ? new Date(order.statusHistory.find((s) => s.status === 'Delivered').at).getTime()
    : null;

  if (order.orderStatus === 'Delivered' && deliveryTime) {
    if (Date.now() - deliveryTime > CANCEL_POST_DELIVERY_MS) {
      throw ApiError.badRequest('The 7-day cancellation window has ended. Items can only be cancelled within 7 days of delivery.');
    }
  }

  const claimed = await Order.findOneAndUpdate(
    {
      _id: order._id,
      user: userId,
      orderStatus: { $nin: ['Cancelled', 'Returned'] },
      'cancellation.status': { $nin: ['Requested', 'Confirmed'] },
    },
    {
      $set: {
        'cancellation.status': 'Requested',
        'cancellation.reason': reason || '',
        'cancellation.requestedAt': new Date(),
        'cancellation.by': 'customer',
        'cancellation.adminMessage': '',
      },
    },
    { returnDocument: 'after' }
  );

  if (!claimed) throw ApiError.conflict('A cancellation for this order is already in progress or the order has changed. Please refresh.');
  return claimed;
}

/**
 * Admin cancellation decision: Confirm (YES) or Reject (NO), with optional custom message to customer.
 */
export async function decideOrderCancellation(orderId, { decision, adminMessage, notifyCustomer = true }, adminUserId) {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');

  const cleanMsg = String(adminMessage || '').trim();

  if (decision === 'Approved' || decision === 'Confirmed') {
    order.set('cancellation.status', 'Confirmed');
    order.set('cancellation.confirmedAt', new Date());
    order.set('cancellation.adminMessage', cleanMsg);
    if (!order.cancellation.requestedAt) order.set('cancellation.requestedAt', new Date());
    if (!order.cancellation.by) order.set('cancellation.by', 'customer');
    await order.save();

    const note = cleanMsg ? `Cancellation confirmed by admin: ${cleanMsg}` : 'Cancellation confirmed by admin';
    return await changeOrderStatus(order, { status: 'Cancelled', note, notifyCustomer }, adminUserId);
  } else if (decision === 'Rejected') {
    order.set('cancellation.status', 'Rejected');
    order.set('cancellation.adminMessage', cleanMsg);
    order.statusHistory.push({
      status: order.orderStatus,
      note: cleanMsg ? `Cancellation request rejected: ${cleanMsg}` : 'Cancellation request rejected by admin',
      changedBy: adminUserId,
      at: new Date(),
    });
    await order.save();
    return order;
  } else {
    throw ApiError.badRequest('Invalid decision. Must be Approved or Rejected.');
  }
}

/**
 * Admin: send a refund that is awaiting approval, or retry a failed one
 * (checks Razorpay first so nothing is ever refunded twice).
 */
export async function retryOrderRefund(order) {
  if (order.orderStatus !== 'Cancelled') throw ApiError.badRequest('Only cancelled orders can be refunded from here.');
  if (!['Failed', 'Awaiting approval'].includes(order.refundDetails?.status)) throw ApiError.badRequest('There is no refund waiting to be sent on this order.');
  return refundCancelledOrder(order._id, { retryFailed: true, notify: true });
}

export { applyRefundWebhook };

/** True when the user has a delivered order containing this product (for verified reviews). */
export async function findVerifiedPurchase(userId, productId) {
  return Order.findOne({ user: userId, orderStatus: 'Delivered', 'items.productId': productId }).select('_id');
}

export async function reviewableProducts(userId) {
  const orders = await Order.find({ user: userId, orderStatus: 'Delivered' }).select('items.productId');
  const ids = [...new Set(orders.flatMap((o) => o.items.map((i) => i.productId.toString())))];
  const reviewed = await Review.find({ user: userId, product: { $in: ids } }).select('product');
  const done = new Set(reviewed.map((r) => r.product.toString()));
  return ids.filter((id) => !done.has(id));
}

function findQuery(idOrOrderId) {
  return mongoose.isValidObjectId(idOrOrderId) ? { _id: idOrOrderId } : { orderId: idOrOrderId };
}

export async function verifyOrderPayment(idOrOrderId, { razorpayOrderId, razorpayPaymentId, razorpaySignature, userId }) {
  const query = findQuery(idOrOrderId);
  if (userId) query.user = userId;

  const order = await Order.findOne(query);
  if (!order) throw ApiError.notFound('Order not found');

  if (order.paymentStatus === 'Paid') {
    return order;
  }

  const valid = verifyRazorpaySignature({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  if (!valid) {
    throw ApiError.badRequest('Payment verification failed: invalid signature');
  }
  // The payment must be for the gateway order created for THIS order ("Pay now"), for its full amount.
  const expectedGatewayOrder = order.paymentDetails?.gatewayOrder?.id || order.paymentReference;
  if (expectedGatewayOrder && expectedGatewayOrder !== razorpayOrderId) {
    throw ApiError.badRequest('This payment does not belong to this order.');
  }
  if (await Order.exists({ _id: { $ne: order._id }, 'paymentDetails.razorpayPaymentId': razorpayPaymentId })) {
    throw ApiError.conflict('This payment has already been used for another order.');
  }
  const check = await confirmRazorpayPayment({ razorpayOrderId, razorpayPaymentId }, order.grandTotal);
  if (!check.ok) {
    const refund = ['Cancelled', 'Returned'].includes(order.orderStatus) || !check.gatewayError ? await refundUnusedPayment(check.payment, check.reason) : null;
    throw ApiError.badRequest(refund ? `${check.reason} The payment has been refunded (refund ${refund.id}).` : `${check.reason} If money was taken, contact support with payment ID ${razorpayPaymentId}.`);
  }
  if (['Cancelled', 'Returned'].includes(order.orderStatus)) {
    const refund = await refundUnusedPayment(check.payment, 'Order was cancelled before payment completed');
    throw ApiError.badRequest(`This order was cancelled, so the payment ${refund ? `has been refunded (refund ${refund.id})` : 'will be refunded by our team'}.`);
  }

  order.paymentStatus = 'Paid';
  order.paymentReference = razorpayPaymentId;
  order.paymentDetails = {
    ...(order.paymentDetails || {}),
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    capturedAmountPaise: Number(check.payment.amount),
    gatewayStatus: check.payment.status,
    verifiedAt: new Date(),
  };

  order.statusHistory.push({
    status: order.orderStatus,
    note: `Online payment received via Razorpay (${razorpayPaymentId})`,
    at: new Date(),
  });

  await order.save();
  return order;
}

export async function retryOrderPayment(idOrOrderId, userId) {
  const query = findQuery(idOrOrderId);
  if (userId) query.user = userId;

  const order = await Order.findOne(query);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.paymentStatus === 'Paid') throw ApiError.badRequest('Order is already paid');
  if (['Cancelled', 'Returned'].includes(order.orderStatus)) throw ApiError.badRequest('Order has been cancelled');

  const provider = getProvider(order.paymentMethod);
  if (!provider || typeof provider.initiate !== 'function') {
    throw ApiError.badRequest('Payment method does not support online payment');
  }

  const payment = await provider.initiate(order);
  if (payment.reference) {
    order.paymentReference = payment.reference;
    order.paymentDetails = { gatewayOrder: payment.gatewayOrder };
    await order.save();
  }
  return { order, payment };
}

export async function handleRazorpayWebhook(event) {
  const eventName = event?.event;
  if (String(eventName).startsWith('refund.')) return applyRefundWebhook(eventName, event?.payload?.refund?.entity);
  const paymentEntity = event?.payload?.payment?.entity;
  const orderEntity = event?.payload?.order?.entity;

  const rzpOrderId = paymentEntity?.order_id || orderEntity?.id;
  const rzpPaymentId = paymentEntity?.id;
  const orderNum = paymentEntity?.notes?.orderNum || orderEntity?.notes?.orderNum;
  const orderDbId = paymentEntity?.notes?.orderId || orderEntity?.notes?.orderId;

  const query = {};
  if (orderNum) query.orderId = orderNum;
  else if (orderDbId && mongoose.isValidObjectId(orderDbId)) query._id = orderDbId;
  else if (rzpOrderId) query.paymentReference = rzpOrderId;
  else return { handled: false, reason: 'No order identifier found' };

  const order = await Order.findOne(query);
  if (!order) return { handled: false, reason: 'Order not found' };

  if (eventName === 'payment.captured' || eventName === 'order.paid') {
    if (order.paymentStatus !== 'Paid') {
      order.paymentStatus = 'Paid';
      if (rzpPaymentId) order.paymentReference = rzpPaymentId;
      order.paymentDetails = {
        ...(order.paymentDetails || {}),
        ...(rzpPaymentId ? { razorpayPaymentId: rzpPaymentId } : {}),
        ...(paymentEntity?.amount ? { capturedAmountPaise: Number(paymentEntity.amount) } : {}),
        webhookEvent: eventName,
        paymentEntity,
        verifiedAt: new Date(),
      };
      order.statusHistory.push({
        status: order.orderStatus,
        note: `Payment marked Paid via Razorpay Webhook (${eventName})`,
        at: new Date(),
      });
      await order.save();
    }
    return { handled: true, orderId: order.orderId };
  } else if (eventName === 'payment.failed') {
    if (order.paymentStatus === 'Pending') {
      order.paymentStatus = 'Failed';
      order.statusHistory.push({
        status: order.orderStatus,
        note: `Payment failed via Razorpay (${paymentEntity?.error_description || 'failed'})`,
        at: new Date(),
      });
      await order.save();
    }
    return { handled: true, orderId: order.orderId };
  }

  return { handled: true, ignoredEvent: eventName };
}
