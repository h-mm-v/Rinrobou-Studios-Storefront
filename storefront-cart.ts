interface CartProduct {
  id: string;
  name: string;
  priceCents: number;
}

interface ProductCatalog {
  products: CartProduct[];
}

interface CartItem {
  id: string;
  quantity: number;
  selected: boolean;
}

const cartKey = 'rinrobou-cart';
const cartStatus = document.querySelector<HTMLElement>('#cart-status');
const catalogButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-product-id]')];
let cartStatusTimer: ReturnType<typeof setTimeout> | undefined;
let cartStatusHideTimer: ReturnType<typeof setTimeout> | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readCart(): CartItem[] {
  let value: unknown;
  try {
    const stored = localStorage.getItem(cartKey);
    value = stored === null ? [] : JSON.parse(stored);
  } catch {
    throw new Error('Your saved cart could not be read. Clear your browser storage and try again.');
  }
  if (!Array.isArray(value)) {
    throw new Error('Your saved cart is invalid. Clear your browser storage and try again.');
  }

  const items = new Map<string, CartItem>();
  for (const candidate of value) {
    if (!isRecord(candidate) || typeof candidate.id !== 'string' ||
        !Number.isInteger(candidate.quantity) || Number(candidate.quantity) < 1 ||
        Number(candidate.quantity) > 10) {
      continue;
    }

    const selected = candidate.selected !== false;
    const existing = items.get(candidate.id);
    if (existing) {
      existing.quantity = Math.min(10, existing.quantity + Number(candidate.quantity));
      existing.selected ||= selected;
    } else {
      items.set(candidate.id, {
        id: candidate.id,
        quantity: Number(candidate.quantity),
        selected,
      });
    }
  }
  return [...items.values()];
}

function saveCart(items: CartItem[]): void {
  try {
    localStorage.setItem(cartKey, JSON.stringify(items));
  } catch {
    throw new Error('Your cart could not be saved. Check your browser storage and try again.');
  }
}

async function loadCatalog(): Promise<ProductCatalog> {
  const response = await fetch('/api/checkout/products');
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error('The product catalog could not be read. Please try again later.');
  }
  if (!response.ok || !isRecord(result) || !Array.isArray(result.products) ||
      !result.products.every((product) => isRecord(product) &&
        typeof product.id === 'string' &&
        typeof product.name === 'string' &&
        typeof product.priceCents === 'number' &&
        Number.isInteger(product.priceCents) &&
        product.priceCents >= 0)) {
    throw new Error('The product catalog could not be loaded. Please try again later.');
  }
  return { products: result.products as CartProduct[] };
}

