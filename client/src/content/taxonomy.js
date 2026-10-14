/**
 * WILDTANE category architecture — one definition used by the storefront (mega menus, landing-page
 * directories, nested URLs) and by server/src/seed/categoryArchitecture.js (the migration that
 * creates any missing categories; it only runs when the owner approves it).
 *
 * Plain JS on purpose (no JSX/imports) so the Node migration can import it too.
 *
 * Provenance
 * - blueprint: true → named in the original WILDTANE Master Website Structure Blueprint
 *   (nav: Women, Men, Travel & Utility; homepage categories: Handbags, Clutches, Wallets,
 *   Laptop Bags, Travel Bags, School Bags).
 * - everything else → recommended additions from the 2026-10 category-architecture brief.
 *
 * Rules the storefront follows
 * - An entry links to a category by `slug`. `also` lists existing categories whose products belong
 *   with it (they are listed together; nothing is copied or moved).
 * - Entries whose categories don't exist yet or have no visible products are hidden — nothing is
 *   shown that can't be bought. They appear by themselves once the migration has created them and
 *   products are assigned in Admin → Products.
 * - Existing subcategories with products that the brief doesn't name are still shown (appended),
 *   so nothing currently on sale disappears from navigation.
 * - `optional: true` marks fashion items (scarves, sunglasses, caps…) the migration only creates
 *   with --include-optional, because WILDTANE may not sell them.
 * - `parent` (group level) is where the migration creates missing categories.
 */

const it = (label, slug, extra = {}) => ({ label, slug, ...extra });

// ── WOMEN ─────────────────────────────────────────────────────
export const WOMEN = {
  key: 'women',
  label: 'Women',
  path: '/women',
  blueprint: true,
  sections: [
    {
      title: "Women's Bags",
      groups: [
        {
          key: 'handbags', label: 'Handbags', parent: 'women-handbags-purses', blueprint: true,
          items: [
            it('Tote Bags', 'women-tote-bags'), it('Shoulder Bags', 'women-shoulder-bags'), it('Crossbody Bags', 'women-crossbody-bags'),
            it('Hobo Bags', 'women-hobo-bags'), it('Satchel Bags', 'women-satchel-bags'), it('Bucket Bags', 'women-bucket-bags'),
            it('Mini Bags', 'women-mini-bags'), it('Top-Handle Bags', 'women-top-handle-bags'), it('Structured Handbags', 'women-structured-handbags'),
            it('Everyday Handbags', 'women-everyday-handbags'), it('Work Handbags', 'women-work-handbags'), it('Evening Handbags', 'women-evening-handbags'),
          ],
        },
        {
          key: 'clutches', label: 'Clutches & Evening Bags', parent: 'women-clutches-evening-bags', parentOf: 'women', blueprint: true,
          also: ['women-clutches', 'women-evening-purses', 'women-party-bags', 'women-wristlet-purses'],
          items: [
            it('Party Clutches', 'women-party-clutches', { also: ['women-party-bags'] }), it('Wedding Clutches', 'women-wedding-clutches'),
            it('Embellished Clutches', 'women-embellished-clutches'), it('Envelope Clutches', 'women-envelope-clutches'), it('Box Clutches', 'women-box-clutches'),
            it('Wristlet Clutches', 'women-wristlet-clutches', { also: ['women-wristlet-purses'] }), it('Evening Pouches', 'women-evening-pouches', { also: ['women-evening-purses'] }),
            it('Clutches', 'women-clutches'),
          ],
        },
        {
          key: 'wallets', label: 'Wallets & Small Accessories', parent: 'women-wallets', blueprint: true,
          items: [
            it("Women's Wallets", 'women-wallets'), it('Card Holders', 'women-card-holders'), it('Coin Purses', 'women-coin-purses'),
            it('Zip Wallets', 'women-zipper-wallets'), it('Compact Wallets', 'women-compact-wallets'), it('Travel Wallets', 'women-travel-wallets'),
          ],
        },
        {
          key: 'backpacks', label: 'Backpacks', parent: 'women-backpacks',
          items: [
            it('Everyday Backpacks', 'women-everyday-backpacks', { also: ['women-casual-backpacks'] }), it('Fashion Backpacks', 'women-fashion-backpacks'),
            it('Mini Backpacks', 'women-mini-backpacks'), it('College Backpacks', 'women-college-backpacks'), it('Work Backpacks', 'women-work-backpacks'),
          ],
        },
        {
          key: 'laptop-bags', label: 'Laptop & Work Bags', parent: 'women-laptop-office-bags', blueprint: true,
          items: [
            it("Women's Laptop Bags", 'women-laptop-bags'), it('Laptop Sleeves', 'women-laptop-sleeves'), it('Office Totes', 'women-office-totes'),
            it('Professional Work Bags', 'women-professional-work-bags', { also: ['women-executive-bags'] }), it('Document Bags', 'women-document-bags'),
          ],
        },
        {
          key: 'travel-bags', label: 'Travel Bags', parent: 'women-travel-bags', blueprint: true,
          items: [
            it('Weekender Bags', 'women-weekender-bags'), it('Duffel Bags', 'women-duffle-bags'), it('Cabin Bags', 'women-cabin-bags'),
            it('Overnight Bags', 'women-overnight-bags'), it('Travel Organizers', 'women-travel-organizers', { also: ['women-jewelry-organizers'] }),
            it('Toiletry Bags', 'women-toiletry-bags', { also: ['women-makeup-travel-bags'] }), it('Passport Holders', 'women-passport-holders'),
          ],
        },
        {
          key: 'shopping-bags', label: 'Shopping & Utility Bags', parent: 'women-shopping-utility-bags', parentOf: 'women',
          items: [
            it('Shopping Totes', 'women-shopping-totes'), it('Foldable Bags', 'women-foldable-bags'),
            it('Everyday Utility Bags', 'women-everyday-utility-bags'), it('Reusable Shopping Bags', 'women-reusable-shopping-bags'),
          ],
        },
      ],
    },
    {
      title: "Women's Accessories",
      groups: [
        {
          key: 'accessories', label: 'Accessories', parent: 'women-accessories',
          items: [
            it('Belts', 'women-belts'), it('Scarves', 'women-scarves', { optional: true }), it('Sunglasses', 'women-sunglasses', { optional: true }),
            it('Caps and Hats', 'women-caps-hats', { optional: true }), it('Fashion Pouches', 'women-fashion-pouches', { also: ['women-makeup-pouches'] }),
            it('Keychains and Bag Charms', 'women-keychains'), it('Card Holders', 'women-card-holders'), it('Coin Purses', 'women-coin-purses'),
            it('Cosmetic Bags', 'women-cosmetic-bags'), it('Jewelry Organizers', 'women-jewelry-organizers', { also: ['women-jewelry-pouches'] }),
            it('Travel Organizers', 'women-travel-organizers'),
          ],
        },
      ],
    },
  ],
};

