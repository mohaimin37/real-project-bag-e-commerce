/**
 * Store policies: edit the text here and every policy page updates.
 *
 * - Return/Refund/Exchange, Terms and Privacy follow WILDTANE Private Limited's Master Legal Policy Document
 *   and its Return, Refund & Exchange Policy (both supplied 7 Oct 2026; where they differ, the Master wins).
 *   The return page also covers refunds and cancellations, so /refund-policy and /cancellation-policy jump to its sections.
 * - Anything in [SQUARE BRACKETS] is highlighted on the page as a placeholder until replaced.
 * - {{tokens}} are filled from Admin → Settings automatically:
 *     {{storeName}} {{supportEmail}} {{supportPhone}} {{addressSuffix}} {{writeToUs}} {{freeShippingThreshold}} {{taxLabel}}
 *   The address phrases disappear while Admin → Settings → Business address is empty.
 * - Each section has a heading and any of: `p` (paragraphs), `list` (bullet points).
 *   A section's link anchor is its heading in lower case with dashes ("Refund Policy" → #refund-policy).
 */

export const COMPANY = 'WILDTANE PRIVATE LIMITED';
export const POLICY_LAST_UPDATED = '7 October 2026';
export const EFFECTIVE_DATE = '7 October 2026';
export const REGISTERED_ADDRESS = 'Paharganj , New Delhi , 110055';
export const GSTIN = '07AAECW3767F1Z4';
export const PHONE = '8920550465';

const LAWS = 'the Consumer Protection Act, 2019, the Consumer Protection (E-Commerce) Rules, 2020, the Information Technology Act, 2000, the Digital Personal Data Protection Act, 2023 and applicable RBI and payment gateway regulations';
const AMEND = 'WILDTANE reserves the right to amend these policies without prior notice. Continued use of our services constitutes acceptance of the updated terms.';

