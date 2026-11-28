interface ProductReview {
    id: number;
    name: string;
    rating: number;
    text: string | null;
    date: string;
    image: string | null;
}

interface Product {
    id: number;
    name: string;
    category: string | null;
    price: number;
    waitlistActive: boolean;
    images: string[];
    details: string[];
    reviews: ProductReview[];
}

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
    let productImages: string[] = [];

    let currentImageIndex = 0;

    const mainImage = document.querySelector<HTMLElement>(
        "#current-product-image"
    );

    const thumbnails = document.querySelector<HTMLElement>(
        "#product-thumbnails"
    );

    const prevButton = document.querySelector<HTMLButtonElement>(
        ".product-page .gallery-arrow.prev"
    );

    const nextButton = document.querySelector<HTMLButtonElement>(
        ".product-page .gallery-arrow.next"
    );

    function updateImage(index: number): void {
        if (!mainImage || !thumbnails) return;

        if (productImages.length === 0) {
            mainImage.textContent = "No image available";
            thumbnails.replaceChildren();
            return;
        }

        currentImageIndex =
            (index + productImages.length) % productImages.length;

        const image = document.createElement("img");
        image.src = productImages[currentImageIndex];
        image.alt = `Product image ${currentImageIndex + 1}`;

        mainImage.replaceChildren(image);

        thumbnails.querySelectorAll<HTMLButtonElement>(
            ".thumbnail"
        ).forEach((thumbnail, i) => {
            const active = i === currentImageIndex;

            thumbnail.classList.toggle("active", active);
            thumbnail.setAttribute("aria-pressed", String(active));

            if (active) {
                thumbnail.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                    inline: "nearest"
                });
            }
        });
    }

    function updateGallery(images: string[]): void {
        productImages = images;
        currentImageIndex = 0;

        if (!thumbnails) return;

        thumbnails.replaceChildren();

        productImages.forEach((imagePath, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "thumbnail";
            button.setAttribute(
                "aria-label",
                `View product image ${index + 1}`
            );

            const image = document.createElement("img");
            image.src = imagePath;
            image.alt = "";

            button.appendChild(image);

            button.addEventListener("click", () => {
                updateImage(index);
            });

            thumbnails.appendChild(button);
        });

        updateImage(0);
    }

    prevButton?.addEventListener("click", () => {
        updateImage(currentImageIndex - 1);
    });

    nextButton?.addEventListener("click", () => {
        updateImage(currentImageIndex + 1);
    });

    /* Image Protection */
    document.addEventListener("contextmenu", (event) => {
        const target = event.target;

        if (
            target instanceof HTMLImageElement &&
            target.closest(".product-page, .image-lightbox")
        ) {
            event.preventDefault();
        }
    });

    /* Image Lightbox */
    const lightbox = document.querySelector<HTMLElement>(
        "#image-lightbox"
    );

    const lightboxImage = document.querySelector<HTMLImageElement>(
        "#lightbox-image"
    );

    const lightboxCounter = document.querySelector<HTMLElement>(
        "#lightbox-counter"
    );

    const closeLightboxButton = document.querySelector<HTMLButtonElement>(
        "#close-lightbox"
    );

    const lightboxPrev = document.querySelector<HTMLButtonElement>(
        "#lightbox-prev"
    );

    const lightboxNext = document.querySelector<HTMLButtonElement>(
        "#lightbox-next"
    );

    let lightboxOpen = false;
    let previousFocus: HTMLElement | null = null;

    function updateLightboxImage(): void {
        if (!lightboxImage || productImages.length === 0) return;

        lightboxImage.src = productImages[currentImageIndex];
        lightboxImage.alt = `Product image ${currentImageIndex + 1}`;

        if (lightboxCounter) {
            lightboxCounter.replaceChildren();

            productImages.forEach((_, index) => {
                const dot = document.createElement("button");

                dot.type = "button";
                dot.className = "lightbox-dot";
                dot.setAttribute(
                    "aria-label",
                    `View image ${index + 1}`
                );

                const active = index === currentImageIndex;

                dot.classList.toggle("active", active);
                dot.setAttribute("aria-pressed", String(active));

                dot.addEventListener("click", () => {
                    updateImage(index);
                    updateLightboxImage();
                });

                lightboxCounter.appendChild(dot);
            });
        }
    }

    function openLightbox(): void {
        if (!lightbox || productImages.length === 0) return;

        previousFocus = document.activeElement as HTMLElement | null;
        lightbox.hidden = false;
        lightboxOpen = true;

        document.body.style.overflow = "hidden";

        updateLightboxImage();
        closeLightboxButton?.focus();
    }

    function closeLightbox(): void {
        if (!lightbox) return;

        lightbox.hidden = true;
        lightboxOpen = false;

        document.body.style.overflow = "";
        previousFocus?.focus();
    }

    mainImage?.addEventListener("click", () => {
        openLightbox();
    });

    closeLightboxButton?.addEventListener("click", closeLightbox);

    lightboxPrev?.addEventListener("click", () => {
        updateImage(currentImageIndex - 1);
        updateLightboxImage();
    });

    lightboxNext?.addEventListener("click", () => {
        updateImage(currentImageIndex + 1);
        updateLightboxImage();
    });

    lightbox?.addEventListener("click", (event) => {
        if (event.target === lightbox) {
            closeLightbox();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (!lightboxOpen) return;

        if (event.key === "Escape") {
            closeLightbox();
        }

        if (event.key === "ArrowLeft") {
            updateImage(currentImageIndex - 1);
            updateLightboxImage();
        }

        if (event.key === "ArrowRight") {
            updateImage(currentImageIndex + 1);
            updateLightboxImage();
        }

        if (event.key === "Tab") {
            const controls = [
                closeLightboxButton,
                lightboxPrev,
                lightboxNext
            ].filter((button): button is HTMLButtonElement =>
                button !== null && !button.disabled
            );

            if (controls.length === 0) return;

            const first = controls[0];
            const last = controls[controls.length - 1];

            if (event.shiftKey &&
                document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey &&
                document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    });

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


    /* Product Reviews */
    function updateProductReviews(reviews: ProductReview[]): void {
        const breakdown = document.querySelector<HTMLElement>(
            "#rating-breakdown"
        );

        const overallRating = document.querySelector<HTMLElement>(
            "#overall-rating-text"
        );

        const reviewCards = document.querySelector<HTMLElement>(
            "#review-cards"
        );

        if (!breakdown || !overallRating || !reviewCards) return;

        breakdown.replaceChildren();
        reviewCards.replaceChildren();

        const totalReviews = reviews.length;

        const averageRating = totalReviews > 0
            ? reviews.reduce((sum, review) => sum + review.rating, 0)
            / totalReviews
            : 0;

        overallRating.textContent = totalReviews > 0
            ? `⭐ ${averageRating.toFixed(1)} – ${totalReviews} ${totalReviews === 1 ? "review" : "reviews"
            }`
            : "No reviews yet";

        for (let stars = 5; stars >= 1; stars--) {
            const count = reviews.filter(
                review => Math.round(review.rating) === stars
            ).length;

            const percentage = totalReviews > 0
                ? (count / totalReviews) * 100
                : 0;

            const row = document.createElement("div");
            row.className = "rating-row";

            const starLabel = document.createElement("span");
            starLabel.textContent =
                "★".repeat(stars) + "☆".repeat(5 - stars);

            const bar = document.createElement("div");
            bar.className = "rating-bar";

            const fill = document.createElement("div");
            fill.style.width = `${percentage}%`;

            bar.appendChild(fill);

            const percentageLabel = document.createElement("span");
            percentageLabel.textContent =
                `${Math.round(percentage)}%`;

            row.append(starLabel, bar, percentageLabel);
            breakdown.appendChild(row);
        }

        reviews.forEach((review) => {
            const card = document.createElement("article");
            card.className = "review-card";

            const header = document.createElement("div");
            header.className = "review-header";

            const user = document.createElement("div");
            user.className = "review-user";

            const avatar = document.createElement("div");
            avatar.className = "user-avatar";
            avatar.textContent =
                (review.name || "Anonymous").slice(0, 2).toUpperCase();

            const userInfo = document.createElement("div");

            const username = document.createElement("strong");
            username.textContent = review.name || "Anonymous";

            const ratingDate = document.createElement("p");

            const date = new Date(review.date);
            const formattedDate = Number.isNaN(date.getTime())
                ? ""
                : date.toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric"
                });

            const rating = Math.max(0, Math.min(5, Number(review.rating)));

            ratingDate.className = "review-rating";

            const stars = document.createElement("span");
            stars.className = "review-stars";
            stars.setAttribute("aria-label", `${rating.toFixed(1)} out of 5 stars`);

            const emptyStars = document.createElement("span");
            emptyStars.className = "empty-stars";
            emptyStars.textContent = "★★★★★";

            const filledStars = document.createElement("span");
            filledStars.className = "filled-stars";
            filledStars.textContent = "★★★★★";
            filledStars.style.width = `${(rating / 5) * 100}%`;

            stars.append(emptyStars, filledStars);

            const ratingValue = document.createElement("span");
            ratingValue.className = "review-rating-value";
            ratingValue.textContent = rating.toFixed(1);

            const reviewDate = document.createElement("span");
            reviewDate.className = "review-date";
            reviewDate.textContent = `· ${formattedDate}`;

            ratingDate.append(stars, ratingValue, reviewDate);


            userInfo.append(username, ratingDate);
            user.append(avatar, userInfo);
            header.appendChild(user);

            const body = document.createElement("div");
            body.className = "review-body";

            if (review.text) {
                const text = document.createElement("p");
                text.textContent = review.text;
                body.appendChild(text);
            }

            if (review.image) {
                const imageContainer = document.createElement("div");
                imageContainer.className = "review-image-placeholder";

                const image = document.createElement("img");
                image.src = review.image;
                image.alt = `Review image from ${review.name || "Anonymous"}`;
                image.loading = "lazy";

                imageContainer.appendChild(image);
                body.appendChild(imageContainer);
            }

            card.append(header, body);
            reviewCards.appendChild(card);
        });

        const toggleButton = document.querySelector<HTMLButtonElement>(
            "#toggle-reviews"
        );

        let showAllReviews = false;

        function updateReviewVisibility(): void {
            if (!reviewCards) return;
            
            const cards = reviewCards.querySelectorAll<HTMLElement>(
                ".review-card"
            );

            cards.forEach((card, index) => {
                card.hidden = !showAllReviews && index >= 2;
            });

            if (toggleButton) {
                toggleButton.hidden = cards.length <= 2;

                toggleButton.textContent = showAllReviews
                    ? "Show Less"
                    : `View All Reviews (${cards.length})`;
            }
        }

        toggleButton?.addEventListener("click", () => {
            showAllReviews = !showAllReviews;
            updateReviewVisibility();
        });

        updateReviewVisibility();
    }

    /* Product Details */
    function updateProductDetails(details: string[]): void {
        const detailsList = document.querySelector<HTMLUListElement>(
            "#product-details-list"
        );

        if (!detailsList) return;

        detailsList.replaceChildren();

        details.forEach((detail) => {
            const listItem = document.createElement("li");
            listItem.textContent = detail;
            detailsList.appendChild(listItem);
        });
    }

    async function loadProduct(): Promise<void> {
        const params = new URLSearchParams(window.location.search);
        const productId = params.get("id");

        if (!productId) return;

        try {
            const response = await fetch(
                `/api/products/${encodeURIComponent(productId)}`
            );

            if (!response.ok) {
                throw new Error("Unable to load product");
            }

            const product: Product = await response.json();
            updateGallery(product.images);

            document.querySelector<HTMLElement>("#product-name")!
                .textContent = product.name;

            document.querySelector<HTMLElement>("#product-category")!
                .textContent = product.category ?? "";

            document.querySelector<HTMLElement>("#product-price")!
                .textContent = `$${product.price.toFixed(2)}`;

            updateProductDetails(product.details);

            updateProductReviews(product.reviews);

        } catch (error) {
            console.error("Product loading failed:", error);
        }
    }

    void loadProduct();
});

document.addEventListener("dragstart", (event) => {
    const target = event.target;

    if (
        target instanceof HTMLImageElement &&
        target.closest(".product-page, .image-lightbox")
    ) {
        event.preventDefault();
    }
});

export { };