USE bluemoon;

-- =============================================
-- 1. INSERT DATA: USERS
-- (1 Admin, 20 Cư dân)
-- =============================================
INSERT INTO users (username, password_hash, full_name, email, role, status) VALUES 
('admin_manager', 'hash_admin_123', 'Nguyễn Quản Lý', 'admin@chungcu.vn', 'ADMIN', 'ACTIVE'),
('cudan_101', 'hash_pass_1', 'Trần Văn An', 'an.tran@gmail.com', 'RESIDENT', 'ACTIVE'),
('cudan_102', 'hash_pass_2', 'Lê Thị Bích', 'bich.le@yahoo.com', 'RESIDENT', 'ACTIVE'),
('cudan_103', 'hash_pass_3', 'Phạm Minh Cường', 'cuong.pham@outlook.com', 'RESIDENT', 'ACTIVE'),
('cudan_104', 'hash_pass_4', 'Hoàng Thu Dung', 'dung.hoang@gmail.com', 'RESIDENT', 'ACTIVE'),
('cudan_105', 'hash_pass_5', 'Vũ Văn Én', 'en.vu@gmail.com', 'RESIDENT', 'ACTIVE'),
('cudan_106', 'hash_pass_6', 'Đặng Thị Gấm', 'gam.dang@company.vn', 'RESIDENT', 'ACTIVE'),
('cudan_107', 'hash_pass_7', 'Bùi Văn Hùng', 'hung.bui@web.vn', 'RESIDENT', 'ACTIVE'),
('cudan_108', 'hash_pass_8', 'Đỗ Thị Ích', 'ich.do@edu.vn', 'RESIDENT', 'ACTIVE'),
('cudan_109', 'hash_pass_9', 'Hồ Văn Khoa', 'khoa.ho@gmail.com', 'RESIDENT', 'ACTIVE'),
('cudan_110', 'hash_pass_10', 'Ngô Thị Lan', 'lan.ngo@bank.vn', 'RESIDENT', 'ACTIVE'),
('cudan_111', 'hash_pass_11', 'Dương Văn Minh', 'minh.duong@tech.com', 'RESIDENT', 'ACTIVE'),
('cudan_112', 'hash_pass_12', 'Lý Thị Nga', 'nga.ly@fashion.vn', 'RESIDENT', 'ACTIVE'),
('cudan_113', 'hash_pass_13', 'Mai Văn Oanh', 'oanh.mai@store.com', 'RESIDENT', 'ACTIVE'),
('cudan_114', 'hash_pass_14', 'Trịnh Thị Phương', 'phuong.trinh@realestate.vn', 'RESIDENT', 'ACTIVE'),
('cudan_115', 'hash_pass_15', 'Đinh Văn Quân', 'quan.dinh@logistics.vn', 'RESIDENT', 'ACTIVE'),
('cudan_116', 'hash_pass_16', 'Vương Thị Sen', 'sen.vuong@flower.vn', 'RESIDENT', 'ACTIVE'),
('cudan_117', 'hash_pass_17', 'Phan Văn Tài', 'tai.phan@driver.vn', 'RESIDENT', 'ACTIVE'),
('cudan_118', 'hash_pass_18', 'Tạ Thị Uyên', 'uyen.ta@nurse.vn', 'RESIDENT', 'ACTIVE'),
('cudan_119', 'hash_pass_19', 'Cao Văn Vinh', 'vinh.cao@engineer.vn', 'RESIDENT', 'ACTIVE'),
('cudan_120', 'hash_pass_20', 'Lương Thị Xuyến', 'xuyen.luong@teacher.vn', 'RESIDENT', 'ACTIVE');

