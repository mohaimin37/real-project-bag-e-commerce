// Every admin section, grouped. Shared by the admin sidebar and the storefront "Admin" menu.
// Item: [path under /admin, icon, label, dashboard alert key for a count badge?]
export const ADMIN_NAV = [
  { group: 'Overview', items: [['guide', 'help', 'Start here'], ['', 'space_dashboard', 'Dashboard'], ['reports', 'query_stats', 'Reports'], ['analytics', 'monitoring', 'Analytics']] },
  { group: 'Catalogue', items: [['quick-edit', 'bolt', 'Quick edit'], ['products', 'inventory_2', 'Products'], ['products/new', 'add_box', 'Add product'], ['categories', 'category', 'Categories'], ['inventory', 'warehouse', 'Inventory']] },
  { group: 'Sales', items: [['orders', 'receipt_long', 'Orders', 'pendingOrders'], ['payments', 'payments', 'Payments', 'refundsToSend'], ['returns', 'assignment_return', 'Returns', 'pendingReturns'], ['customers', 'group', 'Customers'], ['coupons', 'sell', 'Coupons'], ['giftcards', 'card_giftcard', 'Gift cards'], ['reviews', 'reviews', 'Reviews', 'pendingReviews'], ['comments', 'forum', 'Comments', 'pendingComments']] },
  { group: 'Engagement', items: [['enquiries/corporate', 'domain', 'Corporate', 'newCorporate'], ['enquiries/contact', 'mail', 'Contact', 'newContact'], ['notifications', 'notifications', 'Notifications', 'failedNotifications']] },
  { group: 'Content', items: [['blogs', 'article', 'Blog'], ['updates', 'campaign', 'Live updates'], ['banners', 'view_carousel', 'Banners'], ['settings', 'settings', 'Settings']] },
];

export const adminPath = (to) => (to ? `/admin/${to}` : '/admin');
