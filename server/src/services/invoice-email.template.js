import { formatINR, amountInWords } from '../utils/helpers.js';
import { countryName } from '../utils/countries.js';
import { PAYMENT_LABELS } from './whatsapp.service.js';
import env from '../config/env.js';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Builds a formal, high-fidelity Tax Invoice HTML email.
 * Includes the company logo, registered address (Paharganj , New Delhi , 110055),
 * GSTIN, itemized breakdown with images, financial summary, and verification badge.
 */
export function buildTaxInvoiceHtml(order, settings = {}) {
  const storeName = settings.storeName || 'WILDTANE';
  const companyName = settings.companyName || 'WILDTANE PRIVATE LIMITED';
  const businessAddress = settings.businessAddress || 'Paharganj , New Delhi , 110055';
  const gstin = settings.gstin || '07AAECW3767F1Z4';
  const supportEmail = settings.supportEmail || 'info@wildtane.com';
  const supportPhone = settings.supportPhone || '8920550465';

  const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  const invoiceDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  const a = order.shippingAddress || {};
  const orderUrl = `${env.siteUrl}/account/orders/${order.orderId}`;
  const logoUrl = `${env.siteUrl}/brand/logo-horizontal-gold.png`;
  const logoFallback = 'https://raw.githubusercontent.com/mohaimin37/bag-ecommerce-ver-10/main/client/public/brand/logo-horizontal-gold.png';

  const itemRows = order.items
    .map((it, idx) => {
      const img = it.image
        ? `<img src="${esc(it.image)}" alt="${esc(it.productName)}" width="48" height="48" style="width:48px;height:48px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;vertical-align:middle;margin-right:10px;display:inline-block;" />`
        : '';
      const variantText = [it.variant?.name, it.variant?.size].filter(Boolean).join(' · ');
      return `
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:12px 8px;font-size:13px;color:#6b7280;vertical-align:top;width:24px;">${idx + 1}</td>
          <td style="padding:12px 8px;vertical-align:top;">
            <div style="display:flex;align-items:center;">
              ${img}
              <div>
                <div style="font-weight:600;font-size:14px;color:#111827;line-height:1.3;">${esc(it.productName)}</div>
                ${variantText ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">Variant: ${esc(variantText)}</div>` : ''}
                <div style="font-size:11px;color:#9ca3af;margin-top:2px;font-family:monospace;">SKU: ${esc(it.SKU)}</div>
              </div>
            </div>
          </td>
          <td style="padding:12px 8px;font-size:13px;text-align:center;color:#374151;vertical-align:top;">${it.quantity}</td>
          <td style="padding:12px 8px;font-size:13px;text-align:right;color:#374151;vertical-align:top;white-space:nowrap;">${formatINR(it.unitPrice)}</td>
          <td style="padding:12px 8px;font-size:13px;text-align:right;font-weight:600;color:#111827;vertical-align:top;white-space:nowrap;">${formatINR(it.totalPrice)}</td>
        </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Tax Invoice - ${esc(order.orderId)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width:680px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);border:1px solid #e5e7eb;" cellpadding="0" cellspacing="0">
          
          <!-- Top Accent Gold Bar -->
          <tr>
            <td style="height:6px;background:linear-gradient(90deg, #c5a059 0%, #e0c888 50%, #c5a059 100%);"></td>
          </tr>

          <!-- Header with Company Logo & Status Badge -->
          <tr>
            <td style="padding:28px 32px 20px 32px;background:#ffffff;border-bottom:1px solid #f3f4f6;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <a href="${esc(env.siteUrl)}" target="_blank" style="text-decoration:none;display:inline-block;">
                      <img src="${esc(logoUrl)}" onerror="this.onerror=null;this.src='${esc(logoFallback)}';" alt="${esc(storeName)}" width="180" style="width:180px;max-width:180px;height:auto;display:block;border:0;" />
                    </a>
                    <div style="font-size:12px;color:#9ca3af;margin-top:4px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">Architectural Carry & Gear</div>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <div style="display:inline-block;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;font-size:11px;font-weight:700;letter-spacing:0.5px;padding:6px 12px;border-radius:9999px;text-transform:uppercase;margin-bottom:6px;">
                      &#10003; Order Approved by Admin
                    </div>
                    <div style="font-size:20px;font-weight:800;color:#111827;letter-spacing:-0.5px;">TAX INVOICE</div>
                    <div style="font-size:12px;color:#6b7280;margin-top:2px;">Invoice: <strong style="color:#111827;font-family:monospace;">${esc(order.orderId)}</strong></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Seller / Registered Business Office Banner -->
          <tr>
            <td style="padding:16px 32px;background:#fafafa;border-bottom:1px solid #e5e7eb;font-size:12px;color:#4b5563;line-height:1.6;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" style="vertical-align:top;width:60%;">
                    <strong style="color:#111827;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">${esc(companyName)}</strong><br>
                    <span>Registered Address: <strong>${esc(businessAddress)}</strong></span><br>
                    <span>GSTIN: <strong style="font-family:monospace;color:#111827;">${esc(gstin)}</strong></span>
                  </td>
                  <td align="right" style="vertical-align:top;width:40%;">
                    <span>Date of Invoice: <strong>${esc(invoiceDate)}</strong></span><br>
                    <span>Order Date: <strong>${esc(orderDate)}</strong></span><br>
                    <span>Support: <a href="mailto:${esc(supportEmail)}" style="color:#c5a059;text-decoration:none;">${esc(supportEmail)}</a> · ${esc(supportPhone)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Customer Greeting & Approval Note -->
          <tr>
            <td style="padding:24px 32px 12px 32px;">
              <p style="margin:0 0 8px 0;font-size:15px;color:#111827;font-weight:600;">Dear ${esc(order.customerName)},</p>
              <p style="margin:0;font-size:13px;color:#4b5563;line-height:1.6;">
                Your order has been thoroughly reviewed and <strong>approved by our administration team</strong>. Below is your official Tax Invoice and breakdown of your purchase. Your shipment is being prepared for dispatch.
              </p>
            </td>
          </tr>

          <!-- Bill To & Ship To Boxes -->
          <tr>
            <td style="padding:12px 32px 20px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Bill To -->
                  <td width="48%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;vertical-align:top;">
                    <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:#6b7280;margin-bottom:6px;">Billed To</div>
                    <div style="font-weight:700;font-size:13px;color:#111827;">${esc(order.customerName)}</div>
                    <div style="font-size:12px;color:#4b5563;margin-top:2px;">${esc(order.email)}</div>
                    <div style="font-size:12px;color:#4b5563;">${esc(order.phone)}</div>
                  </td>
                  <td width="4%"></td>
                  <!-- Ship To -->
                  <td width="48%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;vertical-align:top;">
                    <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:#6b7280;margin-bottom:6px;">Ship To</div>
                    <div style="font-weight:700;font-size:13px;color:#111827;">${esc(a.fullName || order.customerName)}</div>
                    <div style="font-size:12px;color:#4b5563;margin-top:2px;">${esc(a.addressLine1)}${a.addressLine2 ? `, ${esc(a.addressLine2)}` : ''}</div>
                    ${a.landmark ? `<div style="font-size:12px;color:#6b7280;">Landmark: ${esc(a.landmark)}</div>` : ''}
                    <div style="font-size:12px;color:#4b5563;">${esc(a.city)}, ${esc(a.state)} ${esc(a.postalCode)}</div>
                    <div style="font-size:12px;color:#4b5563;">${esc(countryName(a.country))} · Phone: ${esc(a.phone || order.phone)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Itemized Table -->
          <tr>
            <td style="padding:10px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                <thead>
                  <tr style="background:#f3f4f6;color:#374151;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">
                    <th style="padding:10px 8px;text-align:left;font-weight:700;width:24px;">#</th>
                    <th style="padding:10px 8px;text-align:left;font-weight:700;">Item & Details</th>
                    <th style="padding:10px 8px;text-align:center;font-weight:700;width:40px;">Qty</th>
                    <th style="padding:10px 8px;text-align:right;font-weight:700;width:90px;">Unit Price</th>
                    <th style="padding:10px 8px;text-align:right;font-weight:700;width:100px;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Summary & Totals -->
          <tr>
            <td style="padding:16px 32px 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Left: Words and Notes -->
                  <td width="55%" style="vertical-align:top;padding-right:20px;">
                    <div style="background:#f9fafb;border-left:3px solid #c5a059;padding:12px;border-radius:4px;font-size:12px;line-height:1.5;">
                      <div style="font-size:10px;text-transform:uppercase;font-weight:700;color:#6b7280;letter-spacing:0.5px;">Amount in Words:</div>
                      <div style="font-weight:700;color:#111827;margin-top:2px;">${esc(amountInWords(order.grandTotal))}</div>
                    </div>
                    <div style="margin-top:14px;font-size:12px;color:#4b5563;line-height:1.5;">
                      <strong>Payment Method:</strong> ${esc(PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod)}<br>
                      <strong>Payment Status:</strong> <span style="font-weight:600;color:${order.paymentStatus === 'Paid' ? '#059669' : '#d97706'}">${esc(order.paymentStatus)}</span><br>
                      <strong>Fulfilment Status:</strong> ${esc(order.orderStatus)} (Admin Approved)
                    </div>
                  </td>
                  <!-- Right: Financial Breakdown -->
                  <td width="45%" style="vertical-align:top;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:1.8;">
                      <tr>
                        <td style="color:#6b7280;">Subtotal:</td>
                        <td style="text-align:right;font-weight:600;color:#111827;">${formatINR(order.subtotal)}</td>
                      </tr>
                      ${order.discount > 0 ? `
                      <tr>
                        <td style="color:#059669;">Discount ${order.coupon?.code ? `(${esc(order.coupon.code)})` : ''}:</td>
                        <td style="text-align:right;font-weight:600;color:#059669;">&minus;${formatINR(order.discount)}</td>
                      </tr>` : ''}
                      ${order.coinDiscount > 0 ? `
                      <tr>
                        <td style="color:#059669;">WILDTANE Coins (${order.coinsRedeemed}):</td>
                        <td style="text-align:right;font-weight:600;color:#059669;">&minus;${formatINR(order.coinDiscount)}</td>
                      </tr>` : ''}
                      <tr>
                        <td style="color:#6b7280;">Shipping (${esc(order.shippingMethod?.label || 'Standard')}):</td>
                        <td style="text-align:right;font-weight:600;color:#111827;">${order.shipping ? formatINR(order.shipping) : 'Free'}</td>
                      </tr>
                      <tr>
                        <td style="color:#6b7280;">GST / Tax:</td>
                        <td style="text-align:right;font-weight:600;color:#111827;">${formatINR(order.tax)}</td>
                      </tr>
                      <tr style="border-top:2px solid #111827;">
                        <td style="padding-top:8px;font-size:15px;font-weight:800;color:#111827;">Grand Total:</td>
                        <td style="padding-top:8px;font-size:16px;font-weight:800;color:#111827;text-align:right;">${formatINR(order.grandTotal)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Track & View Invoice CTA Button -->
          <tr>
            <td align="center" style="padding:10px 32px 28px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background:#111827;border-radius:8px;">
                    <a href="${esc(orderUrl)}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.5px;">
                      View Live Order &amp; Invoice &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer & Legal Verification Note -->
          <tr>
            <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;line-height:1.6;text-align:center;">
              <div style="font-weight:700;color:#374151;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">
                ${esc(companyName)}
              </div>
              <div>Registered Office: <strong>${esc(businessAddress)}</strong></div>
              <div>GSTIN: ${esc(gstin)} &middot; Email: ${esc(supportEmail)} &middot; Phone: ${esc(supportPhone)}</div>
              <div style="margin-top:8px;color:#9ca3af;">
                This is a digitally generated Tax Invoice approved by Wildtane administration. No physical signature is required.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Plain-text fallback for the Tax Invoice email. */
export function buildTaxInvoiceText(order, settings = {}) {
  const storeName = settings.storeName || 'WILDTANE';
  const companyName = settings.companyName || 'WILDTANE PRIVATE LIMITED';
  const businessAddress = settings.businessAddress || 'Paharganj , New Delhi , 110055';
  const gstin = settings.gstin || '07AAECW3767F1Z4';

  const items = order.items
    .map(
      (it, idx) =>
        `${idx + 1}. ${it.productName} (${it.variant?.name || 'Standard'}) x ${it.quantity} = ${formatINR(it.totalPrice)} (SKU: ${it.SKU})`
    )
    .join('\n');

  return `
TAX INVOICE - ${companyName}
==================================================
Order ID: ${order.orderId}
Status: Confirmed & Approved by Admin
Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}

Registered Office: ${businessAddress}
GSTIN: ${gstin}
Support: ${settings.supportEmail || 'info@wildtane.com'} | ${settings.supportPhone || '8920550465'}

CUSTOMER DETAILS:
Name: ${order.customerName}
Email: ${order.email}
Phone: ${order.phone}

SHIPPING ADDRESS:
${order.shippingAddress?.fullName || order.customerName}
${order.shippingAddress?.addressLine1} ${order.shippingAddress?.addressLine2 || ''}
${order.shippingAddress?.city}, ${order.shippingAddress?.state} ${order.shippingAddress?.postalCode}

ITEMS:
${items}

FINANCIAL BREAKDOWN:
Subtotal: ${formatINR(order.subtotal)}
Discount: -${formatINR(order.discount)}
Shipping: ${order.shipping ? formatINR(order.shipping) : 'Free'}
GST / Tax: ${formatINR(order.tax)}
GRAND TOTAL: ${formatINR(order.grandTotal)}
Amount in Words: ${amountInWords(order.grandTotal)}
Payment Method: ${order.paymentMethod} (${order.paymentStatus})

View your order & tax invoice online:
${env.siteUrl}/account/orders/${order.orderId}

Thank you for choosing ${storeName}!
  `.trim();
}