-- =============================================
-- 2. INSERT DATA: HOUSEHOLDS
-- (20 Căn hộ, liên kết với User ID từ 2 đến 21)
-- =============================================
INSERT INTO households (household_code, owner_name, address, area_sqm, user_id) VALUES 
('A101', 'Trần Văn An', 'P101 Tòa A, Chung cư Sunrise', 85.5, 2),
('A102', 'Lê Thị Bích', 'P102 Tòa A, Chung cư Sunrise', 70.0, 3),
('A103', 'Phạm Minh Cường', 'P103 Tòa A, Chung cư Sunrise', 92.0, 4),
('A104', 'Hoàng Thu Dung', 'P104 Tòa A, Chung cư Sunrise', 65.5, 5),
('A105', 'Vũ Văn Én', 'P105 Tòa A, Chung cư Sunrise', 85.5, 6),
('A106', 'Đặng Thị Gấm', 'P106 Tòa A, Chung cư Sunrise', 102.0, 7),
('A107', 'Bùi Văn Hùng', 'P107 Tòa A, Chung cư Sunrise', 70.0, 8),
('A108', 'Đỗ Thị Ích', 'P108 Tòa A, Chung cư Sunrise', 68.0, 9),
('A109', 'Hồ Văn Khoa', 'P109 Tòa A, Chung cư Sunrise', 85.5, 10),
('A110', 'Ngô Thị Lan', 'P110 Tòa A, Chung cư Sunrise', 110.0, 11),
('B201', 'Dương Văn Minh', 'P201 Tòa B, Chung cư Sunrise', 85.5, 12),
('B202', 'Lý Thị Nga', 'P202 Tòa B, Chung cư Sunrise', 72.0, 13),
('B203', 'Mai Văn Oanh', 'P203 Tòa B, Chung cư Sunrise', 95.0, 14),
('B204', 'Trịnh Thị Phương', 'P204 Tòa B, Chung cư Sunrise', 60.0, 15),
('B205', 'Đinh Văn Quân', 'P205 Tòa B, Chung cư Sunrise', 85.5, 16),
('B206', 'Vương Thị Sen', 'P206 Tòa B, Chung cư Sunrise', 102.0, 17),
('B207', 'Phan Văn Tài', 'P207 Tòa B, Chung cư Sunrise', 70.0, 18),
('B208', 'Tạ Thị Uyên', 'P208 Tòa B, Chung cư Sunrise', 68.0, 19),
('B209', 'Cao Văn Vinh', 'P209 Tòa B, Chung cư Sunrise', 85.5, 20),
('B210', 'Lương Thị Xuyến', 'P210 Tòa B, Chung cư Sunrise', 120.0, 21);

-- =============================================
-- 3. INSERT DATA: RESIDENTS
-- (Khoảng 30 người, bao gồm chủ hộ và người thân)
-- =============================================
INSERT INTO residents (household_id, full_name, date_of_birth, identity_card_number, relationship_to_owner, career, phone_number) VALUES 
(1, 'Trần Văn An', '1980-05-10', '001080000001', 'Chủ hộ', 'Kỹ sư', '0901000001'),
(1, 'Nguyễn Thị Mai', '1982-08-15', '001082000002', 'Vợ', 'Giáo viên', '0901000002'),
(2, 'Lê Thị Bích', '1990-01-20', '001090000003', 'Chủ hộ', 'Kế toán', '0901000003'),
(3, 'Phạm Minh Cường', '1975-11-11', '001075000004', 'Chủ hộ', 'Bác sĩ', '0901000004'),
(3, 'Trần Thu Hà', '1978-02-02', '001078000005', 'Vợ', 'Dược sĩ', '0901000005'),
(3, 'Phạm Minh Đức', '2005-06-01', NULL, 'Con', 'Học sinh', NULL),
(4, 'Hoàng Thu Dung', '1995-03-12', '001095000006', 'Chủ hộ', 'Freelancer', '0901000006'),
(5, 'Vũ Văn Én', '1988-07-07', '001088000007', 'Chủ hộ', 'IT', '0901000007'),
(6, 'Đặng Thị Gấm', '1985-09-09', '001085000008', 'Chủ hộ', 'Kinh doanh', '0901000008'),
(6, 'Nguyễn Văn Hùng', '1983-10-10', '001083000009', 'Chồng', 'Công an', '0901000009'),
(7, 'Bùi Văn Hùng', '1992-12-12', '001092000010', 'Chủ hộ', 'Marketing', '0901000010'),
(8, 'Đỗ Thị Ích', '1960-01-01', '001060000011', 'Chủ hộ', 'Hưu trí', '0901000011'),
(9, 'Hồ Văn Khoa', '1980-04-30', '001080000012', 'Chủ hộ', 'Luật sư', '0901000012'),
(10, 'Ngô Thị Lan', '1987-05-05', '001087000013', 'Chủ hộ', 'Ngân hàng', '0901000013'),
(11, 'Dương Văn Minh', '1991-06-06', '001091000014', 'Chủ hộ', 'Kiến trúc sư', '0901000014'),
(12, 'Lý Thị Nga', '1993-08-08', '001093000015', 'Chủ hộ', 'Thiết kế', '0901000015'),
(13, 'Mai Văn Oanh', '1970-02-14', '001070000016', 'Chủ hộ', 'Giám đốc', '0901000016'),
(14, 'Trịnh Thị Phương', '1998-11-20', '001098000017', 'Chủ hộ', 'Sinh viên', '0901000017'),
(15, 'Đinh Văn Quân', '1984-03-03', '001084000018', 'Chủ hộ', 'Sale', '0901000018'),
(16, 'Vương Thị Sen', '1989-07-27', '001089000019', 'Chủ hộ', 'HR', '0901000019'),
(16, 'Lê Văn Tám', '2015-01-01', NULL, 'Con', 'Học sinh', NULL),
(17, 'Phan Văn Tài', '1981-09-15', '001081000020', 'Chủ hộ', 'Lái xe', '0901000020'),
(18, 'Tạ Thị Uyên', '1994-12-24', '001094000021', 'Chủ hộ', 'Y tá', '0901000021'),
(19, 'Cao Văn Vinh', '1986-06-16', '001086000022', 'Chủ hộ', 'Kỹ thuật viên', '0901000022'),
(20, 'Lương Thị Xuyến', '1979-10-20', '001079000023', 'Chủ hộ', 'Giảng viên', '0901000023'),
(20, 'Trần Văn Z', '1975-05-05', '001075000024', 'Chồng', 'Nghiên cứu sinh', '0901000024');