// ── MEN ───────────────────────────────────────────────────────
export const MEN = {
  key: 'men',
  label: 'Men',
  path: '/men',
  blueprint: true,
  sections: [
    {
      title: "Men's Bags",
      groups: [
        {
          key: 'backpacks', label: 'Backpacks', parent: 'men-backpacks',
          items: [
            it('Everyday Backpacks', 'men-everyday-backpacks', { also: ['men-casual-backpacks'] }), it('Office Backpacks', 'men-office-backpacks'),
            it('Laptop Backpacks', 'men-laptop-backpacks'), it('College Backpacks', 'men-college-backpacks'), it('Travel Backpacks', 'men-travel-backpacks'),
            it('Minimalist Backpacks', 'men-minimalist-backpacks'),
          ],
        },
        {
          key: 'laptop-bags', label: 'Laptop Bags', parent: 'men-laptop-bags', blueprint: true,
          items: [
            it('Laptop Messenger Bags', 'men-laptop-messenger-bags'), it('Laptop Briefcases', 'men-laptop-briefcases'), it('Laptop Sleeves', 'men-laptop-sleeves'),
            it('Office Laptop Bags', 'men-office-laptop-bags', { also: ['men-business-laptop-bags'] }),
            it('Professional Laptop Bags', 'men-professional-laptop-bags', { also: ['men-executive-laptop-bags'] }), it('Business Laptop Backpacks', 'men-business-laptop-backpacks'),
          ],
        },
        {
          key: 'briefcases', label: 'Briefcases & Office Bags', parent: 'men-office-bags',
          items: [
            it('Executive Briefcases', 'men-executive-briefcases', { also: ['men-briefcases'] }), it('Business Briefcases', 'men-business-briefcases'),
            it('Document Bags', 'men-document-bags'), it('Office Messenger Bags', 'men-office-messenger-bags'), it('Professional Work Bags', 'men-professional-work-bags', { also: ['men-portfolio-bags'] }),
          ],
        },
        {
          key: 'messenger-sling', label: 'Messenger & Sling Bags', parent: 'men-messenger-sling-bags', parentOf: 'men-bags',
          also: ['men-sling-bags', 'men-messenger-bags', 'men-crossbody-bags', 'men-crossbody-office-bags'],
          items: [
            it('Messenger Bags', 'men-messenger-bags'), it('Crossbody Bags', 'men-crossbody-bags'), it('Sling Bags', 'men-sling-bags'),
            it('Compact Everyday Bags', 'men-compact-everyday-bags', { also: ['men-waist-bags'] }), it('Utility Sling Bags', 'men-utility-sling-bags'),
          ],
        },
        {
          key: 'duffel-gym', label: 'Duffel & Gym Bags', parent: 'men-duffel-gym-bags', parentOf: 'men-bags', also: ['men-gym-bags'],
          items: [
            it('Gym Duffel Bags', 'men-gym-duffel-bags', { also: ['men-gym-bags'] }), it('Sports Bags', 'men-sports-bags'), it('Weekender Bags', 'men-weekender-bags'),
            it('Overnight Bags', 'men-overnight-bags'), it('Fitness Utility Bags', 'men-fitness-utility-bags'),
          ],
        },
        {
          key: 'travel-bags', label: 'Travel Bags', parent: 'men-travel-bags', blueprint: true,
          items: [
            it('Cabin Bags', 'men-cabin-bags'), it('Travel Duffels', 'men-travel-duffels', { also: ['men-duffle-bags'] }), it('Weekend Travel Bags', 'men-weekend-travel-bags', { also: ['men-weekender-bags'] }),
            it('Garment Bags', 'men-garment-bags'), it('Travel Organizers', 'men-travel-organizers'), it('Toiletry Bags', 'men-toiletry-bags'), it('Passport Holders', 'men-passport-holders'),
          ],
        },
        {
          key: 'wallets', label: 'Wallets', parent: 'men-wallets', blueprint: true,
          items: [
            it('Bifold Wallets', 'men-bifold-wallets'), it('Trifold Wallets', 'men-trifold-wallets'), it('Slim Wallets', 'men-slim-wallets', { also: ['men-minimalist-wallets'] }),
            it('Card Holders', 'men-card-holders'), it('Coin Wallets', 'men-coin-purses'), it('Zip Wallets', 'men-zipper-wallets'), it('Travel Wallets', 'men-travel-wallets', { also: ['men-passport-wallets'] }),
          ],
        },
        {
          key: 'totes-utility', label: "Men's Totes & Utility Bags", parent: 'men-totes-utility-bags', parentOf: 'men-bags', also: ['men-tote-bags'],
          items: [
            it('Everyday Totes', 'men-everyday-totes', { also: ['men-tote-bags'] }), it('Work Totes', 'men-work-totes'),
            it('Compact Utility Bags', 'men-compact-utility-bags'), it('Shopping Bags', 'men-shopping-bags'),
          ],
        },
      ],
    },
    {
      title: "Men's Accessories",
      groups: [
        {
          key: 'accessories', label: 'Accessories', parent: 'men-accessories', also: ['men-belts'],
          items: [
            it('Belts', 'men-belts'), it('Card Holders', 'men-card-holders'), it('Keychains', 'men-keychains'), it('Bag Charms', 'men-bag-charms'),
            it('Travel Organizers', 'men-travel-organizers', { also: ['men-tech-organizers'] }), it('Passport Holders', 'men-passport-holders'),
            it('Toiletry Pouches', 'men-toiletry-bags'), it('Sunglasses', 'men-sunglasses', { optional: true }), it('Caps and Hats', 'men-caps-hats', { optional: true }),
            it('Everyday Carry Accessories', 'men-everyday-carry'),
          ],
        },
      ],
    },
  ],
};

