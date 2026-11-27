import express, { Router } from 'express';
import type { Request, Response } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import Stripe from 'stripe';
import { randomUUID } from 'node:crypto';
import { createDatabaseConnection } from '../database.ts';

type PaymentMethod = 'stripe';

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

type ShippingValidationResult =
  | { valid: true; shipping: ShippingDetails }
  | { valid: false; message: string };

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

const products: Product[] = [
  { id: 'donut-float-chibi', name: 'Donut Float Chibi', priceCents: 2500 },
  { id: 'butler-mage-polaroid', name: 'Butler & Mage Polaroid', priceCents: 5500 },
  { id: 'halloween-costume-chibi', name: 'Halloween Costume Chibi', priceCents: 2500 },
  { id: 'pokemon-onesies-chibi', name: 'Pokemon Onesies Chibi', priceCents: 2500 },
];
const productById = new Map(products.map((product) => [product.id, product]));
const router = Router();

export async function initializeCheckoutStorage(): Promise<void> {
  const connection = await createDatabaseConnection();

  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id CHAR(36) NOT NULL,
        email VARCHAR(254) NOT NULL,
        phone VARCHAR(40) NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        shipping_address VARCHAR(255) NOT NULL,
        shipping_address_extra VARCHAR(255) NULL,
        shipping_city VARCHAR(100) NOT NULL,
        shipping_state VARCHAR(100) NOT NULL,
        shipping_postal_code VARCHAR(20) NOT NULL,
        shipping_country CHAR(2) NOT NULL,
        payment_method ENUM('stripe') NOT NULL,
        provider_order_id VARCHAR(255) NULL,
        currency CHAR(3) NOT NULL,
        subtotal_cents BIGINT UNSIGNED NOT NULL,
        tax_cents BIGINT UNSIGNED NOT NULL,
        shipping_cents BIGINT UNSIGNED NOT NULL,
        amount_cents BIGINT UNSIGNED NOT NULL,
        payment_status ENUM('pending', 'paid', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_orders_public_id (public_id),
        KEY idx_orders_payment_provider (payment_method, provider_order_id),
        KEY idx_orders_email_created (email, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        order_id BIGINT UNSIGNED NOT NULL,
        product_id VARCHAR(100) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        unit_price_cents BIGINT UNSIGNED NOT NULL,
        quantity TINYINT UNSIGNED NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_products_order_id (order_id),
        CONSTRAINT fk_products_order
          FOREIGN KEY (order_id) REFERENCES orders (id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } finally {
    await connection.end();
  }
}
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
  const liveCredentials = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') === true;
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

function validateShipping(body: CheckoutRequestBody): ShippingValidationResult {
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

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { valid: false, message: 'Enter a valid email address.' };
  }
  if (phone.length > 40) {
    return { valid: false, message: 'Phone number must be 40 characters or fewer.' };
  }
  if (!firstName || firstName.length > 100 || !lastName || lastName.length > 100) {
    return { valid: false, message: 'Enter both first and last names (100 characters max each).' };
  }
  if (!address || address.length > 255 || addressExtra.length > 255) {
    return { valid: false, message: 'Enter a street address; apartment/unit must be 255 characters or fewer.' };
  }
  if (!city || city.length > 100 || !state || state.length > 100 || !postalCode || postalCode.length > 20) {
    return { valid: false, message: 'Enter a city, state, and postal code within the allowed lengths.' };
  }
  if (!/^[A-Z]{2}$/.test(country)) {
    return { valid: false, message: 'Enter a two-letter country code, such as US.' };
  }

  return {
    valid: true,
    shipping: {
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
    },
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
        `INSERT INTO products (order_id, product_id, product_name, unit_price_cents, quantity)
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
  const shippingValidation = validateShipping(body);
  const items = validateItems(body.items);
  const method = body['payment-method'];
  if (!shippingValidation.valid) {
    response.status(400).json({ message: shippingValidation.message });
    return;
  }
  if (!items) {
    response.status(400).json({ message: 'Your cart is empty or contains an invalid item or quantity. Refresh your cart and try again.' });
    return;
  }
  if (body['terms-accepted'] !== true) {
    response.status(400).json({ message: 'Accept the Terms of Service to continue.' });
    return;
  }
  if (method !== 'stripe') {
    response.status(400).json({ message: 'Select Stripe to continue.' });
    return;
  }

  const shipping = shippingValidation.shipping;
  try {
    getPublicBaseUrl();
    getStripe();

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
          success_url: `${getPublicBaseUrl()}/checkout/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${getPublicBaseUrl()}/checkout/?payment=cancelled`,
          metadata: { orderId: order.id },
          payment_intent_data: { metadata: { orderId: order.id } },
        });
        if (!session.url) throw new Error('Stripe did not return a checkout URL.');
        await setProviderOrder(order.id, session.id);
        redirectUrl = session.url;
      } else {
        throw new Error('Unsupported payment method.');
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

router.get('/api/checkout/payment-status', async (request, response) => {
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
