import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/format';
import { Icon } from '../components/ui';
import { PageHeader } from './kit';

/** One-click shortcuts for the jobs admins do most. Also shown on the dashboard. */
export const QUICK_ACTIONS = [
  ['/admin/products/new', 'add_box', 'Add a product', 'Photo → AI fills it'],
  ['/admin/quick-edit', 'bolt', 'Edit prices & photos', 'All products on one page'],
  ['/admin/inventory', 'warehouse', 'Update stock', 'Per colour'],
  ['/admin/quick-edit?tab=promo', 'confirmation_number', 'Promo codes', 'Discounts at checkout'],
  ['/admin/orders', 'receipt_long', 'Orders', 'Pack & ship'],
  ['/admin/products', 'inventory_2', 'All products', 'Open one to edit it'],
  ['/admin/categories', 'category', 'Categories', 'Menus & subcategories'],
  ['/admin/banners', 'view_carousel', 'Offer banners', 'Slides on /offers'],
  ['/admin/giftcards', 'card_giftcard', 'Gift cards', 'Issue & check balance'],
  ['/admin/returns', 'assignment_return', 'Returns', 'Pickups & refunds'],
  ['/admin/payments', 'payments', 'Payments', 'Who paid · refunds to send'],
];

export function QuickActions({ className }) {
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2', className)}>
      {QUICK_ACTIONS.map(([to, icon, label, note]) => (
        <Link key={to} to={to} className="card surface-card border border-outline-variant/60 p-3 flex items-center gap-3 hover:shadow-card transition-all">
          <span className="w-9 h-9 shrink-0 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center"><Icon name={icon} className="text-[20px]" /></span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold truncate">{label}</span>
            <span className="block text-[11px] text-outline truncate">{note}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

// [id, icon, question, where (path through the admin), steps, [link, button label]]
const TASKS = [
  [
    'add', 'add_box', 'Add a new product',
    'The big “+ Add a product” button at the top of the left menu  ·  or “+ Add product” at the top right  ·  or the “+ Add new product” tile in the store grid',
    [
      'Drop in a photo (the first one is the cover). With the free AI on, it fills the name, category, price, description, colours and FAQs by itself. Or press “Write with AI”.',
      'No AI? Type the name and press “Fill everything for me” (or just Next). Details are suggested from similar products.',
      'Want better text? Press ChatGPT or Gemini under “Research with AI”. Your question is ready in a new tab. Copy the answer, close that tab, press “Paste answer”.',
      'Check each step and change anything. Tap the live preview card (or the Preview button) to see the full product page.',
      'On “Preview & publish” see the card next to similar products and the product page. Nothing is live yet.',
      'Press “Publish to store” to make it live, or “Save hidden” to keep it off the store for now. Your draft is kept if you leave mid-way.',
    ],
    ['/admin/products/new', 'Add a product'],
  ],
  [
    'more-categories', 'category', 'Show one product in several categories',
    'Add product → step 2 “Also show it in”  ·  or open the product → Organisation → Extra categories',
    [
      'Search for the category (e.g. “school”, “travel organizers”) and tap it. Add as many as fit.',
      'It is still one product: stock, price and reviews are shared, nothing is copied.',
      'Empty categories stay hidden in the store until a product is in them.',
    ],
    ['/admin/products', 'Open products'],
  ],
  [
    'offer-banners', 'view_carousel', 'Change the sliding banners on the Offers page',
    'Sidebar → Content → Banners → New banner → placement “Offers page slider”',
    [
      'Write a short title and one line of text, add a photo if you like, and where the button goes (e.g. /offers?sort=discount).',
      'Add 4–5 of them. They slide by themselves at the top of the Offers page.',
      'Set Starts / Ends to run a sale for a few days — it disappears by itself afterwards.',
    ],
    ['/admin/banners', 'Open Banners'],
  ],
  [
    'spin', 'casino', 'Daily Spin & Win',
    'Sidebar → Content → Settings → Spin wheel',
    [
      'Signed-in shoppers can spin once a day. Each prize is a personal code that works on one order until midnight (IST).',
      'Change the prizes (₹ off, % off or free shipping), the text on the wheel, colours, minimum order and how often each prize comes up. Add up to 8 prizes; the preview shows the wheel shoppers will see.',
      'The wheel opens by itself once a day, hides after they play, and is always in their account menu. Switch it off here any time.',
    ],
    ['/admin/settings', 'Open Settings'],
  ],
  [
    'homepage', 'home', 'Change the homepage & footer',
    'Sidebar → Content → Settings → Homepage  ·  Footer',
    [
      'Homepage: switch sections on or off and move them up or down — separately for Desktop and Phone.',
      'Open a section to edit its headline, text, pictures, buttons, cards and product rows (pick featured, new, best sellers or any category).',
      'Footer: edit the link columns and add your Instagram / Facebook / LinkedIn links. Address, GSTIN, phone and email come from the Store tab.',
      'Keep every claim true — numbers, ratings, awards and press quotes must be real. “Use built-in” puts the original content back.',
    ],
    ['/admin/settings', 'Open Settings'],
  ],
  [
    'shopmenu', 'grid_view', 'Change the Shop menu',
    'Sidebar → Content → Settings → Shop menu',
    [
      'Edit the departments, budget tiles, trending chips and promise boxes in the full-screen menu that opens from “Shop”. Reorder with the arrows, delete with the bin.',
      'Pick one real product as “Our pick” — its real price and rating are shown. Categories in the menu follow Catalogue → Categories by themselves.',
      'Press “Use built-in” to go back to the original content.',
    ],
    ['/admin/settings', 'Open Settings'],
  ],
  [
    'approve-return', 'gavel', 'Approve or reject a return',
    'Sidebar → Sales → Returns → open a request marked “Needs your decision”',
    [
      'Until you decide, the customer sees “Return in process”. Press Approve or Reject (add a note if you like) — they get an email either way.',
      'Rejected: the customer sees “This item cannot be returned or exchanged” and can’t request it again.',
      'Approved return: the customer is asked on a refund page how they want the money — UPI, bank account, original payment or wallet (choose which options they get in Settings → Returns & refunds). Their answer appears under “Where to send the refund”.',
      'Book the pickup, then mark it Completed after inspection. A cash-on-delivery return can’t be completed until the customer (or you, by phone) gives UPI / bank details.',
      'Customers can cancel a request themselves until the pickup is booked.',
    ],
    ['/admin/returns', 'Open Returns'],
  ],
  [
    'giftcards', 'card_giftcard', 'Sell or give a gift card',
    'Sidebar → Sales → Gift cards → Issue gift card',
    [
      'Type the value and, if you want, an expiry date and a PIN.',
      'Copy the code (and PIN — it is shown only once) and send it to the customer.',
      'Open a card any time to see its balance and every order it paid for. Switch it off if it is lost.',
    ],
    ['/admin/giftcards', 'Open Gift cards'],
  ],
  [
    'refund-failed', 'replay', 'A cancelled order’s refund failed',
    'Orders → open the order → “Cancellation & refund” panel',
    [
      'The panel shows each part of the refund (online payment, gift card, wallet) and the reason it failed.',
      'Press “Retry refund”. The store checks Razorpay first, so it never refunds twice.',
    ],
    ['/admin/orders', 'Open Orders'],
  ],
  [
    'payments', 'payments', 'See who paid and send refunds',
    'Sidebar → Sales → Payments',
    [
      'The top boxes show money collected, refunded, cash-on-delivery still to collect, and refunds waiting for you.',
      '“By customer” lists how much each customer has paid in total.',
      '“Refunds to send” shows the customer’s UPI ID or bank account with copy buttons. Send the money from your bank / UPI app, then press “I have sent it” and paste the UTR.',
      'Cancelled paid orders are refunded automatically. To approve each one yourself, turn off Settings → Payments → “Refund cancelled orders automatically”; they then wait here with a “Refund now” button.',
    ],
    ['/admin/payments', 'Open Payments'],
  ],
  [
    'create-return', 'assignment_return', 'Create a return for a customer',
    'Sidebar → Sales → Returns → Create return / exchange',
    [
      'Type the order ID and press Find order. Pick the items and how many.',
      'Choose return or exchange, the reason, and where the refund goes (UPI / bank / original payment / wallet) — or “Ask the customer” to let them choose on their refund page.',
      'Past 7 days? Switch on “Make an exception” and write why — it is kept in the history.',
    ],
    ['/admin/returns', 'Open Returns'],
  ],
  [
    'wallet', 'account_balance_wallet', 'Give a customer wallet credit',
    'Customers → open the customer → WILDTANE Wallet',
    [
      'Type the amount in ₹ and a short reason, then press Credit (or Debit to correct a mistake).',
      'The customer sees it in My account → Wallet and can use it at checkout. Every change is logged with your name.',
    ],
    ['/admin/customers', 'Open Customers'],
  ],
  [
    'price', 'sell', 'Change a price (rate) or put something on sale',
    'Store → tap “Edit” on the product  ·  or Sidebar → Catalogue → Quick edit',
    [
      'Type the new regular price.',
      'For a discount, type a sale price or tap 10% / 20% / 30% off. Leave it empty for no sale.',
      'Press Save. The store shows the new price, the old price crossed out and “% off”.',
      'To discount many products at once: Quick edit → tick them → “% off sale”.',
    ],
    ['/admin/quick-edit', 'Open Quick edit'],
  ],
  [
    'photos', 'photo_library', 'Change photos, name or the label on the photo',
    'Store → “Edit” on the product → steps 1 & 2  ·  or Products → click the product',
    [
      'Drag new photos in; use the arrows to reorder. The first one is the cover.',
      'The badge is the small tag on the photo (e.g. “Bestseller”, “New”). Leave empty for none.',
      'Press Save.',
    ],
    ['/admin/products', 'Open Products'],
  ],
  [
    'stock', 'warehouse', 'Update stock',
    'Store → “Edit” on the product → step 4  ·  or Sidebar → Catalogue → Inventory',
    [
      'Each colour has its own count. Use + / − or type the number.',
      '0 shows “Out of stock” and shoppers can’t add it to the bag.',
      'Stock goes down automatically with every order; Inventory lists low and out-of-stock items first.',
    ],
    ['/admin/inventory', 'Open Inventory'],
  ],
  [
    'hide', 'visibility_off', 'Hide or remove a product',
    'Store → “Edit” → step 5 “Where it shows”  ·  Products → bin icon to delete',
    [
      'Switch off “Visible” to hide it from shoppers without losing anything. Switch it back on any time.',
      'Delete only when it is gone for good — photos and reviews are removed too (past orders keep their copy).',
    ],
    ['/admin/products?visibility=hidden', 'See hidden products'],
  ],
  [
    'labels', 'star', 'Feature a product or mark it Bestseller / New',
    'Store → “Edit” → step 5  ·  Products → click the product → “Visibility & labels”',
    [
      'Featured products come first when shoppers sort by Relevance (the default).',
      'Bestseller and New arrival put the product in those lists in the menu.',
    ],
    ['/admin/quick-edit?show=featured', 'See featured'],
  ],
  [
    'categories', 'category', 'Add or rename a category',
    'Sidebar → Catalogue → Categories',
    [
      'Main categories show as round icons at the top of the store; give each a photo.',
      'Subcategories sit inside a main category. Move a product with “Category” in its editor.',
    ],
    ['/admin/categories', 'Open Categories'],
  ],
  [
    'reviews', 'reviews', 'Ratings & reviews',
    'Sidebar → Sales → Reviews',
    [
      'Star ratings on products are worked out from real customer reviews.',
      'Approve, hide or delete a review. Hidden reviews don’t count toward the rating.',
    ],
    ['/admin/reviews', 'Open Reviews'],
  ],
  [
    'coins', 'savings', 'Loyalty coins (earn & spend)',
    'Sidebar → Content → Settings → Loyalty coins  ·  one customer: Customers → Full profile',
    [
      'Shoppers earn 5 coins for every ₹100 they pay for items (you can change the rate). Coins are added as soon as the order is placed.',
      'At checkout they switch on “WILDTANE Coins” to take them off the order — 1 coin = ₹1, up to 50% of the item total (both adjustable).',
      'If an order is cancelled or returned, coins used on it come back and coins it earned are removed — automatically.',
      'To reward or correct one customer, open their Full profile and use “Give coins” / “Take back” with a reason.',
    ],
    ['/admin/settings', 'Open Settings'],
  ],  [
    'promo', 'confirmation_number', 'Create a discount code',
    'Sidebar → Catalogue → Quick edit → “Promo codes” tab  ·  or Sales → Coupons',
    [
      'Press “New promo code”, choose % off or ₹ off, and an optional minimum order or end date.',
      'Shoppers type it at checkout. To advertise it on the home page, add a Banner with placement “promo” and the same code.',
    ],
    ['/admin/quick-edit?tab=promo', 'Open Promo codes'],
  ],
  [
    'customers', 'groups', 'See everything a customer sent or did',
    'Sidebar → Sales → Customers (Cards view)',
    [
      'Each customer has one box: phone, address, orders, money spent, wishlist, what is in their bag, reviews and their messages.',
      'Boxes with new messages have a red outline and come first. Tap “New messages” to see only those.',
      'People who wrote without an account appear under “Guests who wrote to you”.',
      'Use Email, Call or WhatsApp on a box to reply. “Full profile” opens all their orders and addresses.',
      'The page refreshes itself every minute.',
    ],
    ['/admin/customers', 'Open Customers'],
  ],
  [
    'orders', 'receipt_long', 'Handle a new order',
    'Sidebar → Sales → Orders (the number shows new orders)',
    [
      'Open the order and move the status forward as you go (Processing → Packed → Shipped → Delivered).',
      'Add the tracking number when you ship; the customer can see each step in their account.',
    ],
    ['/admin/orders', 'Open Orders'],
  ],
  [
    'settings', 'settings', 'Shipping fees, tax and store details',
    'Sidebar → Content → Settings',
    ['Change shipping methods and prices, the free-shipping amount, tax label and contact details.'],
    ['/admin/settings', 'Open Settings'],
  ],
];

function Dot({ n, className }) {
  return <span className={cn('w-4 h-4 shrink-0 rounded-full bg-secondary text-on-secondary text-[10px] font-bold inline-flex items-center justify-center ring-2 ring-surface-container-lowest', className)}>{n}</span>;
}

/** Picture of a product card with numbers showing which setting controls each part. */
function CardMap() {
  const legend = [
    ['First photo', 'Edit → Photos'],
    ['Badge', 'Edit → Name & labels'],
    ['Product name', 'Edit → Name & labels'],
    ['Star rating', 'From customer reviews (Sales → Reviews)'],
    ['Colours', 'Full editor → Variants & stock'],
    ['Price, old price, % off', 'Edit → Price'],
    ['“Out of stock” strip', 'Edit → Stock (when every colour is 0)'],
  ];
  return (
    <section className="card p-4 md:p-5 flex flex-col md:flex-row gap-6 items-start mb-6">
      <div className="relative w-52 shrink-0 mx-auto md:mx-0 rounded-xl overflow-hidden border border-surface-container-high bg-surface-container-lowest">
        <div className="relative aspect-square bg-surface-container flex items-center justify-center text-outline">
          <Icon name="backpack" className="text-[64px]" />
          <span className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-container-lowest text-[10px] font-semibold">Bestseller <Dot n={2} /></span>
          <Dot n={1} className="absolute top-2 right-2" />
          <span className="absolute bottom-0 inset-x-0 py-1 bg-on-surface/70 text-surface-container-lowest text-[11px] font-semibold flex items-center justify-center gap-1.5">Out of stock <Dot n={7} /></span>
        </div>
        <div className="p-2.5 flex flex-col gap-1">
          <span className="flex items-start gap-1 text-[13px] leading-[18px]"><span className="flex-1">The Apex Commuter 24L</span><Dot n={3} /></span>
          <span className="flex items-center gap-1 text-[11px] text-outline">
            <span className="px-1 rounded bg-emerald-700 text-white font-bold">4.8★</span>(12) <Dot n={4} />
            <span className="ml-auto">3 colours</span> <Dot n={5} />
          </span>
          <span className="flex items-baseline gap-1 text-[15px] font-bold">
            ₹15,999 <span className="text-[11px] font-normal text-outline line-through">₹18,999</span> <span className="text-[11px] text-emerald-700">16% off</span>
            <Dot n={6} className="ml-auto self-center" />
          </span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-[15px] font-semibold mb-1">What controls each part of a product card</h2>
        <p className="text-[13px] text-on-surface-variant mb-3">
          “Edit” means: go to <b>Admin → Products</b>, open the product and change it there. Everything saves live.
        </p>
        <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
          {legend.map(([part, where], i) => (
            <li key={part} className="flex gap-2 text-[13px]">
              <span className="w-5 h-5 shrink-0 rounded-full bg-secondary text-on-secondary text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
              <span><b className="font-semibold">{part}</b> — <span className="text-on-surface-variant">{where}</span></span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default function Guide() {
  const [open, setOpen] = useState('add');
  return (
    <>
      <PageHeader title="Start here" subtitle="Where to find everything, step by step. Tap a task to see how; the button takes you straight there." />
      <QuickActions className="mb-6" />
      <CardMap />
      <div className="flex flex-col gap-2">
        {TASKS.map(([id, icon, title, where, steps, [to, cta]]) => {
          const isOpen = open === id;
          return (
            <section key={id} className={cn('card overflow-hidden transition-shadow', isOpen && 'ring-2 ring-secondary/40')}>
              <button type="button" onClick={() => setOpen(isOpen ? null : id)} aria-expanded={isOpen} className="w-full flex items-center gap-3 p-3 md:p-4 text-left">
                <span className="w-9 h-9 shrink-0 rounded-lg bg-surface-container flex items-center justify-center text-secondary"><Icon name={icon} className="text-[20px]" /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-semibold">{title}</span>
                  <span className="block text-[12px] text-outline truncate">{where}</span>
                </span>
                <Icon name="expand_more" className={cn('text-outline transition-transform', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 md:pl-16 flex flex-col gap-3">
                  <p className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary/10 text-[12px]">
                    <Icon name="near_me" className="text-[16px] text-secondary shrink-0" />
                    <span><b>Where:</b> {where}</span>
                  </p>
                  <ol className="flex flex-col gap-2">
                    {steps.map((s, i) => (
                      <li key={s} className="flex gap-2.5 text-[13px]">
                        <span className="w-5 h-5 shrink-0 rounded-full bg-on-surface text-surface-container-lowest text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                        <span className="pt-px">{s}</span>
                      </li>
                    ))}
                  </ol>
                  <Link to={to} className="btn-primary btn-sm w-fit">{cta} <Icon name="arrow_forward" className="text-[16px]" /></Link>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
