# WILDTANE — MERN e-commerce

A full-stack store for bags and travel gear, built from the Google Stitch design "Wildtane Luxury Bags E-Commerce".

- **client/** — React 19 + Vite, React Router, Redux Toolkit, TanStack Query, React Hook Form + Zod, Tailwind CSS (Stitch design tokens), Recharts
- **server/** — Node.js + Express, MongoDB + Mongoose, JWT in HTTP-only cookies, Zod validation, Cloudinary (optional), WhatsApp Cloud API (optional)

## Quick start

Requires Node 20+ and a MongoDB Atlas cluster (a replica set — order placement uses transactions).

```bash
npm run install:all                 # installs root, server and client packages
cp server/.env.example server/.env  # then fill in MONGODB_URI, JWT_SECRET, ADMIN_*
npm run seed                        # first run: full demo store. Later runs: add anything new, delete nothing
npm run dev                         # API on :5000, storefront on :3000
```

Open http://localhost:3000. Admins sign in at `/admin/login`. That sign-in accepts only admin accounts, and the customer sign-in rejects them. Five wrong passwords lock an account for 15 minutes.

| Account | Email | Password |
|---|---|---|
| Admin | value of `ADMIN_EMAIL` | value of `ADMIN_PASSWORD` |
| Demo customer | demo@wildtane.com | Demo@12345 |

**To change the admin email or password:** edit `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `server/.env`, then run `npm run admin:sync`. It updates the existing admin account, clears any sign-in lock and signs out old admin sessions. You can run it again any time you forget the password.

Change both passwords before going live. `npm run seed:fresh` wipes the catalogue, orders and demo data and reseeds. The admin account is kept.

## Environment variables (`server/.env`)

See `server/.env.example` for every variable with comments.

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | yes | Atlas connection string including `/wildtane` database name |
| `JWT_SECRET` | yes | Long random string for signing session tokens |
| `CLIENT_URL` | yes | Storefront origin(s) allowed by CORS, comma-separated |
| `SERVER_URL` | prod | Public URL of the API/site |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | seed | First admin account |
| `CLOUDINARY_*` | no | Image storage. Blank → files saved to `server/uploads` |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `ADMIN_WHATSAPP_NUMBER` | no | New-order alerts. Blank → message logged to the server console |
| `SMTP_*`, `MAIL_FROM` | no | Password-reset emails. Blank → reset link printed to the console |

Secrets live only on the server. The client never receives API keys.

## How key flows work

**Orders.** `POST /api/orders` re-prices the server cart, validates the coupon and payment method, then runs one MongoDB transaction that:
1. decrements each variant's stock only if enough remains (so concurrent buyers can't oversell),
2. redeems the coupon,
3. creates the order with a sequential ID (`WT26-000123`),
4. clears the cart.

Cancelling or returning an order restores stock and releases the coupon.

**WhatsApp alerts.** These run only after the order is committed (`server/src/services/whatsapp.service.js`). Every attempt is stored in the `Notification` collection with status `sent`, `logged` or `failed`. A failed notification never affects the order. Admins can preview, resend, or "Open in WhatsApp" from the order page or **Admin → Notifications**.

The Cloud API only delivers free-form text inside a 24-hour customer-service window. For guaranteed delivery, create an approved message template in Meta Business Manager and switch `sendViaCloudApi` to send that template.

**Live updates.** Admin → Live updates posts short news (drops, restocks, events, offers) that appears on the Journal page and homepage. The storefront re-checks every 15 seconds, so shoppers see new posts without reloading. Posts can be pinned, hidden, edited or deleted.

**Reports & visitor counting.** Each storefront page view sends an anonymous beacon (`POST /api/track`). The beacon carries a random browser ID and no personal data. Bots, the admin area and browsers with "Do Not Track" are skipped, and rows expire after about 13 months. **Admin → Reports** shows visitors, page views, orders, revenue, new customers and conversion by day, week or month against the previous period. It also shows top pages, most-viewed products, traffic sources and devices. Conversion only counts orders placed since visitor counting began.

**Payments.** Cash on Delivery is live. Cards, UPI and wallets are registered in `server/src/services/payment.service.js` as "coming soon" providers. Add a gateway by implementing `isAvailable` and `initiate`, plus a webhook route that verifies the gateway signature and marks the order `Paid`. Card data must never touch this server.

**Prices** are stored in INR and include GST by default (configurable in Admin → Settings). The currency picker converts prices for display only. Checkout always charges INR.

## API overview

| Prefix | Highlights |
|---|---|
| `/api/auth` | register, login, logout, logout-all, me, forgot/reset password |
| `/api/users` | profile, avatar, password, addresses (up to 10), recently viewed, my reviews |
| `/api/products` | list with filters/sort/pagination, facets, suggest (autocomplete), collections, detail |
| `/api/categories` | category tree with subcategories and product counts |
| `/api/cart` | persistent cart, variant switch, coupon, shipping method, guest quote, merge, payment methods |
| `/api/wishlist` | add, remove, merge guest list |
| `/api/orders` | place, list, detail, cancel |
| `/api/reviews` | list, eligibility (verified purchase), create/edit/delete, helpful |
| `/api/coupons`, `/api/blogs`, `/api/banners`, `/api/config` | public content |
| `/api/contact`, `/api/corporate`, `/api/newsletter` | form submissions (corporate accepts a logo upload) |
| `/api/admin/*` | dashboard, analytics, products, categories, inventory, orders, customers, coupons, reviews, enquiries, blogs, banners, notifications, settings, uploads |

## Security

Helmet (with a content security policy), CORS allow-list, rate limits (global, auth and forms), bcrypt password hashing, JWT in `httpOnly` cookies with token versioning (logout-everywhere and password change revoke sessions), role-based admin guard, Zod validation on every write, MongoDB operator stripping, XSS filtering of all text input (blog HTML is whitelisted), upload type and size limits, and centralised error handling that hides internals in production.

## Testing

```bash
npm run test:api   # 68 end-to-end API checks against your database; cleans up after itself
```

The checks cover the catalogue, auth, cart and coupons, order placement and totals, inventory decrement and restore, a three-buyer race for the last unit, review rules, forms with XSS input, and admin access control.

## Production

```bash
npm run build                          # builds client/dist
NODE_ENV=production SERVER_URL=https://your-domain npm start
```

With `NODE_ENV=production` the API also serves `client/dist`, so you deploy one Node app. Serve it over HTTPS: auth cookies are `Secure` and `SameSite=None` in production. To host the frontend separately, build it with `VITE_API_URL=https://api.your-domain` and add that origin to `CLIENT_URL`.

Configure Cloudinary in production. Many hosts have an ephemeral disk, which would lose files in `server/uploads`.

### Netlify (storefront) + Railway (API)

1. **Railway:** deploy the `server` folder (start command `npm start`). Set `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CLIENT_URL=https://your-site.netlify.app` (your Netlify address), `SERVER_URL=https://your-site.netlify.app`, `TRUST_PROXY=2`, and the `CLOUDINARY_*` keys (Railway's disk is wiped on every deploy, so uploaded photos must go to Cloudinary).
2. **Netlify:** connect the repo. `netlify.toml` already sets the build. Replace `YOUR-RAILWAY-APP.up.railway.app` in it with your Railway domain. Do **not** set `VITE_API_URL`: Netlify forwards `/api` to Railway, so sign-in cookies stay on your own site and work in every browser.
3. **Admin:** open `https://your-site.netlify.app/login` (or `/admin/login`) and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. If you use the same MongoDB Atlas database as development, the admin account already exists. Otherwise run `npm run admin:sync` once from Railway's shell.