// ── BAGS (all audiences) ──────────────────────────────────────
export const BAGS = {
  key: 'bags',
  label: 'Bags',
  path: '/bags',
  // Product listing for /bags: every bag branch, across audiences.
  listing: ['bags', 'men-bags', 'women-handbags-purses', 'women-backpacks', 'women-travel-bags', 'women-laptop-office-bags', 'cabin-luggage', 'daypacks', 'tech-briefcases', 'waterproof-commuters'],
  purposes: [
    ['Work', { purpose: 'work' }], ['College', { purpose: 'college' }], ['Travel', { purpose: 'travel' }],
    ['Gym', { purpose: 'gym' }], ['Everyday', { purpose: 'everyday' }], ['Party', { occasion: 'party' }],
  ],
  sections: [
    {
      title: 'Shop bags by type',
      groups: [
        {
          key: 'types', label: 'Bag types', parent: 'bags',
          items: [
            it('Handbags', 'handbags', { blueprint: true }), it('Tote Bags', 'tote-bags'), it('Shoulder Bags', 'shoulder-bags'), it('Crossbody Bags', 'crossbody-bags'),
            it('Sling Bags', 'sling-bags'), it('Clutches', 'clutches', { blueprint: true }), it('Backpacks', 'backpacks'), it('Laptop Bags', 'laptop-bags', { blueprint: true }),
            it('Laptop Sleeves', 'laptop-sleeves'), it('Briefcases', 'briefcases', { also: ['tech-briefcases'] }), it('Messenger Bags', 'messenger-bags'),
            it('Duffel Bags', 'duffle-bags'), it('Travel Bags', 'travel-bags', { blueprint: true }), it('Cabin Bags', 'cabin-luggage'), it('Weekender Bags', 'weekender-bags'),
            it('School Bags', 'school-bags', { blueprint: true }), it('College Bags', 'college-bags'), it('Gym Bags', 'gym-bags'), it('Office Bags', 'office-bags'),
            it('Shopping Bags', 'shopping-bags'), it('Mini Bags', 'mini-bags-wristlets'), it('Utility Bags', 'utility-bags'), it('Document Bags', 'document-bags'),
            it('Garment Bags', 'garment-bags'), it('Cosmetic Bags', 'cosmetic-bags'), it('Toiletry Bags', 'toiletry-kits'), it('Wallets', 'wallets', { blueprint: true }),
            it('Travel Organizers', 'travel-organisers'),
          ],
        },
      ],
    },
    {
      title: 'School & College',
      groups: [
        {
          key: 'school-college', label: 'School & College', parent: 'school-bags',
          items: [
            it('School Backpacks', 'school-backpacks'), it('College Backpacks', 'college-backpacks', { also: ['student-backpacks'] }), it('Laptop Backpacks', 'laptop-backpacks'),
            it('School Utility Bags', 'school-utility-bags'), it('College Sling Bags', 'college-sling-bags'), it('Student Organizers', 'student-organizers'),
          ],
        },
      ],
    },
    {
      title: 'Work & Business',
      groups: [
        {
          key: 'work-business', label: 'Work & Business', parent: 'office-bags',
          items: [
            it('Office Backpacks', 'office-backpacks'), it('Laptop Bags', 'laptop-bags'), it('Briefcases', 'briefcases', { also: ['tech-briefcases'] }),
            it('Executive Bags', 'executive-bags'), it('Messenger Bags', 'messenger-bags'), it('Document Bags', 'document-bags'), it('Professional Totes', 'professional-totes', { also: ['work-totes'] }),
          ],
        },
      ],
    },
  ],
};

