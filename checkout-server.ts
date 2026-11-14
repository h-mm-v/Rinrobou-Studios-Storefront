import express, { Router } from 'express';
import type { Request, Response } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import Stripe from 'stripe';
import { randomUUID } from 'node:crypto';
import { createDatabaseConnection } from './database.ts';

type PaymentMethod = 'stripe' | 'paypal' | 'venmo';

interface Product {
  id: string;
  name: string;
  priceCents: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface ShippingDetails {
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  address: string;
  addressExtra: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface OrderSummary {
  id: string;
  publicId: string;
  amountCents: number;
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
}

interface CheckoutRequestBody {
  email?: unknown;
  phone?: unknown;
  'first-name'?: unknown;
  'last-name'?: unknown;
  address?: unknown;
  'address-extra'?: unknown;
  city?: unknown;
  state?: unknown;
  'postal-code'?: unknown;
  country?: unknown;
  'terms-accepted'?: unknown;
  'payment-method'?: unknown;
  items?: unknown;
}

interface OrderRow extends RowDataPacket {
  id: string;
  public_id: string;
  payment_method: PaymentMethod;
  provider_order_id: string | null;
  payment_status: string;
}

interface PaymentStatusRow extends RowDataPacket {
  payment_method: PaymentMethod;
  payment_status: string;
}

interface PaypalOrder {
  id: string;
  status: string;
  links?: Array<{ href: string; rel: string }>;
}

const products: Product[] = [
  { id: 'donut-float-chibi', name: 'Donut Float Chibi', priceCents: 2500 },
  { id: 'butler-mage-polaroid', name: 'Butler & Mage Polaroid', priceCents: 5500 },
  { id: 'halloween-costume-chibi', name: 'Halloween Costume Chibi', priceCents: 2500 },
  { id: 'pokemon-onesies-chibi', name: 'Pokemon Onesies Chibi', priceCents: 2500 },
];
const productById = new Map(products.map((product) => [product.id, product]));
const router = Router();
const currency = 'USD';

function getPublicBaseUrl(): string {
  const value = process.env.PUBLIC_BASE_URL?.trim();
  if (!value) {
    throw new Error('Set PUBLIC_BASE_URL in databaseDetails.env before enabling checkout.');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('PUBLIC_BASE_URL must be a valid http or https URL.');
  }
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) {
    throw new Error('PUBLIC_BASE_URL must be a valid http or https URL without credentials.');
  }
  const liveCredentials =
    process.env.PAYPAL_ENV === 'live' || process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') === true;
  if (liveCredentials && url.protocol !== 'https:') {
    throw new Error('PUBLIC_BASE_URL must use HTTPS for live payments.');
  }
  return url.origin;
}

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error('Stripe checkout is not configured. Set STRIPE_SECRET_KEY in databaseDetails.env.');
  }
  if (key.startsWith('sk_live_') &&
      (process.env.ENABLE_LIVE_PAYMENTS !== 'true' || process.env.LIVE_PRICING_CONFIRMED !== 'true')) {
    throw new Error('Live payments are disabled. Explicitly confirm live tax and shipping settings first.');
  }
  return new Stripe(key);
}

function getPaypalSettings(): { baseUrl: string; clientId: string; clientSecret: string } {
  const environment = process.env.PAYPAL_ENV?.trim() || 'sandbox';
  if (environment !== 'sandbox' && environment !== 'live') {
    throw new Error('PAYPAL_ENV must be sandbox or live.');
  }
  if (environment === 'live' &&
      (process.env.ENABLE_LIVE_PAYMENTS !== 'true' || process.env.LIVE_PRICING_CONFIRMED !== 'true')) {
    throw new Error('Live payments are disabled. Explicitly confirm live tax and shipping settings first.');
  }
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('PayPal checkout is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.');
  }
  const baseUrl =
    environment === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  return { baseUrl, clientId, clientSecret };
}