-- =============================================
-- 4. INSERT DATA: FEE TYPES
-- (Các loại phí cơ bản)
-- =============================================
INSERT INTO fee_types (fee_name, unit_price, unit, description) VALUES 
('Phí Quản lý (Management Fee)', 12000, 'VND/m2', 'Phí dịch vụ quản lý chung cư hàng tháng'),
('Phí Gửi xe máy (Motorbike Parking)', 100000, 'VND/xe/tháng', 'Phí gửi xe máy dưới hầm'),
('Phí Gửi ô tô (Car Parking)', 1200000, 'VND/xe/tháng', 'Phí gửi xe ô tô cố định'),
('Tiền Điện (Electricity)', 3000, 'VND/kWh', 'Tính theo số công tơ điện'),
('Tiền Nước (Water)', 25000, 'VND/m3', 'Tính theo số khối nước tiêu thụ'),
('Phí Vệ sinh (Cleaning)', 50000, 'VND/hộ', 'Phí thu gom rác thải');

-- =============================================
-- 5. INSERT DATA: BILLS
-- (Tạo hóa đơn cho tháng 10/2025)
-- =============================================
INSERT INTO bills (household_id, billing_period, title, total_amount, paid_amount, payment_status, created_by) VALUES 
(1, '2025-10-01', 'Hóa đơn phí tháng 10/2025', 1526000, 1526000, 'PAID', 1), -- A101
(2, '2025-10-01', 'Hóa đơn phí tháng 10/2025', 990000, 0, 'UNPAID', 1), -- A102
(3, '2025-10-01', 'Hóa đơn phí tháng 10/2025', 2454000, 2454000, 'PAID', 1), -- A103 (Có ô tô)
(4, '2025-10-01', 'Hóa đơn phí tháng 10/2025', 836000, 400000, 'PARTIAL', 1), -- A104
(5, '2025-10-01', 'Hóa đơn phí tháng 10/2025', 1176000, 1176000, 'PAID', 1),
(6, '2025-10-01', 'Hóa đơn phí tháng 10/2025', 2674000, 0, 'UNPAID', 1), -- A106
(7, '2025-10-01', 'Hóa đơn phí tháng 10/2025', 990000, 990000, 'PAID', 1),
(8, '2025-10-01', 'Hóa đơn phí tháng 10/2025', 966000, 0, 'UNPAID', 1),
(9, '2025-10-01', 'Hóa đơn phí tháng 10/2025', 1176000, 1176000, 'PAID', 1),
(10, '2025-10-01', 'Hóa đơn phí tháng 10/2025', 2770000, 2770000, 'PAID', 1), -- A110
(11, '2025-10-01', 'Hóa đơn phí tháng 10/2025', 1176000, 0, 'UNPAID', 1),
(12, '2025-10-01', 'Hóa đơn phí tháng 10/2025', 1014000, 1014000, 'PAID', 1),
(13, '2025-10-01', 'Hóa đơn phí tháng 10/2025', 2490000, 0, 'UNPAID', 1), -- B203
(14, '2025-10-01', 'Hóa đơn phí tháng 10/2025', 870000, 870000, 'PAID', 1),
(15, '2025-10-01', 'Hóa đơn phí tháng 10/2025', 1176000, 500000, 'PARTIAL', 1),
(16, '2025-10-01', 'Hóa đơn phí tháng 10/2025', 2674000, 2674000, 'PAID', 1),
(17, '2025-10-01', 'Hóa đơn phí tháng 10/2025', 990000, 0, 'UNPAID', 1),
(18, '2025-10-01', 'Hóa đơn phí tháng 10/2025', 966000, 966000, 'PAID', 1),
(19, '2025-10-01', 'Hóa đơn phí tháng 10/2025', 1176000, 1176000, 'PAID', 1),
(20, '2025-10-01', 'Hóa đơn phí tháng 10/2025', 2890000, 0, 'UNPAID', 1);

