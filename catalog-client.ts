const cartKey = 'rinrobou-cart';

function readCart() {
  try {
    const value = JSON.parse(localStorage.getItem(cartKey) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        item.quantity <= 10,
    );
  } catch {
    return [];
  }
}

function saveCart(items) {
  localStorage.setItem(cartKey, JSON.stringify(items));
}

const buttons = document.querySelectorAll('[data-product-id]');
for (const button of buttons) {
  button.addEventListener('click', () => {
    const productId = button.dataset.productId;
    if (!productId) return;

    const cart = readCart();
    const currentItem = cart.find((item) => item.id === productId);
    if (currentItem) {
      if (currentItem.quantity >= 10) return;
      currentItem.quantity += 1;
    } else {
      cart.push({ id: productId, quantity: 1 });
    }
    saveCart(cart);

    const status = document.querySelector('#cart-status');
    if (status) status.textContent = `${button.dataset.productName ?? 'Item'} added to your bag.`;
    button.textContent = 'ADDED TO BAG';
    window.setTimeout(() => {
      button.textContent = 'ADD TO BAG';
    }, 1500);
  });
}