function getTaxAndShipping(subtotalCents: number): {
  taxCents: number;
  taxRate: number;
  shippingCents: number;
} {
  const taxRate = Number(process.env.SALES_TAX_RATE_PERCENT ?? '0');
  const shippingCents = Number(process.env.SHIPPING_FEE_CENTS ?? '0');
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
    throw new Error('SALES_TAX_RATE_PERCENT must be between 0 and 100.');
  }
  if (!Number.isInteger(shippingCents) || shippingCents < 0) {
    throw new Error('SHIPPING_FEE_CENTS must be a non-negative integer.');
  }
  return { taxCents: Math.round(subtotalCents * taxRate / 100), taxRate, shippingCents };
}

function validateShipping(body: CheckoutRequestBody): ShippingDetails | null {
  const email = String(body.email ?? '').trim();
  const phone = String(body.phone ?? '').trim();
  const firstName = String(body['first-name'] ?? '').trim();
  const lastName = String(body['last-name'] ?? '').trim();
  const address = String(body.address ?? '').trim();
  const addressExtra = String(body['address-extra'] ?? '').trim();
  const city = String(body.city ?? '').trim();
  const state = String(body.state ?? '').trim();
  const postalCode = String(body['postal-code'] ?? '').trim();
  const country = String(body.country ?? '').trim().toUpperCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return null;
  if (phone.length > 40 || !firstName || firstName.length > 100 || !lastName || lastName.length > 100) return null;
  if (!address || address.length > 255 || addressExtra.length > 255) return null;
  if (!city || city.length > 100 || !state || state.length > 100 || !postalCode || postalCode.length > 20) return null;
  if (!/^[A-Z]{2}$/.test(country)) return null;

  return {
    email,
    phone: phone || null,
    firstName,
    lastName,
    address,
    addressExtra: addressExtra || null,
    city,
    state,
    postalCode,
    country,
  };
}

function validateItems(value: unknown): CartItem[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > products.length) return null;

  const seen = new Set<string>();
  const items: CartItem[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) return null;
    const item = entry as Record<string, unknown>;
    const id = typeof item.id === 'string' ? item.id : '';
    const quantity = item.quantity;
    const product = productById.get(id);
    if (!product || !Number.isInteger(quantity) || Number(quantity) < 1 || Number(quantity) > 10 || seen.has(id)) {
      return null;
    }
    seen.add(id);
    items.push({ product, quantity: Number(quantity) });
  }
  return items;
}

function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

async function createOrder(
  shipping: ShippingDetails,
  items: CartItem[],
  method: PaymentMethod,
): Promise<OrderSummary> {
  const subtotalCents = items.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);
  const { taxCents, shippingCents } = getTaxAndShipping(subtotalCents);
  const amountCents = subtotalCents + taxCents + shippingCents;
  const publicId = randomUUID();
  const connection = await createDatabaseConnection();

  try {
    await connection.beginTransaction();
    const [orderResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO orders (
        public_id, email, phone, first_name, last_name, shipping_address, shipping_address_extra,
        shipping_city, shipping_state, shipping_postal_code, shipping_country,
        payment_method, currency, subtotal_cents, tax_cents, shipping_cents, amount_cents, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        publicId,
        shipping.email,
        shipping.phone,
        shipping.firstName,
        shipping.lastName,
        shipping.address,
        shipping.addressExtra,
        shipping.city,
        shipping.state,
        shipping.postalCode,
        shipping.country,
        method,
        currency,
        subtotalCents,
        taxCents,
        shippingCents,
        amountCents,
      ],
    );
    const orderId = String(orderResult.insertId);
    for (const item of items) {
      await connection.execute(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price_cents, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.product.id, item.product.name, item.product.priceCents, item.quantity],
      );
    }
    await connection.commit();
    return { id: orderId, publicId, amountCents, subtotalCents, taxCents, shippingCents };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

async function setProviderOrder(orderId: string, providerId: string): Promise<void> {
  const connection = await createDatabaseConnection();
  try {
    await connection.execute('UPDATE orders SET provider_order_id = ? WHERE id = ?', [providerId, orderId]);
  } finally {
    await connection.end();
  }
}

