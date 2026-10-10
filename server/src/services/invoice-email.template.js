import { formatINR } from '../utils/helpers.js';
import env from '../config/env.js';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Short covering email for the Tax Invoice. The bill itself travels as the attached PDF,
 * so the body only says what is attached and how to reach support.
 */
export function buildInvoiceCoverEmail(order, settings = {}, fileName = `WILDTANE_Tax_Invoice_${order.orderId}.pdf`) {
  const storeName = settings.storeName || 'WILDTANE';
  const supportEmail = settings.supportEmail || 'info@wildtane.com';
  const supportPhone = settings.supportPhone || '8920550465';
  const orderUrl = `${env.siteUrl}/account/orders/${order.orderId}`;
  const logoUrl = `${env.siteUrl}/brand/logo-horizontal-dark.png`;
  const first = String(order.customerName || 'there').split(' ')[0];

  const subject = `Your Tax Invoice for order #${order.orderId} - ${storeName}`;

  const text = [
    `Hi ${first},`,
    '',
    `Your order #${order.orderId} has been approved. Your Tax Invoice is attached to this email as a PDF (${fileName}).`,
    `Amount: ${formatINR(order.grandTotal)}`,
    '',
    `Track your order: ${orderUrl}`,
    `Questions? ${supportEmail} · ${supportPhone}`,
    '',
    `Thank you for shopping with ${storeName}.`,
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;border:1px solid #e4e4e7;overflow:hidden;">
        <tr><td style="padding:24px 28px 8px 28px;">
          <img src="${esc(logoUrl)}" alt="${esc(storeName)}" width="150" style="width:150px;height:auto;display:block;border:0;" />
        </td></tr>
        <tr><td style="padding:12px 28px 4px 28px;">
          <p style="margin:0 0 12px 0;font-size:15px;">Hi ${esc(first)},</p>
          <p style="margin:0 0 18px 0;font-size:15px;line-height:1.55;color:#3f3f46;">
            Your order <strong style="color:#18181b;">#${esc(order.orderId)}</strong> has been approved.
            Your Tax Invoice is attached to this email as a PDF.
          </p>
        </td></tr>
        <tr><td style="padding:0 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;border-radius:10px;">
            <tr>
              <td style="padding:14px 16px;width:44px;vertical-align:middle;">
                <div style="width:40px;height:40px;border-radius:8px;background:#dc2626;color:#ffffff;font-size:11px;font-weight:800;line-height:40px;text-align:center;letter-spacing:0.5px;">PDF</div>
              </td>
              <td style="padding:14px 4px;vertical-align:middle;">
                <div style="font-size:13px;font-weight:600;color:#18181b;word-break:break-all;">${esc(fileName)}</div>
                <div style="font-size:12px;color:#71717a;margin-top:2px;">Tax Invoice · ${esc(formatINR(order.grandTotal))}</div>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:22px 28px 6px 28px;">
          <a href="${esc(orderUrl)}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 20px;border-radius:9px;">Track your order</a>
        </td></tr>
        <tr><td style="padding:18px 28px 26px 28px;font-size:12px;color:#71717a;line-height:1.6;">
          Questions about your bill? Reply to this email or contact
          <a href="mailto:${esc(supportEmail)}" style="color:#18181b;">${esc(supportEmail)}</a> · ${esc(supportPhone)}.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