// ── ACCESSORIES (all audiences) ───────────────────────────────
export const ACCESSORIES = {
  key: 'accessories',
  label: 'Accessories',
  path: '/shop/accessories',
  root: 'accessories',
  sections: [
    {
      title: 'Accessories',
      groups: [
        {
          key: 'wallets', label: 'Wallets & Small Leather Goods', parent: 'wallets', blueprint: true,
          items: [
            it("Men's Wallets", 'men-wallets'), it("Women's Wallets", 'women-wallets'), it('Bifold Wallets', 'men-bifold-wallets'), it('Trifold Wallets', 'men-trifold-wallets'),
            it('Slim Wallets', 'men-slim-wallets'), it('Card Holders', 'card-holders', { also: ['men-card-holders', 'women-card-holders'] }),
            it('Coin Purses', 'coin-purses', { also: ['pouches-coin-purses', 'men-coin-purses', 'women-coin-purses'] }), it('Zip Wallets', 'zip-wallets'),
            it('Travel Wallets', 'travel-wallets'), it('Passport Holders', 'passport-holders'), it('All Wallets', 'wallets'),
          ],
        },
        {
          key: 'fashion', label: 'Fashion Accessories', parent: 'accessories',
          items: [
            it('Belts', 'belts'), it('Scarves', 'scarves', { optional: true }), it('Sunglasses', 'sunglasses', { optional: true }), it('Caps', 'caps', { optional: true }),
            it('Hats', 'hats', { optional: true }), it('Keychains', 'keychains'), it('Bag Charms', 'bag-charms'), it('Fashion Pouches', 'fashion-pouches', { also: ['pouches'] }),
            it('Eyewear Cases', 'eyewear-cases'), it('Perfumes & Fragrance', 'perfumes'), it('Apparel & T-Shirts', 't-shirts'),
          ],
        },
        {
          key: 'travel-accessories', label: 'Travel Accessories', parent: 'accessories',
          items: [
            it('Passport Holders', 'passport-holders'), it('Luggage Tags', 'luggage-tags'), it('Travel Organizers', 'travel-organisers'), it('Toiletry Bags', 'toiletry-kits'),
            it('Packing Cubes', 'packing-cubes'), it('Cable Organizers', 'cable-organizers'), it('Travel Pouches', 'travel-pouches'), it('Document Organizers', 'document-organizers'),
            it('Hydration', 'hydration'), it('Travel Comfort', 'travel-comfort'),
          ],
        },
        {
          key: 'work-tech', label: 'Work & Technology', parent: 'accessories',
          items: [
            it('Laptop Sleeves', 'laptop-sleeves'), it('Laptop Organizers', 'laptop-organizers'), it('Cable Organizers', 'cable-organizers'),
            it('Document Holders', 'document-holders'), it('Tech Pouches', 'tech-pouches'), it('Work Organizers', 'work-organizers'),
          ],
        },
        {
          key: 'everyday', label: 'Everyday Utility', parent: 'accessories',
          items: [
            it('Cosmetic Bags', 'cosmetic-bags'), it('Coin Purses', 'coin-purses'), it('Key Holders', 'key-holders', { also: ['keychains'] }),
            it('Compact Pouches', 'compact-pouches', { also: ['pouches'] }), it('Belt Bags', 'belt-bags'), it('Shopping Accessories', 'shopping-accessories'),
            it('Reusable Utility Bags', 'reusable-utility-bags'),
          ],
        },
      ],
    },
  ],
};

