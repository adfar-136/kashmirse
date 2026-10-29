# Kashmir Se

A full-stack ecommerce storefront for Kashmiri food, clothing, crafts, gifts and cricket products, built with **Next.js, React, TypeScript and MongoDB**. Its heritage interface uses ivory, walnut and antique gold, floral borders, serif typography and locally hosted product imagery.

The catalogue contains **78 sample products across 12 categories**, with **203 purchase options**. Real payment, delivery and email adapters are implemented; the default configuration uses payment/shipping simulation and email previews.

## Features

### Shopping

- Expanded homepage with featured products, top picks, new arrivals, seasonal produce, gifting and journal sections.
- Search, category and price filters, stock filtering, sorting, product galleries and related products.
- Pack weights for saffron, nuts, tea, honey, pickles, produce and more; relevant clothing, age, bat, capacity and set-size choices.
- Select options directly on product cards. Compare unit prices and see totals such as **2 × 500 g = 1 kg**.
- Persistent shopping bag, wishlists, coupons and bulk enquiries.
- Sign-in required at checkout, profile prefill, saved-address selection and additional addresses.

### Customer accounts

- Registration, sign-in, bcrypt password hashing, signed HTTP-only sessions and login rate limits.
- Password recovery with expiring, single-use reset links and session invalidation.
- Profile and address management, order history, tracking, reorder and printable order summaries.
- Eligible cancellations with stock restoration, return requests and moderated delivered-purchase reviews.

### Store operations

- Admin dashboard for products, inventory, orders, customers, categories, offers, reviews, enquiries and settings.
- Product option editing, archive/restore and validated PNG/JPEG/WebP uploads up to 5 MB.
- Fulfilment status history, return decisions and manual refund records.
- Shipment booking, AWB assignment/retry, pickup requests, label generation, tracking refresh and courier cancellation.
- Email outbox with previews, delivery status and manual retries.

## Stack and structure

| Layer                         | Technology                                            |
| ----------------------------- | ----------------------------------------------------- |
| App and API                   | Next.js 16 App Router                                 |
| Interface                     | React 19, TypeScript, CSS, Lucide icons               |
| Database                      | MongoDB Node driver; local MongoDB or Atlas           |
| Validation and authentication | Zod, bcryptjs, jose                                   |
| Integrations                  | Razorpay, Shiprocket, SMTP through Nodemailer         |
| Checks                        | Node test runner, TypeScript, API integration scripts |

The project follows Feature-Sliced Design conventions. The page-composition layer is named `views` to avoid confusion with Next.js routing.

```text
src/
  app/          App Router pages, layouts and API routes
  views/        Storefront, catalogue, account, content and admin pages
  widgets/      Header and footer
  features/     Authentication, cart, checkout and provider interfaces
  entities/     Product queries and cards
  shared/       Types, validation, auth, database, integrations and UI
scripts/        Catalogue seeds, migrations and integration checks
tests/          Commerce, catalogue, provider and product-option tests
public/         Fonts, reference artwork and product photo atlases
.data/uploads/  Runtime uploads; ignored by Git
```

## Getting started

### Requirements

- Node.js 22 or newer and npm.
- A running local MongoDB instance or a MongoDB Atlas database user and connection string.

### Install and configure

```bash
git clone https://github.com/adfar-136/kashmirse.git
cd kashmirse
npm ci
cp .env.example .env.local
```

Set `SESSION_SECRET` in `.env.local` to a random value of at least 32 characters. Generate one with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

For local MongoDB, the example already uses `mongodb://127.0.0.1:27017` and database `kashmir_se`. To use Atlas, replace `MONGODB_URI` with the connection string from **Atlas → Connect → Drivers**, including the database-user credentials. URL-encode special characters in the password. Ensure the user has access to the chosen database and the application host is allowed in Atlas Network Access.

`MONGODB_URI` is the connection actually used by the app. Separate username/password fields do not override credentials inside that URI.

### Seed and run

```bash
npm run seed
npm run dev
```

