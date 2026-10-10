import crypto from 'crypto';
import { createRequire } from 'module';

if (typeof globalThis.__filename === 'undefined') {
  globalThis.__filename = '/var/task/client/netlify/functions/api.js';
}

const rawPdf = typeof require === 'function' ? require('pdfkit') : createRequire(import.meta.url)('pdfkit');
const PDFDocument = rawPdf?.default || rawPdf;
import env from '../config/env.js';
import { countryName } from '../utils/countries.js';
import { INTER_REGULAR, INTER_SEMIBOLD, INTER_BOLD, LOGO_GOLD_PNG } from '../assets/invoice-assets.js';

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function words(n) {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`;
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ' ' + words(n % 100) : ''}`;
  if (n < 100000) return `${words(Math.floor(n / 1000))} Thousand${n % 1000 ? ' ' + words(n % 1000) : ''}`;
  if (n < 10000000) return `${words(Math.floor(n / 100000))} Lakh${n % 100000 ? ' ' + words(n % 100000) : ''}`;
  return `${words(Math.floor(n / 10000000))} Crore${n % 10000000 ? ' ' + words(n % 10000000) : ''}`;
}

export function amountInWords(amount) {
  const rupees = Math.floor(amount || 0);
  const paise = Math.round(((amount || 0) - rupees) * 100);
  return `Rupees ${words(rupees) || 'Zero'}${paise ? ' and ' + words(paise) + ' Paise' : ''} Only`;
}

// GST state codes (first two digits of a GSTIN) — used for "Place of supply" and CGST/SGST vs IGST.
const GST_STATES = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand',
  '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim',
  '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya',
  '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh',
  '24': 'Gujarat', '26': 'Dadra and Nagar Haveli and Daman and Diu', '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa',
  '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
};
const normState = (s) => String(s || '').toLowerCase().replace(/^nct of |^new /, '').replace(/[^a-z]/g, '');
function stateCode(name) {
  const n = normState(name);
  return Object.keys(GST_STATES).find((c) => normState(GST_STATES[c]) === n) || '';
}

/** "Paharganj , New Delhi , 110055" → "Paharganj, New Delhi, 110055" */
export const tidyAddress = (s) => String(s || '').replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ').trim();

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
const PAYMENT_LABELS = { cod: 'Cash on Delivery', card: 'Card', upi: 'UPI / Net Banking', wallet: 'Wallet' };

export const invoiceFileName = (order) => `WILDTANE_Tax_Invoice_${order.orderId}.pdf`;

export function getInvoiceToken(order) {
  const secret = env.jwt?.secret || 'wildtane_secret';
  const id = order?._id?.toString() || '';
  const orderId = order?.orderId || '';
  return crypto.createHmac('sha256', secret).update(`${id}:${orderId}`).digest('hex').slice(0, 16);
}

