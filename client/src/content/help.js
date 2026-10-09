/**
 * Help Centre (troubleshooting guide) and FAQ: WILDTANE Private Limited's text, supplied 8 Oct 2026
 * (the OTP entries are left out: the store has no OTP sign-in).
 * Edit here and the /help and /faq pages update. {{supportEmail}} is filled from Admin → Settings.
 */

export const HELP_INTRO =
  'This Help Centre is designed to assist customers with common issues related to payments, delivery, returns, refunds and account access while shopping with WILDTANE.';

// Troubleshooting guide. Each item: a question and blocks of { label?, list?, p? }.
export const TROUBLESHOOTING = [
  {
    id: 'payments',
    title: 'Payment related issues',
    icon: 'payments',
    items: [
      {
        q: 'Amount debited but order not placed',
        blocks: [
          { label: 'Possible reasons', list: ['Payment gateway timeout', 'Slow internet connection', 'Bank server delay'] },
          {
            label: 'Solution',
            list: [
              'Wait 10–30 minutes for auto confirmation.',
              'Check your email and the "My Orders" section.',
              'If the order is not created, the refund will auto-process within 5–7 working days.',
              'If unresolved, email {{supportEmail}} with the transaction ID and a screenshot.',
            ],
          },
        ],
      },
      {
        q: 'Payment failed but money deducted',
        blocks: [{ list: ['Usually auto-reversed within 3–5 working days.', 'If not reversed in 7 days, contact your bank and then share the details with us.'] }],
      },
      {
        q: 'Payment gateway not working',
        blocks: [{ label: 'Try', list: ['Refreshing the page', 'Using another browser', 'Clearing the browser cache', 'Switching payment method (UPI / Card)', 'Trying again after 15–20 minutes'] }],
      },
    ],
  },
  {
    id: 'delivery',
    title: 'Delivery issues',
    icon: 'local_shipping',
    items: [
      {
        q: 'Address showing non-deliverable',
        blocks: [
          { label: 'Reasons', list: ['Remote location', 'Courier not servicing the area', 'Incorrect PIN code'] },
          { label: 'Solution', list: ['Verify the PIN code', 'Provide an alternate address', 'Contact support for a serviceability check'] },
        ],
      },
      {
        q: 'Order delayed',
        blocks: [{ p: ['Delivery usually takes 3–7 working days. Delays may occur due to courier issues, weather or high demand. Track your order using the tracking link provided.'] }],
      },
      {
        q: 'Order marked delivered but not received',
        blocks: [{ list: ['Check with neighbours / security.', 'Contact the courier within 24 hours.', 'Inform WILDTANE within 24 hours for investigation.'] }],
      },
    ],
  },
  {
    id: 'product',
    title: 'Product issues',
    icon: 'inventory_2',
    items: [
      {
        q: 'Damaged product received',
        blocks: [{ list: ['Record an unboxing video.', 'Take clear photos.', 'Email {{supportEmail}} within 24 hours with your Order ID.'] }],
      },
      {
        q: 'Wrong product delivered',
        blocks: [{ list: ['Share product images and your Order ID.', 'A replacement will be arranged after verification.'] }],
      },
      {
        q: 'Minor colour variation',
        blocks: [{ p: ['Due to lighting or screen resolution, slight variation may occur and is not considered a defect.'] }],
      },
    ],
  },
  {
    id: 'returns',
    title: 'Return & refund issues',
    icon: 'currency_exchange',
    items: [
      {
        q: 'Refund not received',
        blocks: [
          { label: 'Refund timeline', list: ['Approval: 3–5 working days after inspection', 'Credit: 7–10 working days to the original payment method'] },
          { p: ['If not credited, check with your bank and share the refund reference number with us.'] },
        ],
      },
      {
        q: 'Exchange not approved',
        blocks: [{ label: 'Reasons may include', list: ['Product used', 'Tags removed', 'Return window closed', 'Policy ineligibility'] }],
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & login issues',
    icon: 'account_circle',
    items: [
      {
        q: 'Unable to log in',
        blocks: [{ list: ['Reset your password (use "Forgot password?" on the sign-in page).', 'Check your spam folder for the reset email.', 'Clear your browser cache.', 'Try a different browser.'] }],
      },
    ],
  },
];

export const SUPPORT = {
  responseTime: '24–48 working hours',
  share: ['Order ID', 'Registered email / mobile number', 'A clear description of the issue'],
};

export const TIPS = [
  ['videocam', 'Always record an unboxing video.'],
  ['home_pin', 'Double-check your address before payment.'],
  ['wifi', 'Use a stable internet connection during payment.'],
  ['screenshot', 'Save a payment screenshot for reference.'],
];

export const HELP_FOOTNOTE = 'WILDTANE reserves the right to update this guide as necessary.';

// FAQ. `live: 'payments'` adds what checkout offers right now (from the store settings).
export const FAQ = [
  {
    id: 'orders',
    title: 'Orders & purchases',
    icon: 'shopping_bag',
    items: [
      { q: 'How can I place an order?', a: 'Browse products on the WILDTANE website, select the product you want, add it to your cart, proceed to checkout, enter your shipping details, choose a payment method and confirm your order.' },
      { q: 'Can I cancel my order?', a: 'Orders can be cancelled within 24 hours of placing the order if they have not been shipped. Once dispatched, cancellation may not be possible.' },
    ],
  },
  {
    id: 'payments',
    title: 'Payments',
    icon: 'payments',
    items: [
      { q: 'What payment methods are accepted?', a: 'WILDTANE accepts UPI, debit cards, credit cards, net banking, digital wallets and Cash on Delivery where available.', live: 'payments' },
      { q: 'Payment deducted but order not confirmed?', a: 'In most cases the order confirmation happens within 10–30 minutes. If the order is not confirmed, the amount will automatically be refunded within 5–7 working days.' },
    ],
  },
  {
    id: 'shipping',
    title: 'Shipping & delivery',
    icon: 'local_shipping',
    items: [
      { q: 'How long does delivery take?', a: 'Metro cities: 3–5 working days. Other locations: 5–7 working days, depending on courier service availability.' },
      { q: 'Why is my address showing non-deliverable?', a: 'This may happen if the courier partner does not service the location, the PIN code is incorrect, or the location is remote.' },
    ],
  },
  {
    id: 'products',
    title: 'Product information',
    icon: 'style',
    items: [
      { q: 'What products does WILDTANE sell?', a: 'WILDTANE offers handbags, tote bags, clutches, wallets, laptop bags, travel bags, school bags, belts and fashion accessories.' },
      { q: 'Why is the product colour slightly different from the photos?', a: 'Minor colour variations may occur due to lighting conditions and differences in screen resolution.' },
    ],
  },
  {
    id: 'returns',
    title: 'Returns & exchanges',
    icon: 'assignment_return',
    items: [
      { q: 'What is the return policy?', a: 'Returns are accepted within 7 days of delivery only for damaged products, wrong items, manufacturing defects, or products significantly different from their description.' },
      { q: 'Can I exchange a product?', a: 'Yes. One exchange per order is allowed within 7 days of delivery, subject to product availability.' },
    ],
  },
  {
    id: 'refunds',
    title: 'Refunds',
    icon: 'currency_rupee',
    items: [
      { q: 'How long do refunds take?', a: 'Refund inspection takes 3–5 working days and the refund is credited within 7–10 working days to the original payment method.' },
      { q: 'How are COD refunds processed?', a: 'For Cash on Delivery orders, refunds are issued via bank transfer or UPI.' },
    ],
  },
  {
    id: 'account',
    title: 'Account & login',
    icon: 'account_circle',
    items: [
      { q: 'I cannot log into my account. What should I do?', a: 'Try resetting your password, clearing your browser cache, or logging in from another browser.' },
    ],
  },
  {
    id: 'support',
    title: 'Customer support',
    icon: 'support_agent',
    items: [{ q: 'How can I contact support?', a: 'For assistance, contact WILDTANE support by email at {{supportEmail}}. Response time is usually within 24–48 working hours.' }],
  },
  {
    id: 'privacy',
    title: 'Privacy & security',
    icon: 'shield_person',
    items: [{ q: 'Is my personal data safe?', a: 'WILDTANE follows applicable Indian laws, including the Consumer Protection Act, 2019 and the Digital Personal Data Protection Act, 2023, to ensure secure handling of customer data.' }],
  },
  {
    id: 'tips',
    title: 'Shopping tips',
    icon: 'tips_and_updates',
    items: [{ q: 'Tips for a smooth shopping experience', a: 'Always record an unboxing video when receiving your order, verify your address before payment, and keep payment screenshots for reference.' }],
  },
];