// ── TRAVEL & UTILITY ──────────────────────────────────────────
export const TRAVEL = {
  key: 'travel',
  label: 'Travel & Utility',
  path: '/shop/travel-utility',
  root: 'travel-utility',
  blueprint: true,
  sections: [
    {
      title: 'Travel & Utility',
      groups: [
        {
          key: 'travel', label: 'Travel', parent: 'travel-utility', blueprint: true,
          items: [
            it('Cabin Bags', 'cabin-luggage'), it('Duffel Bags', 'duffle-bags'), it('Weekender Bags', 'weekender-bags'), it('Travel Backpacks', 'travel-backpacks', { also: ['daypacks'] }),
            it('Travel Organizers', 'travel-organisers'), it('Toiletry Bags', 'toiletry-kits'), it('Passport Holders', 'passport-holders'), it('Packing Cubes', 'packing-cubes'),
            it('Luggage Tags', 'luggage-tags'), it('Garment Bags', 'garment-bags'), it('Travel Wallets', 'travel-wallets'), it('Compact Utility Bags', 'utility-bags', { also: ['waterproof-commuters'] }),
            it('Tech Briefcases', 'tech-briefcases'),
          ],
        },
      ],
    },
  ],
};

export const DIRECTORIES = { women: WOMEN, men: MEN, bags: BAGS, accessories: ACCESSORIES, travel: TRAVEL };

/** Every (parent, slug, label, optional) the architecture expects — used by the migration. */
export function plannedCategories() {
  const out = [];
  for (const dir of Object.values(DIRECTORIES)) {
    for (const section of dir.sections) {
      for (const g of section.groups) {
        out.push({ slug: g.parent, label: g.label, parentOf: g.parentOf || null, department: dir.key === 'women' || dir.key === 'men' ? dir.key : 'all', isGroup: true });
        for (const i of g.items) out.push({ slug: i.slug, label: i.label, parent: g.parent, optional: Boolean(i.optional), department: dir.key === 'women' || dir.key === 'men' ? dir.key : 'all' });
      }
    }
  }
  return out;
}