-- =============================================
-- 6. INSERT DATA: BILL DETAILS
-- (Chi tiết tiền điện, nước, phí cho các bill trên)
-- =============================================
-- Bill 1 (A101 - 85.5m2)
INSERT INTO bill_details (bill_id, fee_type_id, quantity, current_unit_price, amount) VALUES
(1, 1, 85.5, 12000, 1026000), -- Phí quản lý
(1, 2, 1, 100000, 100000),     -- Xe máy
(1, 4, 100, 3000, 300000),    -- Điện
(1, 5, 4, 25000, 100000);     -- Nước

-- Bill 2 (A102 - 70m2)
INSERT INTO bill_details (bill_id, fee_type_id, quantity, current_unit_price, amount) VALUES
(2, 1, 70, 12000, 840000),
(2, 4, 30, 3000, 90000),
(2, 5, 2, 25000, 50000),
(2, 6, 1, 10000, 10000); -- Demo thêm phí nhỏ

-- Bill 3 (A103 - 92m2 - Có ô tô)
INSERT INTO bill_details (bill_id, fee_type_id, quantity, current_unit_price, amount) VALUES
(3, 1, 92, 12000, 1104000),
(3, 3, 1, 1200000, 1200000), -- Ô tô
(3, 4, 50, 3000, 150000);

-- Bill 4 (A104 - 65.5m2)
INSERT INTO bill_details (bill_id, fee_type_id, quantity, current_unit_price, amount) VALUES
(4, 1, 65.5, 12000, 786000),
(4, 6, 1, 50000, 50000);

-- Các hóa đơn khác (sinh mẫu ngẫu nhiên các dòng)
INSERT INTO bill_details (bill_id, fee_type_id, quantity, current_unit_price, amount) VALUES
(5, 1, 85.5, 12000, 1026000), (5, 4, 50, 3000, 150000),
(6, 1, 102, 12000, 1224000), (6, 3, 1, 1200000, 1200000), (6, 4, 83.3, 3000, 250000),
(7, 1, 70, 12000, 840000), (7, 2, 1, 100000, 100000), (7, 5, 2, 25000, 50000),
(8, 1, 68, 12000, 816000), (8, 4, 50, 3000, 150000),
(9, 1, 85.5, 12000, 1026000), (9, 2, 1, 100000, 100000), (9, 6, 1, 50000, 50000),
(10, 1, 110, 12000, 1320000), (10, 3, 1, 1200000, 1200000), (10, 4, 83.33, 3000, 250000),
(11, 1, 85.5, 12000, 1026000), (11, 2, 1, 100000, 100000), (11, 5, 2, 25000, 50000),
(12, 1, 72, 12000, 864000), (12, 2, 1, 100000, 100000), (12, 6, 1, 50000, 50000),
(13, 1, 95, 12000, 1140000), (13, 3, 1, 1200000, 1200000), (13, 4, 50, 3000, 150000),
(14, 1, 60, 12000, 720000), (14, 2, 1, 100000, 100000), (14, 6, 1, 50000, 50000),
(15, 1, 85.5, 12000, 1026000), (15, 4, 50, 3000, 150000),
(16, 1, 102, 12000, 1224000), (16, 3, 1, 1200000, 1200000), (16, 4, 83.33, 3000, 250000),
(17, 1, 70, 12000, 840000), (17, 2, 1, 100000, 100000), (17, 5, 2, 25000, 50000),
(18, 1, 68, 12000, 816000), (18, 2, 1, 100000, 100000), (18, 6, 1, 50000, 50000),
(19, 1, 85.5, 12000, 1026000), (19, 2, 1, 100000, 100000), (19, 5, 2, 25000, 50000),
(20, 1, 120, 12000, 1440000), (20, 3, 1, 1200000, 1200000), (20, 4, 83.33, 3000, 250000);

