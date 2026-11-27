//Defines the info each cart item contains
type CartItem = {
    id: number;
    name: string;
    price: number;
    quantity: number;
    selected: boolean;
};

//the array of the cart items
let items: CartItem[] = [
    { id: 1, name: "Example item", price: 10, quantity: 3, selected: true }
];

const cartList = document.querySelector<HTMLUListElement>("#cart-items")!;
const selectAll = document.querySelector<HTMLInputElement>("#select-all")!;
const itemCount = document.querySelector<HTMLSpanElement>("#item-amt")!;
const subtotalDisplay = document.querySelector<HTMLSpanElement>("#sub-cost")!;
const checkoutForm =
    document.querySelector<HTMLFormElement>("#checkout-form")!;


//rebuilds the displayed cart using current items
function renderCart(): void {
    cartList.replaceChildren();

    for (const item of items) {
        const row = document.createElement("li");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = item.selected;
        checkbox.dataset.id = String(item.id);
        checkbox.setAttribute("aria-label", `Select ${item.name}`);

        const details = document.createElement("span");
        details.textContent =
            ` ${item.name} — $${item.price.toFixed(2)} × ${item.quantity} `;

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.dataset.action = "edit";
        editButton.dataset.id = String(item.id);

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.textContent = "Remove";
        removeButton.dataset.action = "remove";
        removeButton.dataset.id = String(item.id);

        row.append(checkbox, details, editButton, removeButton);
        cartList.append(row);
    }

    const selectedItems = items.filter((item) => item.selected);
    const count = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = selectedItems.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    itemCount.textContent = String(count);
    subtotalDisplay.textContent = subtotal.toFixed(2);
    selectAll.checked = items.length > 0 && items.every((item) => item.selected);
}

//Select or deselect every item when "Select all" changes
selectAll.addEventListener("change", () => {
    for (const item of items) {
        item.selected = selectAll.checked;
    }
    renderCart();
});


//Listen on the list for changes from the item checkboxes inside it
cartList.addEventListener("change", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement) || !target.dataset.id) return;

    const item = items.find((cartItem) => cartItem.id === Number(target.dataset.id));
    if (item) {
        item.selected = target.checked;
        renderCart();
    }
});

//Handles the clicks on Edit and Remove buttons inside the cart list
cartList.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLButtonElement)) return;

    const id = Number(target.dataset.id);
    const item = items.find((cartItem) => cartItem.id === id);
    if (!item) return;

    if (target.dataset.action === "remove") {
        items = items.filter((cartItem) => cartItem.id !== id);
    }

    if (target.dataset.action === "edit") {
        const newName = prompt("Item name:", item.name);
        if (newName === null || !newName.trim()) return;

        const newPriceText = prompt("Item price:", String(item.price));
        if (newPriceText === null) return;

        const newPrice = Number(newPriceText);
        if (!Number.isFinite(newPrice) || newPrice < 0) return;

        item.name = newName.trim();
        item.price = newPrice;
    }

    renderCart();
});


//Navigate to checkout when form is submitted
checkoutForm.addEventListener("submit", (event) => {
    event.preventDefault();
    window.location.href = "../checkout.html";
});

renderCart();