async function setPaymentStatus(
  providerId: string,
  method: PaymentMethod,
  status: 'paid' | 'failed',
): Promise<void> {
  const connection = await createDatabaseConnection();
  try {
    await connection.execute(
      `UPDATE orders SET payment_status = ?
       WHERE payment_method = ? AND provider_order_id = ? AND payment_status = 'pending'`,
      [status, method, providerId],
    );
  } finally {
    await connection.end();
  }
}

async function getPaypalAccessToken(settings: ReturnType<typeof getPaypalSettings>): Promise<string> {
  const response = await fetch(`${settings.baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${settings.clientId}:${settings.clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!response.ok) {
    throw new Error(`PayPal authentication failed with status ${response.status}.`);
  }
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('PayPal did not return an access token.');
  return data.access_token;
}

async function paypalRequest<T>(
  settings: ReturnType<typeof getPaypalSettings>,
  accessToken: string,
  endpoint: string,
  method: 'POST' | 'GET',
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${settings.baseUrl}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    throw new Error(`PayPal request failed with status ${response.status}.`);
  }
  return (await response.json()) as T;
}

async function beginPaypalCheckout(
  order: OrderSummary,
  shipping: ShippingDetails,
  items: CartItem[],
  method: 'paypal' | 'venmo',
): Promise<string> {
  const baseUrl = getPublicBaseUrl();
  const settings = getPaypalSettings();
  const accessToken = await getPaypalAccessToken(settings);
  const returnUrl = `${baseUrl}/api/checkout/paypal/return?order_id=${encodeURIComponent(order.publicId)}`;
  const cancelUrl = `${baseUrl}/checkout.html?payment=cancelled`;
  const paymentSource = method === 'venmo'
    ? {
        venmo: {
          experience_context: {
            brand_name: 'Rinrobou Studios',
            shipping_preference: 'SET_PROVIDED_ADDRESS',
            user_action: 'PAY_NOW',
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        },
      }
    : {
        paypal: {
          experience_context: {
            brand_name: 'Rinrobou Studios',
            shipping_preference: 'SET_PROVIDED_ADDRESS',
            user_action: 'PAY_NOW',
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        },
      };
  const paypalOrder = await paypalRequest<PaypalOrder>(settings, accessToken, '/v2/checkout/orders', 'POST', {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: order.publicId,
        custom_id: order.publicId,
        amount: {
          currency_code: currency,
          value: formatAmount(order.amountCents),
          breakdown: {
            item_total: { currency_code: currency, value: formatAmount(order.subtotalCents) },
            ...(order.taxCents > 0
              ? { tax_total: { currency_code: currency, value: formatAmount(order.taxCents) } }
              : {}),
            ...(order.shippingCents > 0
              ? { shipping: { currency_code: currency, value: formatAmount(order.shippingCents) } }
              : {}),
          },
        },
        items: items.map(({ product, quantity }) => ({
          name: product.name,
          quantity: String(quantity),
          unit_amount: { currency_code: currency, value: formatAmount(product.priceCents) },
        })),
        shipping: {
          name: { full_name: `${shipping.firstName} ${shipping.lastName}` },
          address: {
            address_line_1: shipping.address,
            ...(shipping.addressExtra ? { address_line_2: shipping.addressExtra } : {}),
            admin_area_2: shipping.city,
            admin_area_1: shipping.state,
            postal_code: shipping.postalCode,
            country_code: shipping.country,
          },
        },
      },
    ],
    payment_source: paymentSource,
  });
  const actionLink = paypalOrder.links?.find((link) => link.rel === 'payer-action' || link.rel === 'approve');
  if (!paypalOrder.id || !actionLink?.href) {
    throw new Error('PayPal did not return a payment approval URL.');
  }
  await setProviderOrder(order.id, paypalOrder.id);
  return actionLink.href;
}

async function markPaypalOrderPaid(publicId: string, providerId: string): Promise<'paid' | 'pending' | 'invalid'> {
  const connection = await createDatabaseConnection();
  let order: OrderRow | undefined;
  try {
    const [rows] = await connection.execute<OrderRow[]>(
      `SELECT id, public_id, payment_method, provider_order_id, payment_status
       FROM orders WHERE public_id = ? LIMIT 1`,
      [publicId],
    );
    order = rows[0];
  } finally {
    await connection.end();
  }

  if (!order || (order.payment_method !== 'paypal' && order.payment_method !== 'venmo') ||
      order.provider_order_id !== providerId) {
    return 'invalid';
  }
  if (order.payment_status === 'paid') return 'paid';

  const settings = getPaypalSettings();
  const accessToken = await getPaypalAccessToken(settings);
  const paypalOrder = await paypalRequest<PaypalOrder>(
    settings,
    accessToken,
    `/v2/checkout/orders/${encodeURIComponent(providerId)}`,
    'GET',
  );
  if (paypalOrder.status === 'COMPLETED') {
    await setPaymentStatus(providerId, order.payment_method, 'paid');
    return 'paid';
  }
  if (paypalOrder.status !== 'APPROVED') return 'pending';

  const capture = await paypalRequest<{ status?: string }>(
    settings,
    accessToken,
    `/v2/checkout/orders/${encodeURIComponent(providerId)}/capture`,
    'POST',
  );
  if (capture.status === 'COMPLETED') {
    await setPaymentStatus(providerId, order.payment_method, 'paid');
    return 'paid';
  }
  return 'pending';
}

router.get('/api/checkout/products', (_request, response) => {
  const { taxRate, shippingCents } = getTaxAndShipping(0);
  response.json({
    products: products.map(({ id, name, priceCents }) => ({ id, name, priceCents })),
    taxRatePercent: taxRate,
    shippingCents,
  });
});

router.post('/api/checkout', express.json({ limit: '16kb' }), async (request: Request, response: Response) => {
  const body = request.body as CheckoutRequestBody;
  const shipping = validateShipping(body);
  const items = validateItems(body.items);
  const method = body['payment-method'];
  if (!shipping || !items || body['terms-accepted'] !== true ||
      (method !== 'stripe' && method !== 'paypal' && method !== 'venmo')) {
    response.status(400).json({ message: 'Check your contact, shipping, cart, payment method, and terms details.' });
    return;
  }

  try {
    getPublicBaseUrl();
    if (method === 'stripe') getStripe();
    else getPaypalSettings();

    const order = await createOrder(shipping, items, method);
    let redirectUrl: string;
    try {
      if (method === 'stripe') {
        const stripe = getStripe();
        const lineItems = items.map(({ product, quantity }) => ({
          quantity,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: product.priceCents,
            product_data: { name: product.name },
          },
        }));
        if (order.taxCents > 0) {
          lineItems.push({
            quantity: 1,
            price_data: {
              currency: currency.toLowerCase(),
              unit_amount: order.taxCents,
              product_data: { name: 'Sales tax' },
            },
          });
        }
        if (order.shippingCents > 0) {
          lineItems.push({
            quantity: 1,
            price_data: {
              currency: currency.toLowerCase(),
              unit_amount: order.shippingCents,
              product_data: { name: 'Shipping' },
            },
          });
        }
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          customer_email: shipping.email,
          line_items: lineItems,
          success_url: `${getPublicBaseUrl()}/checkout.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${getPublicBaseUrl()}/checkout.html?payment=cancelled`,
          metadata: { orderId: order.id },
          payment_intent_data: { metadata: { orderId: order.id } },
        });
        if (!session.url) throw new Error('Stripe did not return a checkout URL.');
        await setProviderOrder(order.id, session.id);
        redirectUrl = session.url;
      } else {
        redirectUrl = await beginPaypalCheckout(order, shipping, items, method);
      }
    } catch (error) {
      console.error(`Failed to start ${method} checkout:`, error);
      const connection = await createDatabaseConnection();
      try {
        await connection.execute(
          "UPDATE orders SET payment_status = 'failed' WHERE id = ? AND payment_status = 'pending'",
          [order.id],
        );
      } finally {
        await connection.end();
      }
      response.status(502).json({ message: 'The payment provider could not start checkout. Please try again.' });
      return;
    }

    response.status(201).json({ redirectUrl });
  } catch (error) {
    console.error('Failed to create checkout:', error);
    response.status(500).json({ message: 'Checkout could not be started. Please try again later.' });
  }
});

router.get('/api/checkout/paypal/return', async (request, response) => {
  const publicId = typeof request.query.order_id === 'string' ? request.query.order_id : '';
  const providerId = typeof request.query.token === 'string' ? request.query.token : '';
  if (!publicId || !providerId) {
    response.redirect('/checkout.html?payment=error');
    return;
  }

  try {
    const status = await markPaypalOrderPaid(publicId, providerId);
    if (status === 'invalid') {
      response.redirect('/checkout.html?payment=error');
      return;
    }
    response.redirect(`/checkout.html?payment=${status}&order_id=${encodeURIComponent(publicId)}`);
  } catch (error) {
    console.error('Failed to capture PayPal/Venmo order:', error);
    response.redirect('/checkout.html?payment=pending');
  }
});

router.get('/api/checkout/payment-status', async (request, response) => {
  const publicOrderId = typeof request.query.order_id === 'string' ? request.query.order_id : '';
  if (publicOrderId) {
    if (publicOrderId.length !== 36) {
      response.status(400).json({ message: 'Invalid order identifier.' });
      return;
    }
    try {
      const connection = await createDatabaseConnection();
      let order: PaymentStatusRow | undefined;
      try {
        const [rows] = await connection.execute<PaymentStatusRow[]>(
          'SELECT payment_method, payment_status FROM orders WHERE public_id = ? LIMIT 1',
          [publicOrderId],
        );
        order = rows[0];
      } finally {
        await connection.end();
      }
      if (!order || (order.payment_method !== 'paypal' && order.payment_method !== 'venmo')) {
        response.status(404).json({ message: 'Order not found.' });
        return;
      }
      response.json({ status: order.payment_status });
    } catch (error) {
      console.error('Failed to check PayPal/Venmo payment status:', error);
      response.status(500).json({ message: 'Payment status is not available yet.' });
    }
    return;
  }

  const sessionId = typeof request.query.session_id === 'string' ? request.query.session_id : '';
  if (!sessionId || sessionId.length > 255) {
    response.status(400).json({ message: 'Invalid payment session.' });
    return;
  }
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const orderId = session.metadata?.orderId;
    if (!orderId) {
      response.status(404).json({ message: 'Order not found.' });
      return;
    }
    if (session.payment_status === 'paid') {
      await setPaymentStatus(session.id, 'stripe', 'paid');
      response.json({ status: 'paid' });
      return;
    }
    response.json({ status: 'pending' });
  } catch (error) {
    console.error('Failed to check Stripe payment status:', error);
    response.status(502).json({ message: 'Payment status is not available yet.' });
  }
});

router.post('/api/webhooks/stripe', express.raw({ type: 'application/json', limit: '1mb' }), async (request, response) => {
  const signature = request.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (typeof signature !== 'string' || !webhookSecret || !Buffer.isBuffer(request.body)) {
    response.status(400).send('Invalid webhook request.');
    return;
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(request.body, signature, webhookSecret);
  } catch {
    response.status(400).send('Invalid webhook signature.');
    return;
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === 'paid') {
        await setPaymentStatus(session.id, 'stripe', 'paid');
      }
    } else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await setPaymentStatus(session.id, 'stripe', 'failed');
    }
    response.sendStatus(200);
  } catch (error) {
    console.error('Failed to process Stripe webhook:', error);
    response.sendStatus(500);
  }
});

export { router as checkoutRouter };