-- =============================================
-- 7. INSERT DATA: TRANSACTIONS
-- (Ghi nhận thanh toán cho các bill đã PAID/PARTIAL)
-- =============================================
INSERT INTO transactions (bill_id, amount, payment_method, collector_id, transaction_code, note) VALUES 
(1, 1526000, 'BANK_TRANSFER', 1, 'TXN_20251005_001', 'CK qua VCB'),
(3, 2454000, 'CASH', 1, NULL, 'Nộp tiền mặt tại VP'),
(4, 400000, 'BANK_TRANSFER', 1, 'TXN_20251005_002', 'Thanh toán một phần'),
(5, 1176000, 'BANK_TRANSFER', 1, 'TXN_20251006_003', 'CK qua Techcom'),
(7, 990000, 'CASH', 1, NULL, 'Bác Hùng nộp tiền mặt'),
(9, 1176000, 'BANK_TRANSFER', 1, 'TXN_20251007_004', 'CK qua Momo'),
(10, 2770000, 'BANK_TRANSFER', 1, 'TXN_20251008_005', 'CK qua VCB'),
(12, 1014000, 'CASH', 1, NULL, 'Nộp tiền mặt'),
(14, 870000, 'BANK_TRANSFER', 1, 'TXN_20251009_006', 'CK qua BIDV'),
(15, 500000, 'CASH', 1, NULL, 'Đóng trước 500k'),
(16, 2674000, 'BANK_TRANSFER', 1, 'TXN_20251010_007', 'CK full'),
(18, 966000, 'CASH', 1, NULL, 'Nộp tiền mặt'),
(19, 1176000, 'BANK_TRANSFER', 1, 'TXN_20251011_008', 'CK qua VPBank');

-- =============================================
-- 8. INSERT DATA: AUDIT LOGS
-- (Nhật ký hoạt động của Admin)
-- =============================================
INSERT INTO audit_logs (user_id, action, target_table, record_id, old_value, new_value, ip_address) VALUES 
(1, 'CREATE_USER', 'users', 2, NULL, 'username: cudan_101', '192.168.1.10'),
(1, 'CREATE_HOUSEHOLD', 'households', 1, NULL, 'code: A101', '192.168.1.10'),
(1, 'UPDATE_FEE', 'fee_types', 1, 'price: 11000', 'price: 12000', '192.168.1.12'),
(1, 'CREATE_RESIDENT', 'residents', 1, NULL, 'name: Trần Văn An', '192.168.1.10'),
(1, 'RECORD_PAYMENT', 'transactions', 1, NULL, 'amount: 1526000', '192.168.1.15'),
(1, 'UPDATE_RESIDENT', 'residents', 5, 'phone: NULL', 'phone: 0901000005', '192.168.1.11'),
(1, 'DELETE_RESIDENT', 'residents', 99, 'name: Nguyen Van Tam', NULL, '192.168.1.11'),
(1, 'CREATE_BILL', 'bills', 3, NULL, 'total: 2454000', '192.168.1.10'),
(1, 'UPDATE_BILL_STATUS', 'bills', 1, 'UNPAID', 'PAID', '192.168.1.15'),
(1, 'LOGIN', 'users', 1, NULL, 'Success', '192.168.1.10'),
(1, 'EXPORT_REPORT', 'reports', NULL, NULL, 'Revenue Oct 2025', '192.168.1.10'),
(1, 'CREATE_FEE', 'fee_types', 6, NULL, 'name: Cleaning Fee', '192.168.1.12'),
(1, 'UPDATE_HOUSEHOLD', 'households', 2, 'area: 69.5', 'area: 70.0', '192.168.1.10'),
(1, 'RESET_PASSWORD', 'users', 5, 'old_hash', 'new_hash_reset', '192.168.1.10'),
(1, 'LOCK_USER', 'users', 20, 'ACTIVE', 'LOCKED', '192.168.1.18'),
(1, 'UNLOCK_USER', 'users', 20, 'LOCKED', 'ACTIVE', '192.168.1.18'),
(1, 'UPDATE_FEE', 'fee_types', 3, 'price: 1000000', 'price: 1200000', '192.168.1.12'),
(1, 'RECORD_PAYMENT', 'transactions', 2, NULL, 'amount: 2454000', '192.168.1.15'),
(1, 'CREATE_RESIDENT', 'residents', 24, NULL, 'name: Trần Văn Z', '192.168.1.11'),
(1, 'LOGOUT', 'users', 1, NULL, 'Success', '192.168.1.10');