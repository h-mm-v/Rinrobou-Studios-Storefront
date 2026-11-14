# Rinrobou-Studios-Storefront

A digital storefront for Rinrobou Studio's commissions and order management.

## Commission requests

The commission API is implemented in `commission-server.ts`, checkout routes
in `checkout-server.ts`, and `storefront-server.ts` composes both routers and
serves the storefront:

```sh
npm install
npm start
```

Node.js 22.6 or newer is required for native TypeScript type stripping.
Open `http://localhost:3000/commission.html`. The server accepts requests at
`POST /api/commissions` and stores request details in the MySQL `commissions`
table. Apply `database.sql` to the database before submitting requests.

Set `HOST`, `DB_PORT`, `USER`, `PASSWORD`, and `DATABASE` in
`databaseDetails.env` (see `databaseDetails.env.example`). The server also
accepts the `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` aliases. Uploaded references are stored privately in
`commission-uploads/`; keep that directory backed up and do not serve it as a
public static directory.

## Store checkout

The checkout is served by the same Node server at `http://localhost:3000/checkout.html`.
Apply the `orders` and `order_items` table definitions from `database.sql` to the
configured database (if `commissions` already exists, apply only those two new
table definitions). Add
products to the bag from `catalog.html`; the server owns the four product prices
and ignores client-supplied prices.

Set `PUBLIC_BASE_URL`, Stripe test credentials (`STRIPE_SECRET_KEY` and
`STRIPE_WEBHOOK_SECRET`), and PayPal sandbox credentials
(`PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`) in `databaseDetails.env`.
Venmo checkout uses the Venmo funding source in PayPal Checkout and requires
PayPal account eligibility and availability in the buyer's region. Configure the
Stripe webhook endpoint as `https://your-domain/api/webhooks/stripe` for
`checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`, and `checkout.session.expired`.

The sandbox defaults are zero tax and zero shipping. Configure
`SALES_TAX_RATE_PERCENT` and `SHIPPING_FEE_CENTS` for your actual pricing before
accepting real payments. Live Stripe and PayPal requests are blocked unless
`ENABLE_LIVE_PAYMENTS=true` and `LIVE_PRICING_CONFIRMED=true` are explicitly set;
then supply the corresponding live provider credentials and HTTPS
`PUBLIC_BASE_URL`. Never commit provider secrets or expose them to the browser.
