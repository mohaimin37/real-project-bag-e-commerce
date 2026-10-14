import env from '../config/env.js';
import Setting from '../models/Setting.js';

/**
 * Shiprocket integration (https://apidocs.shiprocket.in). Off until SHIPROCKET_EMAIL and
 * SHIPROCKET_PASSWORD (an API user created under Settings → API in Shiprocket) are set.
 * Everything saved on an order comes from Shiprocket's own responses; nothing is assumed.
 */
const BASE = 'https://apiv2.shiprocket.in/v1/external';

export const shippingConfigured = () => env.shiprocket.enabled;

let auth = { token: '', exp: 0 };

async function token() {
  if (auth.token && auth.exp > Date.now()) return auth.token;
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: env.shiprocket.email, password: env.shiprocket.password }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) throw new Error(data.message || `Shiprocket login failed (${res.status})`);
  // Tokens last 10 days; refresh after 9.
  auth = { token: data.token, exp: Date.now() + 9 * 24 * 60 * 60 * 1000 };
  return auth.token;
}

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) auth = { token: '', exp: 0 };
  if (!res.ok) {
    const detail = data.errors ? Object.values(data.errors).flat().join('; ') : '';
    throw new Error([data.message || `Shiprocket error ${res.status}`, detail].filter(Boolean).join(': '));
  }
  return data;
}

const splitName = (full = '') => {
  const [first, ...rest] = String(full).trim().split(/\s+/);
  return { first: first || 'Customer', last: rest.join(' ') };
};
const phone10 = (p) => String(p || '').replace(/\D/g, '').slice(-10);
const dateStr = (d) => new Date(d).toISOString().slice(0, 16).replace('T', ' ');

function packageFrom(settings) {
  const p = settings?.shippingPackage || {};
  return { length: p.lengthCm || 40, breadth: p.breadthCm || 30, height: p.heightCm || 15, weight: p.weightKg || 1 };
}

function itemsFrom(items) {
  return items.map((it) => ({
    name: it.productName,
    sku: it.SKU || it.sku || String(it.productId),
    units: it.quantity,
    selling_price: it.unitPrice,
  }));
}

/** Forward shipment: creates the Shiprocket order, then asks it to assign a courier (AWB). */
export async function createForwardShipment(order) {
  if (!shippingConfigured()) throw new Error('Shipping provider is not configured (set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD).');
  const settings = await Setting.get();
  const a = order.shippingAddress;
  const name = splitName(a.fullName || order.customerName);
  const created = await call('POST', '/orders/create/adhoc', {
    order_id: order.orderId,
    order_date: dateStr(order.createdAt),
    pickup_location: settings.shippingPackage?.pickupLocation || 'Primary',
    billing_customer_name: name.first,
    billing_last_name: name.last,
    billing_address: a.addressLine1,
    billing_address_2: [a.addressLine2, a.landmark].filter(Boolean).join(', '),
    billing_city: a.city,
    billing_pincode: a.postalCode,
    billing_state: a.state,
    billing_country: a.country === 'IN' ? 'India' : a.country,
    billing_email: order.email,
    billing_phone: phone10(a.phone || order.phone),
    shipping_is_billing: true,
    order_items: itemsFrom(order.items),
    // COD only when cash is still to be collected at the door.
    payment_method: order.paymentMethod === 'cod' && order.paymentStatus !== 'Paid' ? 'COD' : 'Prepaid',
    sub_total: order.grandTotal,
    ...packageFrom(settings),
  });

  const shipment = {
    provider: 'shiprocket',
    providerOrderId: String(created.order_id || ''),
    shipmentId: String(created.shipment_id || ''),
    status: created.status || 'NEW',
    awb: created.awb_code || '',
    courier: created.courier_name || '',
    createdAt: new Date(),
    lastSyncedAt: new Date(),
    error: '',
  };

  if (shipment.shipmentId && !shipment.awb) {
    try {
      const assigned = await call('POST', '/courier/assign/awb', { shipment_id: shipment.shipmentId });
      const r = assigned?.response?.data || {};
      if (r.awb_code) {
        shipment.awb = r.awb_code;
        shipment.courier = r.courier_name || shipment.courier;
        shipment.status = 'AWB ASSIGNED';
      }
    } catch (err) {
      // The order exists in Shiprocket; the admin can assign a courier there or retry.
      shipment.error = `Courier not assigned yet: ${err.message}`;
    }
  }
  if (shipment.awb) shipment.trackingUrl = `https://shiprocket.co/tracking/${shipment.awb}`;
  return shipment;
}

