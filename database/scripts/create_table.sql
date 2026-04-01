-- Tạo database
CREATE DATABASE IF NOT EXISTS ApartmentManagement;
USE ApartmentManagement;

-- =============================================
-- 1. QUẢN LÝ HỆ THỐNG & PHÂN QUYỀN (Epic E05)
-- =============================================

-- Bảng người dùng (BQL và Cư dân)
-- Đã bỏ role 'KETOAN'. 'ADMIN' đại diện cho Ban Quản Lý.
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    -- Chỉ giữ lại ADMIN (BQL) và CUDAN
    role ENUM('ADMIN', 'RESIDENT') NOT NULL DEFAULT 'RESIDENT',
    status ENUM('ACTIVE', 'LOCKED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bảng nhật ký hệ thống (Audit Log)
-- Ghi lại hoạt động của BQL (thay vì Kế toán) khi chỉnh sửa dữ liệu nhạy cảm
CREATE TABLE audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT, -- Người thực hiện (thường là Admin/BQL)
    action VARCHAR(50) NOT NULL, 
    target_table VARCHAR(50), 
    record_id INT, 
    old_value TEXT, 
    new_value TEXT, 
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Sessions
CREATE TABLE sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    refresh_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- =============================================
-- 2. QUẢN LÝ HỘ DÂN & NHÂN KHẨU (Epic E01)
-- =============================================

-- Bảng Hộ gia đình
CREATE TABLE households (
    household_id INT AUTO_INCREMENT PRIMARY KEY,
    household_code VARCHAR(20) NOT NULL UNIQUE, -- Mã hộ (VD: GMD_101)
    owner_name VARCHAR(100) NOT NULL, 
    address VARCHAR(255) NOT NULL, 
    area_sqm DECIMAL(10, 2), 
    user_id INT UNIQUE, -- Liên kết tài khoản Cư dân
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Bảng Nhân khẩu
CREATE TABLE residents (
    resident_id INT AUTO_INCREMENT PRIMARY KEY,
    household_id INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    identity_card_number VARCHAR(20) UNIQUE, -- CCCD phải duy nhất
    relation_to_owner VARCHAR(50), 
    job VARCHAR(100), 
    phone_number VARCHAR(15),
    is_staying BOOLEAN DEFAULT TRUE, 
    FOREIGN KEY (household_id) REFERENCES households(household_id) ON DELETE CASCADE
);

-- =============================================
-- 3. QUẢN LÝ KHOẢN THU (Epic E02)
-- =============================================

-- Bảng Danh mục loại phí
-- BQL định nghĩa các loại phí tại đây
CREATE TABLE fee_types (
    fee_type_id INT AUTO_INCREMENT PRIMARY KEY,
    fee_name VARCHAR(100) NOT NULL, 
    unit_price DECIMAL(15, 2) NOT NULL, 
    unit VARCHAR(20), 
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE 
);

-- =============================================
-- 4. THU PHÍ & THANH TOÁN (Epic E03, E04)
-- =============================================

-- Bảng Hóa đơn / Công nợ hàng tháng
-- BQL (Admin) sẽ là người tạo hóa đơn
CREATE TABLE bills (
    bill_id INT AUTO_INCREMENT PRIMARY KEY,
    household_id INT NOT NULL,
    billing_period DATE NOT NULL, 
    title VARCHAR(200), 
    total_amount DECIMAL(15, 2) DEFAULT 0, 
    paid_amount DECIMAL(15, 2) DEFAULT 0, 
    payment_status ENUM('UNPAID', 'PARTIAL', 'PAID') DEFAULT 'UNPAID', 
    created_by INT, -- Người tạo là BQL (Admin)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(household_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Bảng Chi tiết hóa đơn
CREATE TABLE bill_details (
    detail_id INT AUTO_INCREMENT PRIMARY KEY,
    bill_id INT NOT NULL,
    fee_type_id INT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL, 
    current_unit_price DECIMAL(15, 2) NOT NULL, 
    amount DECIMAL(15, 2) NOT NULL, 
    note VARCHAR(255),
    FOREIGN KEY (bill_id) REFERENCES bills(bill_id) ON DELETE CASCADE,
    FOREIGN KEY (fee_type_id) REFERENCES fee_types(fee_type_id)
);

-- Bảng Giao dịch thanh toán (Lịch sử thu tiền)
-- BQL (Admin) trực tiếp thu tiền và ghi nhận vào hệ thống
CREATE TABLE transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    bill_id INT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL, 
    payment_method ENUM('CASH', 'TRANSFER') NOT NULL, 
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    collector_id INT, -- Người thu tiền là BQL (Admin)
    transaction_code VARCHAR(50), 
    note TEXT, 
    FOREIGN KEY (bill_id) REFERENCES bills(bill_id),
    FOREIGN KEY (collector_id) REFERENCES users(user_id)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_household_search ON households(household_code, owner_name, address);
CREATE INDEX idx_resident_search ON residents(full_name, identity_card_number);
CREATE INDEX idx_bill_period ON bills(billing_period, payment_status);
CREATE INDEX idx_user ON users(username, email);
CREATE INDEX idx_session_user ON sessions(user_id);