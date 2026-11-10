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