document.addEventListener("DOMContentLoaded", () => {
    /* Back Button */
    const backButton = document.querySelector<HTMLButtonElement>(
        "#back-button"
    );

    backButton?.addEventListener("click", () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = "catalog.html";
        }
    });
    
    /* Licensing */
    const basePrice = 65; // temp

    const contentLicense = document.querySelector<HTMLInputElement>(
        "#license-content"
    );

    const merchandiseLicense = document.querySelector<HTMLInputElement>(
        "#license-merchandise"
    );

    const priceElement = document.querySelector<HTMLElement>(
        "#product-price"
    );

    function updatePrice(): void {
        let total = basePrice;

        if (contentLicense?.checked) {
            total *= 2;
        }

        if (merchandiseLicense?.checked) {
            total *= 2;
        }

        if (priceElement) {
            priceElement.textContent = `$${total.toFixed(2)}`;
        }
    }

    contentLicense?.addEventListener("change", updatePrice);
    merchandiseLicense?.addEventListener("change", updatePrice);

    updatePrice();

    /* Product Tabs */
    const tabs = document.querySelectorAll<HTMLButtonElement>(
        ".product-page .product-tab"
    );

    const panels = document.querySelectorAll<HTMLElement>(
        ".product-page .product-panel"
    );

    function changeTab(tabName: string): void {
        panels.forEach((panel) => {
            panel.hidden = panel.id !== `${tabName}-panel`;
        });

        tabs.forEach((tab) => {
            const active = tab.dataset.tab === tabName;

            tab.classList.toggle("active", active);
            tab.setAttribute("aria-pressed", String(active));
        });
    }

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const tabName = tab.dataset.tab;

            if (tabName) {
                changeTab(tabName);
            }
        });
    });

    changeTab("description");

    /* Product Carousel */
    const productImages: string[] = [
        "Product Image 1",
        "Product Image 2",
        "Product Image 3"
    ];

    let currentImageIndex = 0;

    const mainImage = document.querySelector<HTMLElement>(
        "#current-product-image"
    );

    const thumbnails = document.querySelectorAll<HTMLButtonElement>(
        ".product-page .thumbnail"
    );

    const prevButton = document.querySelector<HTMLButtonElement>(
        ".product-page .gallery-arrow.prev"
    );

    const nextButton = document.querySelector<HTMLButtonElement>(
        ".product-page .gallery-arrow.next"
    );

    function updateImage(index: number): void {
        currentImageIndex =
            (index + productImages.length) % productImages.length;

        if (mainImage) {
            mainImage.textContent = productImages[currentImageIndex];
        }

        thumbnails.forEach((thumbnail, i) => {
            const active = i === currentImageIndex;

            thumbnail.classList.toggle("active", active);
            thumbnail.setAttribute("aria-pressed", String(active));
        });
    }

    thumbnails.forEach((thumbnail, index) => {
        thumbnail.addEventListener("click", () => {
            updateImage(index);
        });
    });

    prevButton?.addEventListener("click", () => {
        updateImage(currentImageIndex - 1);
    });

    nextButton?.addEventListener("click", () => {
        updateImage(currentImageIndex + 1);
    });

    updateImage(0);

    /* Bookmark */
    const bookmarkButton = document.querySelector<HTMLButtonElement>(
        "#bookmark-product"
    );

    const productId = new URLSearchParams(
        window.location.search
    ).get("id") ?? "1";

    const storageKey = "savedProducts";

    function getSavedProducts(): string[] {
        try {
            const stored = localStorage.getItem(storageKey);
            const parsed: unknown = stored ? JSON.parse(stored) : [];

            return Array.isArray(parsed)
                ? parsed.filter((id): id is string => typeof id === "string")
                : [];
        } catch {
            return [];
        }
    }

    function updateBookmark(): void {
        if (!bookmarkButton) return;

        const isSaved = getSavedProducts().includes(productId);

        bookmarkButton.classList.toggle("saved", isSaved);
        bookmarkButton.setAttribute("aria-pressed", String(isSaved));
        bookmarkButton.setAttribute(
            "aria-label",
            isSaved ? "Remove saved product" : "Save product"
        );
    }

    bookmarkButton?.addEventListener("click", () => {
        const savedProducts = getSavedProducts();

        const updated = savedProducts.includes(productId)
            ? savedProducts.filter(id => id !== productId)
            : [...savedProducts, productId];

        try {
            localStorage.setItem(storageKey, JSON.stringify(updated));
            updateBookmark();
        } catch (error) {
            console.error("Could not save bookmark:", error);
        }
    });

    updateBookmark();

    /* Share Product */
    const shareButton = document.querySelector<HTMLButtonElement>(
        "#share-product"
    );

    const shareMessage = document.querySelector<HTMLElement>(
        "#share-message"
    );

    shareButton?.addEventListener("click", async () => {
        const productName =
            document.querySelector<HTMLElement>("#product-name")
                ?.textContent?.trim() || "RinRobou Studios Product";

        const productUrl = window.location.href;

        try {
            if (navigator.share) {
                await navigator.share({
                    title: productName,
                    url: productUrl
                });

                return;
            }

            await navigator.clipboard.writeText(productUrl);

            if (shareMessage) {
                shareMessage.textContent = "Product link copied!";
            }
        } catch (error) {
            if (error instanceof DOMException &&
                error.name === "AbortError") {
                return;
            }

            console.error("Unable to share product:", error);

            if (shareMessage) {
                shareMessage.textContent = "Unable to share product.";
            }
        }
    });

    /* Commission Terms */
    const commissionCheckbox =
        document.querySelector<HTMLInputElement>(
            "#accept-commission-terms"
        );

    const orderButton =
        document.querySelector<HTMLAnchorElement>(
            "#order-now"
        );

    function updateOrderButton(): void {
        if (!commissionCheckbox || !orderButton) return;

        const accepted = commissionCheckbox.checked;

        orderButton.setAttribute(
            "aria-disabled",
            String(!accepted)
        );

        orderButton.tabIndex = accepted ? 0 : -1;
        orderButton.classList.toggle("disabled", !accepted);
    }

    commissionCheckbox?.addEventListener(
        "change",
        updateOrderButton
    );

    orderButton?.addEventListener("click", (event) => {
        if (!commissionCheckbox?.checked) {
            event.preventDefault();
        }
    });

    updateOrderButton();

});
export { };