// Palette: neutral ink with an emerald "paid" accent (gold is reserved for the logo).
const C = {
  ink: '#18181b',
  ink2: '#3f3f46',
  muted: '#71717a',
  line: '#e4e4e7',
  soft: '#f4f4f5',
  band: '#111113',
  white: '#ffffff',
  green: '#047857',
  greenSoft: '#d1fae5',
  red: '#b91c1c',
  redSoft: '#fee2e2',
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 40; // side margin
const CONTENT_W = PAGE_W - M * 2;
const BOTTOM = PAGE_H - 50; // content must stay above the page footer band

/**
 * Generates the official GST Tax Invoice PDF (A4) as a Buffer.
 * The same file is shown in the admin preview, attached to the email and sent as a WhatsApp document.
 */
export function generateInvoicePdfBuffer(order, settings = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        bufferPages: true,
        font: Buffer.from(INTER_REGULAR, 'base64'),
        info: {
          Title: `Tax Invoice ${order.orderId}`,
          Author: settings.companyName || 'WILDTANE PRIVATE LIMITED',
          Subject: `Tax Invoice for order ${order.orderId}`,
        },
      });
      const buffers = [];
      doc.on('data', (b) => buffers.push(b));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => {
        console.error('[pdf-invoice] Stream error:', err);
        reject(err);
      });

      doc.registerFont('R', Buffer.from(INTER_REGULAR, 'base64'));
      doc.registerFont('S', Buffer.from(INTER_SEMIBOLD, 'base64'));
      doc.registerFont('B', Buffer.from(INTER_BOLD, 'base64'));

      const companyName = settings.companyName || 'WILDTANE PRIVATE LIMITED';
      const storeName = settings.storeName || 'WILDTANE';
      const address = tidyAddress(settings.businessAddress || 'Paharganj, New Delhi, 110055');
      const gstin = (settings.gstin || '07AAECW3767F1Z4').toUpperCase();
      const email = settings.supportEmail || 'info@wildtane.com';
      const phone = settings.supportPhone || '8920550465';
      const taxRate = Number(settings.taxRate ?? 18);
      const taxLabel = settings.taxLabel || 'GST';

      const a = order.shippingAddress || {};
      const sellerCode = gstin.slice(0, 2);
      const buyerCode = stateCode(a.state);
      const intraState = Boolean(buyerCode) && buyerCode === sellerCode;
      const tax = Number(order.tax || 0);
      const taxable = Number(order.grandTotal || 0) - tax;
      const half = Math.round((tax / 2) * 100) / 100;

      /** Writes one line of text; returns its height. */
      const t = (str, x, y, { font = 'R', size = 9, color = C.ink, width, align = 'left', lineGap = 1.5 } = {}) => {
        doc.font(font).fontSize(size).fillColor(color);
        const opts = { width, align, lineGap, lineBreak: Boolean(width) };
        doc.text(String(str ?? ''), x, y, opts);
        return width ? doc.heightOfString(String(str ?? ''), opts) : size + lineGap;
      };
      const label = (str, x, y, width) => t(str.toUpperCase(), x, y, { font: 'S', size: 7, color: C.muted, width, lineGap: 0 });
      const hr = (y, color = C.line, x1 = M, x2 = PAGE_W - M) => doc.save().moveTo(x1, y).lineTo(x2, y).lineWidth(0.75).strokeColor(color).stroke().restore();

      // ── Header band ──────────────────────────────────────────
      doc.rect(0, 0, PAGE_W, 104).fill(C.band);
      try {
        doc.image(Buffer.from(LOGO_GOLD_PNG, 'base64'), M, 30, { width: 168 });
      } catch {
        t(storeName, M, 36, { font: 'B', size: 24, color: C.white });
      }
      t('TAX INVOICE', PAGE_W - M - 220, 30, { font: 'B', size: 22, color: C.white, width: 220, align: 'right' });
      t('Original for recipient', PAGE_W - M - 220, 60, { size: 8.5, color: '#a1a1aa', width: 220, align: 'right' });

      // Payment status pill
      const paid = order.paymentStatus === 'Paid';
      const pill = paid ? 'PAID' : order.paymentStatus === 'Refunded' ? 'REFUNDED' : 'PAYMENT DUE';
      doc.font('B').fontSize(7.5);
      const pillW = doc.widthOfString(pill) + 18;
      doc.roundedRect(PAGE_W - M - pillW, 76, pillW, 16, 8).fill(paid ? C.greenSoft : C.redSoft);
      t(pill, PAGE_W - M - pillW, 80.5, { font: 'B', size: 7.5, color: paid ? C.green : C.red, width: pillW, align: 'center', lineGap: 0 });

      // ── Invoice facts strip ──────────────────────────────────
      let y = 122;
      doc.roundedRect(M, y, CONTENT_W, 46, 8).fill(C.soft);
      const facts = [
        ['Invoice no.', order.orderId],
        ['Invoice date', fmtDate(order.approvedAt || order.invoiceSentAt || Date.now())],
        ['Order date', fmtDate(order.createdAt)],
        ['Payment', PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod || '—'],
      ];
      const factW = CONTENT_W / facts.length;
      facts.forEach(([k, v], i) => {
        const fx = M + 14 + i * factW;
        label(k, fx, y + 10, factW - 20);
        t(v, fx, y + 22, { font: 'S', size: 10, width: factW - 20, lineGap: 0 });
        if (i) doc.save().moveTo(fx - 14, y + 10).lineTo(fx - 14, y + 36).lineWidth(0.75).strokeColor(C.line).stroke().restore();
      });

      // ── Seller / Bill to / Ship to ───────────────────────────
      y += 64;
      const colW = (CONTENT_W - 32) / 3;
      const cols = [
        ['Sold by', companyName, [address, `GSTIN: ${gstin}`, email, phone]],
        ['Bill to', order.customerName || a.fullName || 'Customer', [order.email, order.phone].filter(Boolean)],
        [
          'Ship to',
          a.fullName || order.customerName,
          [
            [a.addressLine1, a.addressLine2].filter(Boolean).join(', '),
            a.landmark ? `Landmark: ${a.landmark}` : '',
            `${a.city || ''}, ${a.state || ''} ${a.postalCode || ''}`.trim(),
            countryName(a.country || 'IN'),
            a.phone && a.phone !== order.phone ? a.phone : '',
          ].filter(Boolean),
        ],
      ];
      let blockH = 0;
      cols.forEach(([k, name, lines], i) => {
        const cx = M + i * (colW + 16);
        label(k, cx, y, colW);
        let cy = y + 13;
        cy += t(name, cx, cy, { font: 'B', size: 10, width: colW }) + 2;
        lines.forEach((ln) => {
          cy += t(ln, cx, cy, { size: 8.5, color: C.ink2, width: colW });
        });
        blockH = Math.max(blockH, cy - y);
      });
      y += blockH + 8;
      const pos = buyerCode ? `${GST_STATES[buyerCode]} (${buyerCode})` : a.state || '—';
      t(`Place of supply: ${pos}`, M, y, { size: 8, color: C.muted, width: CONTENT_W });
      y += 20;

      // ── Items table ──────────────────────────────────────────
      const X = { n: M + 10, desc: M + 34, qty: M + 300, rate: M + 340, amt: M + 425 };
      const W = { n: 20, desc: 258, qty: 36, rate: 80, amt: CONTENT_W - 435 };
      const tableHeader = () => {
        doc.roundedRect(M, y, CONTENT_W, 24, 6).fill(C.ink);
        const hy = y + 8;
        const h = { font: 'S', size: 7.5, color: C.white, lineGap: 0 };
        t('#', X.n, hy, { ...h, width: W.n });
        t('ITEM DESCRIPTION', X.desc, hy, { ...h, width: W.desc });
        t('QTY', X.qty, hy, { ...h, width: W.qty, align: 'center' });
        t('UNIT PRICE', X.rate, hy, { ...h, width: W.rate, align: 'right' });
        t('AMOUNT', X.amt, hy, { ...h, width: W.amt, align: 'right' });
        y += 30;
      };
      const newPage = () => {
        doc.addPage({ size: 'A4', margin: 0 });
        y = 40;
      };
      tableHeader();
      (order.items || []).forEach((it, i) => {
        const meta = [
          it.variant?.name ? `${it.variant.name}${it.variant?.size ? ` / ${it.variant.size}` : ''}` : '',
          it.SKU ? `SKU ${it.SKU}` : '',
        ]
          .filter(Boolean)
          .join('  ·  ');
        doc.font('S').fontSize(9);
        const nameH = doc.heightOfString(it.productName || 'Item', { width: W.desc, lineGap: 1.5 });
        doc.font('R').fontSize(7.5);
        const metaH = meta ? doc.heightOfString(meta, { width: W.desc, lineGap: 1.5 }) : 0;
        const rowH = Math.max(nameH + metaH + 14, 30);
        if (y + rowH > BOTTOM) {
          newPage();
          tableHeader();
        }
        if (i % 2 === 1) doc.rect(M, y - 4, CONTENT_W, rowH).fill('#fafafa');
        const ry = y + 3;
        t(String(i + 1), X.n, ry, { size: 8.5, color: C.muted, width: W.n });
        t(it.productName || 'Item', X.desc, ry, { font: 'S', size: 9, width: W.desc });
        if (meta) t(meta, X.desc, ry + nameH + 1, { size: 7.5, color: C.muted, width: W.desc });
        t(String(it.quantity || 1), X.qty, ry, { size: 9, width: W.qty, align: 'center' });
        t(money(it.unitPrice), X.rate, ry, { size: 9, color: C.ink2, width: W.rate, align: 'right' });
        t(money(it.totalPrice), X.amt, ry, { font: 'S', size: 9, width: W.amt, align: 'right' });
        y += rowH;
        hr(y - 4);
      });

      // ── Tax breakdown (left) + totals (right) ───────────────
      const SUMMARY_H = 300; // GST box / totals + amount in words + terms
      if (y + SUMMARY_H > BOTTOM) newPage();
      y += 14;
      const leftW = 270;
      const rightX = M + leftW + 24;
      const rightW = CONTENT_W - leftW - 24;

      // Tax table
      const taxRows = intraState
        ? [[`CGST @ ${taxRate / 2}%`, half], [`SGST @ ${taxRate / 2}%`, Math.round((tax - half) * 100) / 100]]
        : [[`IGST @ ${taxRate}%`, tax]];
      doc.roundedRect(M, y, leftW, 59 + (taxRows.length + 1) * 15, 8).lineWidth(0.75).strokeColor(C.line).stroke();
      label(`${taxLabel} summary (prices include ${taxLabel})`, M + 12, y + 10, leftW - 24);
      let ty = y + 26;
      [['Taxable value', taxable], ...taxRows].forEach(([k, v]) => {
        t(k, M + 12, ty, { size: 8.5, color: C.ink2, width: 150 });
        t(money(v), M + leftW - 132, ty, { size: 8.5, color: C.ink2, width: 120, align: 'right' });
        ty += 15;
      });
      hr(ty + 1, C.line, M + 12, M + leftW - 12);
      t(`Total ${taxLabel}`, M + 12, ty + 7, { font: 'S', size: 8.5, width: 150 });
      t(money(tax), M + leftW - 132, ty + 7, { font: 'S', size: 8.5, width: 120, align: 'right' });

      // Totals
      let sy = y + 2;
      const sumRow = (k, v, color = C.ink2) => {
        t(k, rightX, sy, { size: 9, color, width: rightW - 110 });
        t(v, rightX + rightW - 110, sy, { size: 9, color, width: 110, align: 'right' });
        sy += 17;
      };
      sumRow('Subtotal', money(order.subtotal));
      if (order.discount > 0) sumRow(`Discount${order.coupon?.code ? ` (${order.coupon.code})` : ''}`, `−${money(order.discount)}`, C.green);
      if (order.coinDiscount > 0) sumRow(`WILDTANE Coins (${order.coinsRedeemed || 0})`, `−${money(order.coinDiscount)}`, C.green);
      sumRow('Shipping', order.shipping > 0 ? money(order.shipping) : 'Free');
      sumRow(`${taxLabel} (included)`, money(tax), C.muted);
      sy += 4;
      doc.roundedRect(rightX, sy, rightW, 40, 8).fill(C.ink);
      t('Grand total', rightX + 14, sy + 14, { font: 'S', size: 10, color: '#d4d4d8', width: 100, lineGap: 0 });
      t(money(order.grandTotal), rightX + 100, sy + 11, { font: 'B', size: 15, color: C.white, width: rightW - 114, align: 'right', lineGap: 0 });

      y = Math.max(y + 59 + (taxRows.length + 1) * 15, sy + 40) + 18;
      label('Amount in words', M, y, CONTENT_W);
      t(amountInWords(order.grandTotal), M, y + 12, { font: 'S', size: 9, width: CONTENT_W });

      // ── Terms + signatory (end of document) ─────────────────
      y += 42;
      hr(y);
      y += 12;
      label('Terms', M, y, 300);
      [
        'Returns and exchanges are accepted within 7 days of delivery, as per our Return Policy.',
        'Products carry a manufacturer warranty against stitching and hardware defects.',
        'This is a computer-generated invoice and does not require a physical signature.',
      ].reduce((ly, ln) => ly + t(`•  ${ln}`, M, ly, { size: 7.5, color: C.muted, width: 320 }) + 2, y + 13);
      t(`For ${companyName}`, PAGE_W - M - 200, y, { font: 'S', size: 8.5, width: 200, align: 'right' });
      t('Digitally approved', PAGE_W - M - 200, y + 26, { size: 7.5, color: C.muted, width: 200, align: 'right' });
      t('Authorised Signatory', PAGE_W - M - 200, y + 38, { font: 'S', size: 8.5, width: 200, align: 'right' });

      // ── Page footer on every page ───────────────────────────
      const range = doc.bufferedPageRange();
      for (let p = range.start; p < range.start + range.count; p += 1) {
        doc.switchToPage(p);
        doc.rect(0, PAGE_H - 34, PAGE_W, 34).fill(C.soft);
        t(`Thank you for shopping with ${storeName}  ·  ${email}  ·  ${phone}`, M, PAGE_H - 22, { size: 7.5, color: C.muted, width: CONTENT_W - 80 });
        t(`Page ${p - range.start + 1} of ${range.count}`, PAGE_W - M - 80, PAGE_H - 22, { size: 7.5, color: C.muted, width: 80, align: 'right' });
      }

      doc.end();
    } catch (err) {
      console.error('[pdf-invoice] Generation error:', err);
      reject(err);
    }
  });
}
