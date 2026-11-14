CREATE TABLE commissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(40) NULL,
    description TEXT NOT NULL,
    attachments LONGTEXT NOT NULL,
    physical TINYINT(1) NOT NULL DEFAULT 0,
    price DECIMAL(10, 2) NULL,
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    deadline DATE NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    public_id CHAR(36) NOT NULL UNIQUE,
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
    payment_method ENUM('stripe', 'paypal', 'venmo') NOT NULL,
    provider_order_id VARCHAR(255) NULL,
    currency CHAR(3) NOT NULL,
    subtotal_cents INT UNSIGNED NOT NULL,
    tax_cents INT UNSIGNED NOT NULL DEFAULT 0,
    shipping_cents INT UNSIGNED NOT NULL DEFAULT 0,
    amount_cents INT UNSIGNED NOT NULL,
    payment_status ENUM('pending', 'paid', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_provider_order (payment_method, provider_order_id),
    KEY orders_payment_status (payment_status)
);

CREATE TABLE order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    product_id VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    unit_price_cents INT UNSIGNED NOT NULL,
    quantity SMALLINT UNSIGNED NOT NULL,
    CONSTRAINT order_items_order_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);