function displayAmount(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function showCatalogStatus(message: string, isError = false): void {
  if (!cartStatus) return;

  if (cartStatusTimer) clearTimeout(cartStatusTimer);
  if (cartStatusHideTimer) clearTimeout(cartStatusHideTimer);
  cartStatus.textContent = message;
  cartStatus.classList.toggle('is-error', isError);
  cartStatus.hidden = false;
  requestAnimationFrame(() => cartStatus.classList.add('is-visible'));

  cartStatusTimer = setTimeout(() => {
    cartStatus.classList.remove('is-visible');
    cartStatusHideTimer = setTimeout(() => {
      cartStatus.hidden = true;
    }, 200);
  }, isError ? 6000 : 3200);
}

for (const button of catalogButtons) {
  const productId = button.dataset.productId;
  const productName = button.dataset.productName?.trim();
  if (!productId || !productName) {
    button.disabled = true;
    continue;
  }

  button.addEventListener('click', () => {
    try {
      const cart = readCart();
      const existing = cart.find((item) => item.id === productId);
      if (existing) {
        if (existing.quantity === 10) {
          showCatalogStatus(`Your bag already contains the maximum of 10 for ${productName}.`, true);
          return;
        }
        existing.quantity += 1;
        existing.selected = true;
      } else {
        cart.push({ id: productId, quantity: 1, selected: true });
      }
      saveCart(cart);
      showCatalogStatus(`${productName} added to your bag.`);
    } catch (error) {
      showCatalogStatus(error instanceof Error ? error.message : 'The item could not be added.', true);
    }
  });
}

const cartItemsContainer = document.querySelector<HTMLElement>('#cart-items');
if (cartItemsContainer) {
  const cartItems = cartItemsContainer;
  const selectAll = document.querySelector<HTMLInputElement>('#select-all-cart-items');
  const checkoutForm = document.querySelector<HTMLFormElement>('#cart-checkout-form');
  const checkoutButton = checkoutForm?.querySelector<HTMLButtonElement>('[type="submit"]');
  const subtotalElement = document.querySelector<HTMLElement>('#cart-subtotal');
  const countElement = document.querySelector<HTMLElement>('#cart-item-count');
  const statusElement = document.querySelector<HTMLElement>('#cart-page-status');

  function setCartStatus(message: string): void {
    if (statusElement) statusElement.textContent = message;
  }

  const productImages: Record<string, string> = {
    'donut-float-chibi': '/src/assets/donut-float.png',
    'butler-mage-polaroid': '/src/assets/butler-mage.png',
    'halloween-costume-chibi': '/src/assets/halloween-chibi.png',
    'pokemon-onesies-chibi': '/src/assets/valentines-chibi.png',
  };

  function renderCart(catalog: ProductCatalog): void {
    try {
      const cart = readCart();
      const productsById = new Map(catalog.products.map((product) => [product.id, product]));
      const validItems = cart.filter((item) => productsById.has(item.id));
      if (validItems.length !== cart.length) saveCart(validItems);

      cartItems.replaceChildren();
      let subtotalCents = 0;
      let selectedQuantity = 0;

      for (const item of validItems) {
        const product = productsById.get(item.id);
        if (!product) continue;

        const row = document.createElement('article');
        row.className = 'cart-item';

        const selection = document.createElement('div');
        selection.className = 'cart-item-selection';
        const label = document.createElement('label');
        const selected = document.createElement('input');
        selected.type = 'checkbox';
        selected.checked = item.selected;
        selected.setAttribute('aria-label', `Select ${product.name}`);
        label.append(selected);
        selection.append(label);

        const image = document.createElement('img');
        image.className = 'cart-item-image';
        image.src = productImages[product.id] ?? '/src/assets/logo-small.png';
        image.alt = product.name;

        const details = document.createElement('div');
        details.className = 'cart-item-details';
        const name = document.createElement('h2');
        name.textContent = product.name;
        details.append(name);

        const actions = document.createElement('div');
        actions.className = 'cart-item-actions';
        const quantityLabel = document.createElement('label');
        quantityLabel.className = 'cart-item-quantity';
        const quantityText = document.createElement('span');
        quantityText.textContent = 'Quantity';

        const quantity = document.createElement('input');
        quantity.type = 'number';
        quantity.min = '1';
        quantity.max = '10';
        quantity.step = '1';
        quantity.value = String(item.quantity);
        quantity.setAttribute('aria-label', `Quantity for ${product.name}`);
        quantityLabel.append(quantityText, quantity);

        const pricing = document.createElement('div');
        pricing.className = 'cart-item-pricing';
        const calculation = document.createElement('span');
        calculation.textContent = `${displayAmount(product.priceCents)} × ${item.quantity} =`;
        const lineTotal = document.createElement('strong');
        lineTotal.className = 'cart-item-line-total';
        lineTotal.textContent = displayAmount(product.priceCents * item.quantity);
        pricing.append(calculation, lineTotal);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'cart-item-remove';
        remove.textContent = 'Remove';
        remove.setAttribute('aria-label', `Remove ${product.name} from your cart`);
        actions.append(quantityLabel, pricing, remove);

        row.append(selection, image, details, actions);
        cartItems.append(row);

        if (item.selected) {
          subtotalCents += product.priceCents * item.quantity;
          selectedQuantity += item.quantity;
        }

        selected.addEventListener('change', () => {
          item.selected = selected.checked;
          try {
            saveCart(validItems);
            renderCart(catalog);
          } catch (error) {
            setCartStatus(error instanceof Error ? error.message : 'Your cart could not be saved.');
          }
        });

        quantity.addEventListener('change', () => {
          const nextQuantity = Number(quantity.value);
          if (!Number.isInteger(nextQuantity) || nextQuantity < 1 || nextQuantity > 10) {
            setCartStatus('Choose a quantity between 1 and 10.');
            quantity.value = String(item.quantity);
            return;
          }
          item.quantity = nextQuantity;
          try {
            saveCart(validItems);
            renderCart(catalog);
          } catch (error) {
            setCartStatus(error instanceof Error ? error.message : 'Your cart could not be saved.');
          }
        });

        remove.addEventListener('click', () => {
          try {
            saveCart(validItems.filter((cartItem) => cartItem.id !== item.id));
            renderCart(catalog);
          } catch (error) {
            setCartStatus(error instanceof Error ? error.message : 'The item could not be removed.');
          }
        });
      }

      const allSelected = validItems.length > 0 && validItems.every((item) => item.selected);
      if (selectAll) {
        selectAll.disabled = validItems.length === 0;
        selectAll.checked = allSelected;
        selectAll.indeterminate = !allSelected && validItems.some((item) => item.selected);
      }
      if (subtotalElement) subtotalElement.textContent = displayAmount(subtotalCents);
      if (countElement) countElement.textContent = String(selectedQuantity);
      if (checkoutButton) checkoutButton.disabled = selectedQuantity === 0;
      setCartStatus(validItems.length === 0 ? 'Your bag is empty. Add items from the catalog.' : '');
    } catch (error) {
      if (checkoutButton) checkoutButton.disabled = true;
      setCartStatus(error instanceof Error ? error.message : 'Your cart could not be loaded.');
    }
  }

  void loadCatalog().then((catalog) => {
    renderCart(catalog);
    selectAll?.addEventListener('change', () => {
      try {
        const updated = readCart().map((item) => ({ ...item, selected: selectAll.checked }));
        saveCart(updated);
        renderCart(catalog);
      } catch (error) {
        setCartStatus(error instanceof Error ? error.message : 'Your cart could not be saved.');
      }
    });
    window.addEventListener('storage', (event) => {
      if (event.key === cartKey || event.key === null) renderCart(catalog);
    });
    window.addEventListener('pageshow', () => renderCart(catalog));
  }).catch((error: unknown) => {
    if (checkoutButton) checkoutButton.disabled = true;
    setCartStatus(error instanceof Error ? error.message : 'The product catalog could not be loaded.');
  });

  checkoutForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      if (!checkoutForm.reportValidity()) return;
      if (!readCart().some((item) => item.selected)) {
        setCartStatus('Select at least one item before checkout.');
        return;
      }
      window.location.assign('/checkout/');
    } catch (error) {
      setCartStatus(error instanceof Error ? error.message : 'Checkout could not be opened.');
    }
  });
}
