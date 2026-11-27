interface Product {
  id: string;
  name: string;
  priceCents: number;
}

interface ProductCatalog {
  products: Product[];
  taxRatePercent: number;
  shippingCents: number;
}

interface CartItem {
  id: string;
  quantity: number;
  selected?: boolean;
}

interface CheckoutProduct extends Product {
  quantity: number;
}

interface PaymentStatusResponse {
  status: 'paid' | 'pending' | 'failed' | 'cancelled';
  message?: string;
}

interface CheckoutResponse {
  redirectUrl?: string;
  sessionId?: string;
  message?: string;
}

const cartKey = 'rinrobou-cart';
const pendingCheckoutKey = 'rinrobou-pending-checkout-items';

const form = document.querySelector<HTMLFormElement>('#checkout-form');
const statusMessage = document.querySelector<HTMLElement>('#checkout-status');
const productsBody = document.querySelector<HTMLTableSectionElement>('#order-items');
const subtotalValue = document.querySelector<HTMLElement>('#subtotal-value');
const taxValue = document.querySelector<HTMLElement>('#tax-value');
const shippingValue = document.querySelector<HTMLElement>('#shipping-value');
const totalValue = document.querySelector<HTMLElement>('#grand-total-value');
const paymentMethodInput = form?.querySelector<HTMLInputElement>('input[name="payment-method"]');
const stripeButton = document.querySelector<HTMLButtonElement>('[data-payment-method="stripe"]');
const submitButton = form?.querySelector<HTMLButtonElement>('.checkout-submit');
let checkoutProducts: CheckoutProduct[] = [];
let productsLoaded = false;
let isVerifyingPayment = false;
let isSubmitting = false;

function displayAmount(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function getCart(): CartItem[] {
  let stored: unknown;
  try {
    stored = JSON.parse(localStorage.getItem(cartKey) ?? '[]');
  } catch {
    return [];
  }
  if (!Array.isArray(stored)) return [];

  const quantities = new Map<string, number>();
  for (const entry of stored) {
    if (typeof entry !== 'object' || entry === null) continue;
    const item = entry as Record<string, unknown>;
    if (
      typeof item.id !== 'string' ||
      !item.id ||
      !Number.isInteger(item.quantity) ||
      Number(item.quantity) < 1 ||
      Number(item.quantity) > 10 ||
      item.selected === false
    ) {
      continue;
    }

    quantities.set(item.id, Math.min(10, (quantities.get(item.id) ?? 0) + Number(item.quantity)));
  }
  return Array.from(quantities, ([id, quantity]) => ({ id, quantity }));
}

function setStatus(message: string): void {
  if (statusMessage) statusMessage.textContent = message;
}

function updateSubmitButton(): void {
  if (submitButton) {
    submitButton.disabled = !productsLoaded || checkoutProducts.length === 0 ||
      paymentMethodInput?.value !== 'stripe' || isVerifyingPayment || isSubmitting;
  }
}

async function readJson<T>(response: Response): Promise<T> {
  try {
    const value: unknown = await response.json();
    return value as T;
  } catch {
    throw new Error('The server returned an invalid response. Please try again later.');
  }
}

function isProductCatalog(value: unknown): value is ProductCatalog {
  if (typeof value !== 'object' || value === null) return false;
  const catalog = value as Record<string, unknown>;
  if (
    !Array.isArray(catalog.products) ||
    typeof catalog.taxRatePercent !== 'number' ||
    !Number.isFinite(catalog.taxRatePercent) ||
    catalog.taxRatePercent < 0 ||
    catalog.taxRatePercent > 100 ||
    typeof catalog.shippingCents !== 'number' ||
    !Number.isInteger(catalog.shippingCents) ||
    catalog.shippingCents < 0
  ) {
    return false;
  }

  return catalog.products.every((product: unknown) => {
    if (typeof product !== 'object' || product === null) return false;
    const candidate = product as Record<string, unknown>;
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.name === 'string' &&
      typeof candidate.priceCents === 'number' &&
      Number.isInteger(candidate.priceCents) &&
      candidate.priceCents >= 0
    );
  });
}