/** Latest tracking for an AWB, as Shiprocket reports it. */
export async function trackShipment(awb) {
  if (!shippingConfigured()) throw new Error('Shipping provider is not configured.');
  const data = await call('GET', `/courier/track/awb/${encodeURIComponent(awb)}`);
  const t = data?.tracking_data || {};
  const latest = t.shipment_track?.[0] || {};
  const activities = (t.shipment_track_activities || []).map((x) => ({ at: x.date, status: x['sr-status-label'] || x.activity, location: x.location }));
  return {
    status: latest.current_status || activities[0]?.status || '',
    courier: latest.courier_name || '',
    delivered: /delivered/i.test(latest.current_status || ''),
    deliveredAt: latest.delivered_date || null,
    activities,
    trackingUrl: t.track_url || `https://shiprocket.co/tracking/${awb}`,
  };
}

/** Reverse pickup for a return/exchange: the courier collects from the customer's door. */
export async function createReversePickup(request, order) {
  if (!shippingConfigured()) throw new Error('Shipping provider is not configured (set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD).');
  const settings = await Setting.get();
  const w = env.shiprocket.warehouse;
  if (!w.address || !w.pincode || !w.phone) {
    throw new Error('Set SHIPROCKET_WAREHOUSE_* (where returns are delivered) before booking pickups.');
  }
  const a = request.pickupAddress || order.shippingAddress;
  const name = splitName(a.fullName || order.customerName);
  const subTotal = request.items.reduce((n, it) => n + (it.unitPrice || 0) * it.quantity, 0);
  const created = await call('POST', '/orders/create/return', {
    order_id: request.requestId,
    order_date: dateStr(request.createdAt || new Date()),
    pickup_customer_name: name.first,
    pickup_last_name: name.last,
    pickup_address: a.addressLine1,
    pickup_address_2: a.addressLine2 || '',
    pickup_city: a.city,
    pickup_state: a.state,
    pickup_country: 'India',
    pickup_pincode: a.postalCode,
    pickup_email: order.email,
    pickup_phone: phone10(a.phone || order.phone),
    shipping_customer_name: w.name || settings.companyName || 'WILDTANE',
    shipping_address: w.address,
    shipping_city: w.city,
    shipping_country: 'India',
    shipping_pincode: w.pincode,
    shipping_state: w.state,
    shipping_email: settings.supportEmail || '',
    shipping_phone: phone10(w.phone),
    order_items: itemsFrom(request.items),
    payment_method: 'Prepaid',
    sub_total: subTotal,
    ...packageFrom(settings),
  });
  return {
    provider: 'shiprocket',
    providerOrderId: String(created.order_id || ''),
    shipmentId: String(created.shipment_id || ''),
    awb: created.awb_code || '',
    courier: created.courier_name || '',
    status: created.status || 'RETURN PENDING',
    scheduledAt: new Date(),
    lastSyncedAt: new Date(),
    error: '',
  };
}

/** Maps Shiprocket's status text to our order status (only the steps we can be sure of). */
export function orderStatusFromProvider(text = '') {
  const s = String(text).toUpperCase();
  if (/^DELIVERED/.test(s)) return 'Delivered';
  if (/OUT FOR DELIVERY/.test(s)) return 'Out for Delivery';
  if (/SHIPPED|IN TRANSIT|PICKED UP|REACHED/.test(s)) return 'Shipped';
  return null;
}