Open [localhost:3000](http://127.0.0.1:3000).

Seeding creates sample catalogue data and demo accounts. Existing orders and accounts are retained. Revisioned catalogue updates preserve option identities and inventory; purchase-option additions preserve existing prices and custom variants. Review the seed script before running it against a database with real business data.

For a production-mode preview:

```bash
npm run build
npm start
```

Restart the server after changing environment variables.

## Environment configuration

Copy the complete template from [`.env.example`](.env.example). Keep actual values in `.env.local` locally or your hosting provider's secret settings.

| Variables                                                           | Purpose                                                              |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `MONGODB_URI`, `MONGODB_DB`                                         | Active database connection and database name                         |
| `SESSION_SECRET`                                                    | Signing key for account sessions                                     |
| `APP_URL`                                                           | Public application origin used in email links                        |
| `NEXT_PUBLIC_APP_URL`                                               | Public URL setting; never place secrets in public-prefixed variables |
| `PAYMENT_MODE`                                                      | `simulation` by default; `razorpay` enables provider requests        |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Razorpay credentials and webhook verification                        |
| `DELIVERY_MODE`                                                     | `simulation` by default; `shiprocket` enables provider requests      |
| `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`                           | Shiprocket API-user credentials                                      |
| `SHIPROCKET_PICKUP_PINCODE`, `SHIPROCKET_PICKUP_LOCATION`           | Configured pickup warehouse                                          |
| `SHIPROCKET_WEBHOOK_TOKEN`                                          | Shared token for authenticated tracking events                       |
| `EMAIL_MODE`                                                        | `preview` by default; `smtp` sends email                             |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`              | Mail server connection and authentication                            |
| `STORE_NOTIFICATION_EMAIL`                                          | Recipient of store copies of order notifications                     |

`.env.local`, runtime uploads, dependencies and build output are excluded from Git. Database contents are not included in this repository.

## Demo access

Run the seed first, then use these development accounts or the sign-in page's demo buttons:

| Role     | Email                      | Password             |
| -------- | -------------------------- | -------------------- |
| Customer | `customer@kashmirse.local` | `KashmirSe123!`      |
| Admin    | `admin@kashmirse.local`    | `KashmirSeAdmin123!` |

These are public demo credentials. Remove or change the seeded accounts, remove the demo-login affordances and replace the sample policies before public commercial use.

The seeded offer `WELCOME10` gives 10% off orders of at least ₹999, capped at ₹500, subject to its configured expiry and active status.

## Payments: UPI, cards and COD

In `simulation` mode, online orders are saved unpaid and customers can test success, failure, cancellation and retry without entering real payment details. COD remains available according to store settings. Failed payments can retry from the saved order page. Unpaid online orders cannot be fulfilled.

To enable Razorpay:

1. Add the three Razorpay environment values and set `PAYMENT_MODE=razorpay`.
2. Enable automatic payment capture in the Razorpay dashboard.
3. Configure an HTTPS webhook at `/api/payments/webhook`, subscribing to `payment.captured`.
4. Verify the complete flow with Razorpay test keys before using live keys.

The server creates the provider order, validates callback signatures and checks the captured payment's amount, currency and order identity. Real card/UPI entry happens in Razorpay hosted checkout. The app does not store card numbers, CVV or UPI PINs.

Refund records do **not** transfer money; staff must execute refunds through the payment provider. Cancel abandoned unpaid orders to release inventory; automatic expiry is not scheduled.

Reference: [Razorpay Standard Checkout](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/).

## Delivery: Shiprocket

Simulation identifies coverage and shipments as virtual. Live mode checks postcode serviceability/COD availability and provides shipment, AWB, pickup, label and tracking controls in admin order details.

1. Configure a warehouse and API user in Shiprocket.
2. Fill the Shiprocket environment values and set `DELIVERY_MODE=shiprocket`.
3. Set the public HTTPS tracking webhook to `/api/delivery/webhook` with the matching `SHIPROCKET_WEBHOOK_TOKEN` as `x-api-key`.
4. Enter measured parcel weight and dimensions before booking. Defaults are placeholders.

Tracking events are rechecked against the provider before order status updates. The store's flat/free shipping policy controls what the customer pays; courier cost is separate. Cancel the courier booking before cancelling the store order. Live bookings reject simulated prepaid payments.

AWB failures retain the shipment ID for retry assignment. If creation times out ambiguously, inspect the provider dashboard before retrying. Delivery exceptions and returns-to-origin require staff handling.

Reference: [Shiprocket API documentation](https://apidocs.shiprocket.in/).

## Gmail email setup

Use a **Google App Password**, not your normal Gmail password.

1. Sign in to the Gmail account that will send store emails.
2. Open [Google Account Security](https://myaccount.google.com/security) and enable **2-Step Verification**.
3. Open [App Passwords](https://myaccount.google.com/apppasswords).
4. Create an app password named **Kashmir Se** and copy the generated 16-character value.
5. Enter it privately in `.env.local` as `SMTP_PASSWORD`, without the display spaces:

```dotenv
EMAIL_MODE=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-generated-app-password
STORE_NOTIFICATION_EMAIL=your-email@gmail.com
APP_URL=http://127.0.0.1:3000
```

Restart the app. In `/admin/notifications`, inspect the status of a test order email and retry an existing preview when ready to send it. Enabling SMTP means new order and password-reset events will send real emails.

If App Passwords is unavailable, check 2-Step Verification first. Google may restrict the feature for organization-managed accounts, Advanced Protection, or accounts configured with security-key-only verification. See [Google's App Password guidance](https://support.google.com/accounts/answer/185833).

Preview mode saves messages locally in `mail_outbox` without sending. Order, payment, shipment, return and status emails go to customers, with store copies to the configured address. SMTP failures are recorded for manual retry. There is no automatic background retry scheduler or stale `sending` recovery yet; inspect the mailbox before retrying an ambiguous send.

Password-reset links expire after 30 minutes and can be used once. Resetting a password invalidates previous sessions. Only token digests are stored in the reset collection, while email previews necessarily contain the link and are restricted to administrators.

## Main routes

| Area             | Routes                                                                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shopping         | `/`, `/products`, `/products/[slug]`, `/categories`, `/categories/[slug]`, `/gifts`                                                                       |
| Bag and checkout | `/wishlist`, `/cart`, `/checkout`                                                                                                                         |
| Accounts         | `/account/login`, `/account/forgot-password`, `/account/reset-password`, `/account/orders`, `/account/addresses`, `/account/profile`                      |
| Order details    | `/account/orders/[id]`, `/track`                                                                                                                          |
| Admin            | `/admin`, `/admin/products`, `/admin/inventory`, `/admin/orders`, `/admin/customers`, `/admin/notifications`, plus catalogue/moderation/settings sections |
| Content          | `/about`, `/makers`, `/journal`, `/contact`, `/bulk`, `/help`, `/shipping`, `/returns`, `/privacy`, `/terms`                                              |

API handlers live under `src/app/api`. Account mutations enforce authentication and request-origin checks; admin operations require the admin role. Provider webhooks use their own authentication/signature checks.

## Checks

```bash
npm run typecheck
npm test
npm run build

# With the application running and a seeded test database:
npm run test:integration
npm run test:services
```

The integration scripts create disposable test records and clean up their own records. They require the seeded demo admin and simulation/preview provider modes. Use a dedicated test database: the scripts exercise inventory and order mutations. `TEST_BASE_URL` can target an alternate application URL; it must serve the same database configured for the script.

Tests cover catalogue integrity, SKU/weight options, price calculations, signature verification, inventory concurrency, authorization, address saving, payment simulation, delivery controls, email access and password-reset expiry/reuse.

## Current limits and launch preparation

- Seeded products, prices, stock, origin/material claims and reviews are illustrative. Supplier verification, actual packaging/food labels and real product photography are still needed.
- AI-generated product illustrations are stored in `public/catalog`. Prompt specifications are in `scripts/catalog-image-prompts.json`. The approved reference artwork is `public/design-reference.png`.
- Real provider credentials and end-to-end provider testing are required. SMS and WhatsApp are not connected.
- Conditional inventory reservations compensate for ordinary failures, but order creation is not a MongoDB multi-document transaction—even when Atlas supports transactions. Production use needs a transaction or durable reservation/reconciliation workflow for process-crash safety.
- Uploaded files use local disk. Production hosting needs durable storage, backups and an appropriate image service.
- Notifications require manual retry; refunds and courier exceptions require staff handling.
- Configure the final HTTPS origin, business identity, commercial policies, tax/invoice requirements, monitoring and backups before accepting real orders.

## Commands

| Command                    | Purpose                                        |
| -------------------------- | ---------------------------------------------- |
| `npm run dev`              | Development server using webpack on port 3000  |
| `npm run build`            | Optimized production build                     |
| `npm start`                | Run the production build                       |
| `npm run seed`             | Seed or migrate owned sample catalogue records |
| `npm run typecheck`        | TypeScript checks                              |
| `npm test`                 | Unit and integrity tests                       |
| `npm run test:integration` | Commerce and route integration checks          |
| `npm run test:services`    | Payments, shipping, email and recovery checks  |
| `npm run format`           | Format source and project files                |