function isPaymentStatusResponse(value: unknown): value is PaymentStatusResponse {
  if (typeof value !== 'object' || value === null) return false;
  const status = (value as Record<string, unknown>).status;
  return status === 'paid' || status === 'pending' || status === 'failed' || status === 'cancelled';
}

function showPaymentResult(): void {
  const params = new URLSearchParams(window.location.search);
  const payment = params.get('payment');

  if (payment === 'cancelled') {
    sessionStorage.removeItem(pendingCheckoutKey);
    setStatus('Payment was cancelled. Your cart is still available to try again.');
    return;
  }
  if (payment === 'error') {
    isVerifyingPayment = true;
    updateSubmitButton();
    sessionStorage.removeItem(pendingCheckoutKey);
    setStatus('We could not verify that payment. Please contact us before trying again.');
    return;
  }
  if (payment === 'success') {
    const sessionId = params.get('session_id');
    if (!sessionId) {
      isVerifyingPayment = true;
      updateSubmitButton();
      setStatus('We could not verify the payment session. Please contact us before trying again.');
      return;
    }
    void verifyPaymentStatus(`/api/checkout/payment-status?session_id=${encodeURIComponent(sessionId)}`);
    return;
  }
}

async function verifyPaymentStatus(url: string): Promise<void> {
  isVerifyingPayment = true;
  updateSubmitButton();
  setStatus('Verifying your payment...');

  try {
    const response = await fetch(url);
    const result = await readJson<PaymentStatusResponse>(response);
    if (!response.ok || !isPaymentStatusResponse(result)) {
      throw new Error(result.message ?? 'Payment status could not be checked.');
    }

    if (result.status === 'paid') {
      try {
        const sessionId = new URL(url, window.location.href).searchParams.get('session_id');
        const completedKey = `rinrobou-completed-payment:${sessionId}`;
        const pending = sessionStorage.getItem(pendingCheckoutKey);
        const pendingCheckout = pending ? JSON.parse(pending) : null;
        const pendingItems: unknown = pendingCheckout?.sessionId === sessionId &&
          !sessionStorage.getItem(completedKey) ? pendingCheckout.items : [];
        const quantities = new Map<string, number>();
        if (Array.isArray(pendingItems)) {
          for (const item of pendingItems) {
            if (typeof item === 'object' && item !== null) {
              const candidate = item as Record<string, unknown>;
              if (typeof candidate.id === 'string' && Number.isInteger(candidate.quantity) && Number(candidate.quantity) > 0) {
                quantities.set(candidate.id, Number(candidate.quantity));
              }
            }
          }
        }
        const currentCart = JSON.parse(localStorage.getItem(cartKey) ?? '[]') as unknown;
        const remaining = Array.isArray(currentCart)
          ? currentCart.flatMap((item) => {
              if (typeof item !== 'object' || item === null) return [];
              const candidate = item as Record<string, unknown>;
              if (typeof candidate.id !== 'string' || !Number.isInteger(candidate.quantity)) return [];
              const quantity = Number(candidate.quantity) - (quantities.get(candidate.id) ?? 0);
              quantities.delete(candidate.id);
              return quantity > 0 ? [{ ...candidate, quantity }] : [];
            })
          : [];
        if (remaining.length > 0) localStorage.setItem(cartKey, JSON.stringify(remaining));
        else localStorage.removeItem(cartKey);
        sessionStorage.setItem(completedKey, 'true');
        sessionStorage.removeItem(pendingCheckoutKey);
      } catch {
        setStatus('Payment completed, but your cart could not be updated. Please review it before ordering again.');
        updateSubmitButton();
        return;
      }
      checkoutProducts = [];
      setStatus('Payment complete. Thank you for your order!');
    } else if (result.status === 'failed' || result.status === 'cancelled') {
      isVerifyingPayment = false;
      setStatus('The payment was not completed. You can try again.');
    } else {
      setStatus('Your payment is processing. Your cart is kept to prevent a duplicate payment.');
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Payment status could not be checked.');
  } finally {
    updateSubmitButton();
  }
}

async function loadProducts(): Promise<void> {
  if (!productsBody || !subtotalValue || !taxValue || !shippingValue || !totalValue) {
    throw new Error('The checkout summary could not be loaded.');
  }

  const response = await fetch('/api/checkout/products');
  const catalog = await readJson<unknown>(response);
  if (!response.ok || !isProductCatalog(catalog)) {
    throw new Error('Products could not be loaded. Please try again later.');
  }

  checkoutProducts = getCart().flatMap((item) => {
    const product = catalog.products.find((candidate) => candidate.id === item.id);
    return product ? [{ ...product, quantity: item.quantity }] : [];
  });
  productsBody.replaceChildren();

  let subtotalCents = 0;
  for (const item of checkoutProducts) {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    const priceCell = document.createElement('td');
    const quantityCell = document.createElement('td');
    const totalCell = document.createElement('td');
    const itemTotal = item.priceCents * item.quantity;
    nameCell.textContent = item.name;
    priceCell.textContent = displayAmount(item.priceCents);
    quantityCell.textContent = String(item.quantity);
    totalCell.textContent = displayAmount(itemTotal);
    row.append(nameCell, priceCell, quantityCell, totalCell);
    productsBody.append(row);
    subtotalCents += itemTotal;
  }

  subtotalValue.textContent = displayAmount(subtotalCents);
  const taxCents = Math.round(subtotalCents * catalog.taxRatePercent / 100);
  taxValue.textContent = displayAmount(taxCents);
  const shippingCents = checkoutProducts.length > 0 ? catalog.shippingCents : 0;
  shippingValue.textContent = displayAmount(shippingCents);
  totalValue.textContent = displayAmount(subtotalCents + taxCents + shippingCents);
  productsLoaded = true;
  updateSubmitButton();

  const paymentResult = new URLSearchParams(window.location.search).get('payment');
  if (checkoutProducts.length === 0 && !paymentResult) {
    setStatus('Your bag is empty. Add items from the catalog before checkout.');
  }
}

stripeButton?.addEventListener('click', () => {
  if (!paymentMethodInput || isVerifyingPayment || isSubmitting) return;
  const selected = paymentMethodInput.value !== 'stripe';
  paymentMethodInput.value = selected ? 'stripe' : '';
  stripeButton.setAttribute('aria-pressed', String(selected));
  updateSubmitButton();
});

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form || !paymentMethodInput) return;
  if (isVerifyingPayment || isSubmitting) return;
  if (!productsLoaded || checkoutProducts.length === 0) {
    setStatus('Your bag is empty or still loading. Add items from the catalog and try again.');
    return;
  }
  if (paymentMethodInput.value !== 'stripe') {
    setStatus('Please select Stripe as your payment method.');
    return;
  }

  isSubmitting = true;
  updateSubmitButton();
  setStatus('Starting secure checkout...');

  try {
    const termsElement = form.querySelector<HTMLInputElement>('[name="terms-accepted"]');
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        'terms-accepted': termsElement?.checked === true,
        items: checkoutProducts.map(({ id, quantity }) => ({ id, quantity })),
      }),
    });
    const result = await readJson<CheckoutResponse>(response);
    if (!response.ok || typeof result.redirectUrl !== 'string' || typeof result.sessionId !== 'string') {
      throw new Error(result.message ?? 'Checkout could not be started.');
    }

    const redirectUrl = new URL(result.redirectUrl, window.location.href);
    if (redirectUrl.protocol !== 'https:' || redirectUrl.hostname !== 'checkout.stripe.com') {
      throw new Error('The payment provider returned an invalid checkout URL.');
    }
    sessionStorage.setItem(pendingCheckoutKey, JSON.stringify({
      sessionId: result.sessionId,
      items: checkoutProducts.map(({ id, quantity }) => ({ id, quantity })),
    }));
    window.location.assign(redirectUrl.href);
  } catch (error) {
    isSubmitting = false;
    setStatus(error instanceof Error ? error.message : 'Checkout could not be started.');
    updateSubmitButton();
  }
});

updateSubmitButton();
void loadProducts().catch((error: unknown) => {
  productsLoaded = false;
  updateSubmitButton();
  setStatus(error instanceof Error ? error.message : 'Products could not be loaded.');
}).finally(showPaymentResult);