export const POLICIES = [
  {
    slug: 'return-policy',
    title: 'Return, Refund & Exchange Policy',
    short: 'Returns, Refunds & Exchange',
    icon: 'assignment_return',
    effective: EFFECTIVE_DATE,
    description: 'When WILDTANE accepts returns, exchanges and refunds, the 7-day return window, refund timelines, order cancellation and how to raise a return.',
    sections: [
      {
        heading: 'Introduction',
        p: [
          `${COMPANY} manufactures and sells ladies' bags, purses, clutches, wallets, belts, school bags, travel bags, laptop bags and other fashion accessories through its website, social media platforms and e-commerce marketplaces.`,
          'This policy explains the terms and conditions under which products may be returned, exchanged or refunded. It applies to purchases made through our website, social media platforms, direct sales channels and third-party marketplaces including Amazon and Flipkart, and is drafted in compliance with ' + LAWS + '.',
        ],
      },
      {
        heading: 'Return Eligibility',
        p: ['Returns are accepted within 7 days from delivery only in case of:'],
        list: [
          'Manufacturing defect',
          'Damaged product upon delivery',
          'Wrong product shipped (including an incorrect size)',
          'Significant deviation from the product description',
        ],
      },
      {
        heading: 'Returns Not Accepted',
        p: ['Returns are NOT accepted for:'],
        list: [
          'Used products',
          'Damage due to misuse or negligence',
          'Minor colour variation due to screen settings',
          'Products without original packaging or tags',
          'Customised, clearance or bulk corporate orders',
        ],
      },
      {
        heading: 'Return Window',
        p: ['A return request must be raised within 7 days from the date of delivery. Requests after 7 days will not be accepted.'],
      },
      {
        heading: 'Product Condition Requirement',
        p: [
          'Returned products must be unused, unwashed and in original condition, with tags and packaging intact. An invoice or proof of purchase is mandatory.',
        ],
      },
      {
        heading: 'Exchange Policy',
        list: [
          'Only one exchange is allowed per order, within 7 days of delivery, subject to availability.',
          'Any price difference is payable by the customer or refundable to the customer accordingly.',
        ],
      },
      {
        heading: 'Refund Policy',
        p: ['Full refund applies when:'],
        list: [
          'The product is defective',
          'A wrong product was delivered',
          'The order is cancelled before dispatch',
        ],
      },
      {
        heading: 'Partial Refund',
        p: ['A partial refund applies when the return is for a personal reason; shipping cost may be deducted. Shipping charges are non-refundable unless the return is due to the company\'s fault.'],
      },
      {
        heading: 'No Refund',
        p: ['No refund applies when:'],
        list: [
          'The product has been used or damaged by the customer',
          'The return request is made after the allowed period',
        ],
      },
      {
        heading: 'Refund Timeline',
        list: [
          'Inspection: within 3–5 working days of receiving the returned product.',
          'Refund: within 7–10 working days to the original payment method.',
          'Cash on delivery (COD) orders: refunded by bank transfer or UPI.',
          'Shipping charges are non-refundable unless the return is due to the company\'s fault.',
        ],
      },
      {
        heading: 'Shipping Responsibility',
        list: [
          'If the error is from WILDTANE, the return shipping cost is borne by the company.',
          "If the return is the customer's choice, the return shipping cost is borne by the customer.",
        ],
      },
      {
        heading: 'Order Cancellation',
        list: [
          'Orders can be cancelled within 24 hours of placing the order, from My account → Orders or by emailing {{supportEmail}}.',
          'Once an order has shipped, cancellation is not allowed.',
          'Prepaid orders cancelled before dispatch receive a full refund to the original payment method, as per the refund timeline above.',
        ],
      },
      {
        heading: 'Damaged Package Claim',
        p: ['For damage claims, the customer must record an unboxing video and inform us within 24 hours of delivery.'],
      },
      {
        heading: 'Marketplace Orders',
        list: [
          'Orders placed via Amazon, Flipkart or other marketplaces are additionally governed by the respective platform policies.',
          'If WILDTANE policy and marketplace rules conflict, the marketplace rules prevail for that transaction.',
          'Chargebacks initiated via a marketplace are handled through that marketplace\'s dispute resolution system.',
        ],
      },
      {
        heading: 'Fraud Prevention',
        p: ['WILDTANE reserves the right to reject fraudulent return claims and to block accounts in case of misuse.'],
      },
      {
        heading: 'How to Initiate a Return',
        list: [
          'Email: {{supportEmail}}',
          'Provide your Order ID, product images and the reason for return.',
          'Response time: within 48 hours.',
        ],
        p: [AMEND],
      },
    ],
  },
  {
    slug: 'shipping-policy',
    title: 'Shipping & Delivery Policy',
    short: 'Shipping & Delivery',
    icon: 'local_shipping',
    description: 'Where {{storeName}} delivers, how long orders take to process and arrive, shipping charges, tracking, and what to do about delays, address errors or damaged parcels.',
    sections: [
      {
        heading: 'Shipping availability',
        p: ['We currently deliver to all serviceable PIN codes across India, and to the international destinations offered at checkout. If your address is not serviceable, you will see a message at checkout before you pay.'],
      },
      {
        heading: 'Order processing time',
        p: [
          'Orders are usually packed and handed to our courier partner within 1–2 business days of being placed. Orders placed on weekends or public holidays are processed on the next business day.',
        ],
      },
      {
        heading: 'Estimated delivery time',
        p: [
          'Delivery usually takes 3–5 working days to metro cities and 5–7 working days to other locations, depending on courier service availability. The options for your order are shown at checkout. {{shippingOptions}}',
          'Delivery times are estimates from the courier and are not guaranteed. Remote locations may take longer.',
        ],
      },
      {
        heading: 'Shipping charges',
        p: ['Shipping charges, if any, are shown at checkout before you place your order. {{freeShippingLine}}'],
      },
      {
        heading: 'Order tracking',
        p: [
          'Once your order ships, the courier name and tracking number appear in My account → Orders, and we send an update to your email. You can follow the order status there at any time.',
        ],
      },
      {
        heading: 'Delayed deliveries',
        p: [
          'Weather, strikes, festivals, courier capacity or other events outside our control can occasionally delay deliveries. If your order hasn\'t arrived 3 business days after its estimated date, contact us and we will follow up with the courier.',
        ],
      },
      {
        heading: 'Incorrect or incomplete address',
        p: [
          'Please check your delivery address and phone number before placing an order. If you notice a mistake, contact us immediately: we can update it only before the order ships.',
          'If a parcel is returned to us because of an incorrect address or repeated failed delivery attempts, we will contact you to arrange re-delivery (re-shipping charges may apply).',
        ],
      },
      {
        heading: 'Damaged shipments',
        list: [
          'If the outer package looks damaged or tampered with, you may refuse the delivery or note it with the courier.',
          'Record an unboxing video and report the damage to {{supportEmail}} within 24 hours of delivery.',
          'Eligible damaged products are handled as described in our Return, Refund & Exchange Policy.',
        ],
      },
    ],
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    short: 'Privacy Policy',
    icon: 'shield_person',
    effective: EFFECTIVE_DATE,
    description: 'How WILDTANE collects, uses, shares and protects your personal data under the Digital Personal Data Protection Act, 2023, and the rights you have.',
    sections: [
      {
        heading: 'Who we are',
        p: [
          `This website is operated by ${COMPANY} ("WILDTANE", "we", "us"){{addressSuffix}}. This policy explains how we handle your personal data across our website, social media platforms, direct sales channels and marketplaces. It is drafted in compliance with the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000.`,
        ],
      },
      {
        heading: 'Data collection',
        p: ['We collect personal data including your name, contact details, email, shipping address, transaction details and device information necessary for service fulfilment. On this website that includes:'],
        list: [
          'Account information: name, email address, phone number, country, nationality, password (stored only as a secure hash), profile photo if you add one, and saved addresses.',
          'Order information: products ordered, delivery address, order history, returns, exchanges and cancellations, and messages you send us.',
          'Transaction details: the payment method chosen and payment status. Card and UPI details are entered with our payment partners and are never stored on our servers.',
          'Device and usage information: pages viewed, device type and approximate traffic source, counted anonymously (see Cookies and analytics).',
        ],
      },
      {
        heading: 'Lawful purpose and consent',
        p: ['Personal data is processed only for lawful purposes, including order processing, delivery, customer support, account security and fraud prevention, and marketing only with your explicit consent (for example, when you subscribe to our newsletter).'],
      },
      {
        heading: 'Data minimisation and retention',
        p: ['Only necessary data is collected, and it is retained for as long as required by law or for legitimate business purposes such as tax, accounting and handling returns.'],
      },
      {
        heading: 'Data security measures',
        p: ['Reasonable security safeguards are implemented as mandated under the Digital Personal Data Protection Act, 2023, including encryption, secure servers and restricted access. Passwords and password-reset links are stored only as one-way hashes, and sign-in sessions use secure cookies.'],
      },
      {
        heading: 'Cookies and analytics',
        p: [
          'We use a secure, HTTP-only cookie to keep you signed in, and your browser\'s local storage remembers your bag, wishlist, theme and currency choice. These are needed for the site to work and are not used for advertising.',
          'We count page views with a random, anonymous browser ID that contains no name, email or IP address, skip counting when your browser sends "Do Not Track", and delete these records after about 13 months. We do not use third-party analytics, advertising or tracking tools.',
        ],
      },
      {
        heading: 'Your rights',
        p: ['You have the right to:'],
        list: [
          'Access your personal data',
          'Correct inaccurate data',
          'Withdraw consent',
          'Request erasure (subject to legal obligations)',
        ],
      },
      {
        heading: 'How to make a request',
        p: ['Requests may be sent to {{supportEmail}}. You can also view and update your profile and addresses at any time in My account, and unsubscribe from newsletters using the link in any newsletter email.'],
      },
      {
        heading: 'Data sharing',
        p: ['Data may be shared with logistics partners, payment gateways and marketplaces strictly for service execution and legal compliance, and with the service providers that run this website: MongoDB Atlas (database), Netlify (website hosting), our email provider (order updates and password resets) and Google Fonts (typefaces loaded from Google\'s servers).'],
      },
      {
        heading: 'Grievance Officer',
        p: ['For data grievances, you may contact our Grievance Officer:'],
        list: ['Name: {{grievanceName}}', 'Email: {{grievanceEmail}}', 'Phone: {{grievancePhone}}', `Address: ${COMPANY}, {{businessAddress}}`, 'Response timeline: 7 working days'],
      },
      {
        heading: 'Changes to this policy',
        p: [AMEND],
      },
    ],
  },
  {
    slug: 'terms-and-conditions',
    title: 'Terms & Conditions',
    short: 'Terms & Conditions',
    icon: 'gavel',
    effective: EFFECTIVE_DATE,
    description: 'The terms that govern purchases from WILDTANE: orders, payments, liability, indemnity, force majeure, intellectual property, governing law and arbitration.',
    sections: [
      {
        heading: 'About these terms',
        p: [
          `These terms govern all purchases made from ${COMPANY} ("WILDTANE", "we", "us") through our website, social media platforms, direct sales channels and third-party marketplaces including Amazon and Flipkart. They are drafted in compliance with ${LAWS}. By using this website or placing an order, you agree to them. Our Privacy Policy, Shipping & Delivery Policy and Return, Refund & Exchange Policy form part of these terms.`,
        ],
      },
      {
        heading: 'Accounts and use of the website',
        list: [
          'You need an account to place orders on this website. Keep your password confidential; you are responsible for activity on your account.',
          'Use the site only for lawful purposes. Do not attempt to gain unauthorised access, scrape data at scale or interfere with security features.',
          'We may suspend or block accounts in case of misuse or fraudulent activity.',
        ],
      },
      {
        heading: 'Products and pricing',
        p: [
          'We try to show products accurately, but minor colour variations due to screen settings may occur. Prices are in Indian Rupees (INR) and include {{taxLabel}} unless stated otherwise; prices shown in other currencies are estimates only and you are always charged in INR.',
        ],
      },
      {
        heading: 'Order acceptance',
        p: ['WILDTANE reserves the right to cancel orders for pricing errors, stock issues, fraud suspicion or regulatory reasons. Any amount paid for a cancelled order is refunded. Customers may cancel within 24 hours of placing an order and before it ships.'],
      },
      {
        heading: 'Payment gateway liability',
        p: ['All payments are processed through third-party RBI-compliant payment gateways. WILDTANE shall not be liable for payment failures, transaction declines, chargebacks, fraud disputes or banking errors beyond its control. Cash on delivery may not be available for every PIN code or order value; the options open to you are shown at checkout.'],
      },
      {
        heading: 'Shipping, returns and refunds',
        p: ['Delivery is described in our Shipping & Delivery Policy, and returns, exchanges, refunds and cancellations in our Return, Refund & Exchange Policy.'],
      },
      {
        heading: 'Reviews and content you submit',
        p: ['Only customers who received a product can review it, and reviews are checked before they are published. We may decline or remove content that is abusive, misleading or unrelated.'],
      },
      {
        heading: 'Limitation of liability',
        p: ['The company\'s liability shall not exceed the purchase price of the product. Indirect, incidental or consequential damages are excluded. Nothing in these terms limits rights you have under the Consumer Protection Act, 2019.'],
      },
      {
        heading: 'Indemnity',
        p: ['The customer agrees to indemnify and hold harmless WILDTANE against any loss, claims, damages or legal costs arising from misuse of products, fraudulent claims, or violation of these terms.'],
      },
      {
        heading: 'Force majeure',
        p: ['WILDTANE shall not be liable for delay or failure due to events beyond reasonable control, including natural disasters, pandemic, strike, governmental restrictions, logistics disruptions, cyber attacks or other force majeure events.'],
      },
      {
        heading: 'Intellectual property',
        p: ['All brand names, designs, logos and product images are protected under the Copyright Act, 1957 and the Trade Marks Act, 1999. You may not copy, reproduce or use them commercially without our written permission.'],
      },
      {
        heading: 'Marketplace orders',
        list: [
          'Orders placed via Amazon or Flipkart are additionally governed by the respective platform policies.',
          'In case of conflict between WILDTANE policy and marketplace rules, the marketplace rules prevail for that transaction.',
          'Chargebacks initiated via a marketplace are handled as per its dispute resolution system.',
        ],
      },
      {
        heading: 'Governing law and jurisdiction',
        p: ['This agreement is governed by the laws of India. Subject to the arbitration clause below, the courts of Delhi shall have exclusive jurisdiction.'],
      },
      {
        heading: 'Arbitration',
        p: ['Any dispute shall be resolved through arbitration under the Arbitration and Conciliation Act, 1996. Seat of arbitration: Delhi. Language: English. The decision of the arbitrator shall be final and binding.'],
      },
      {
        heading: 'Registered office and customer care',
        list: [
          `Registered office: ${COMPANY}, {{businessAddress}}`,
          'GSTIN: {{gstin}}',
          'Customer care: {{supportEmail}} · {{supportPhone}} · {{supportHours}}',
          'Grievance Officer: {{grievanceName}} · {{grievanceEmail}} · {{grievancePhone}}',
          'Complaints are acknowledged within 48 hours and resolved within 7 working days.',
        ],
      },
      {
        heading: 'Changes and contact',
        p: [AMEND, 'Questions about these terms? Email {{supportEmail}} or call {{supportPhone}}{{writeToUs}}.'],
      },
    ],
  },
  {
    slug: 'csr-policy',
    title: 'Corporate Social Responsibility (CSR) Policy',
    short: 'CSR Policy',
    icon: 'volunteer_activism',
    effective: '8 October 2026',
    description: "WILDTANE Private Limited's commitment to social, environmental and ethical responsibility: education, environment, community development and women empowerment.",
    sections: [
      {
        heading: 'Introduction',
        p: [
          `${COMPANY} believes in conducting business responsibly and contributing positively to society. This Corporate Social Responsibility (CSR) Policy outlines the company's commitment toward social, environmental and ethical responsibilities.`,
        ],
      },
      {
        heading: 'Objective',
        p: ['The objective of this CSR Policy is to:'],
        list: ['Contribute to sustainable development', 'Promote education and skill development', 'Support environmental protection initiatives', 'Encourage ethical business practices'],
      },
      {
        heading: 'Areas of CSR Activities',
        p: ['The Company may undertake CSR activities in the following areas:'],
      },
      {
        heading: 'a) Education & Skill Development',
        list: ['Supporting education programs for underprivileged children', 'Promoting vocational training and women empowerment initiatives'],
      },
      {
        heading: 'b) Environmental Sustainability',
        list: ['Supporting tree plantation drives', 'Promoting plastic reduction initiatives', 'Supporting waste management awareness'],
      },
      {
        heading: 'c) Community Development',
        list: ['Supporting local community welfare programs', 'Participation in health awareness or donation drives'],
      },
      {
        heading: 'd) Women Empowerment',
        list: ['Encouraging women employment and entrepreneurship', 'Promoting safe and inclusive workplace practices'],
      },
      {
        heading: 'Implementation',
        p: ['CSR activities may be undertaken directly by the Company or through registered charitable organisations or NGOs as permitted under applicable Indian laws.'],
      },
      {
        heading: 'Monitoring',
        p: ['The management shall review CSR initiatives periodically to ensure effective implementation and compliance with applicable laws.'],
      },
      {
        heading: 'Compliance',
        p: ['This policy shall be governed in accordance with the Companies Act, 2013 (if applicable) and other relevant Indian laws.'],
      },
      {
        heading: 'Review & Amendment',
        p: [
          'The Company reserves the right to modify this CSR Policy as required by law or business needs.',
          "This CSR Policy reflects WILDTANE's commitment toward responsible and sustainable growth.",
        ],
      },
    ],
  },
];

export const policyBySlug = (slug) => POLICIES.find((p) => p.slug === slug);
