# 🏢 Database Design - Bluemoon

Tài liệu này mô tả lược đồ cơ sở dữ liệu (Database Schema) cho hệ thống quản lý chung cư. Thiết kế này tập trung vào việc quản lý cư dân, tính toán phí dịch vụ hàng tháng và theo dõi thanh toán minh bạch.

## 1. Tổng quan kiến trúc (Architecture Overview)

Cơ sở dữ liệu được chia thành 4 phân hệ chính (Modules):
1.  **System & Auth:** Quản lý người dùng, phân quyền và nhật ký hệ thống.
2.  **Household Management:** Quản lý thông tin căn hộ và nhân khẩu.
3.  **Fee Configuration:** Định nghĩa các loại phí dịch vụ.
4.  **Billing & Payment:** Quy trình tạo hóa đơn, công nợ và ghi nhận thanh toán.

> **Lưu ý:** Hệ thống được thiết kế với 2 vai trò chính: **Admin** (Ban Quản Lý - thực hiện toàn bộ nghiệp vụ) và **Resident** (Cư dân - xem thông tin).

---

## 2. Chi tiết các bảng và Logic hoạt động

### Phân hệ 1: System & Authentication (Hệ thống & Bảo mật)

#### 🔹 Bảng `users`
* **Chức năng:** Lưu trữ tài khoản đăng nhập cho cả Ban Quản Lý (Admin) và Cư dân (Resident).
* **Logic:**
    * Cột `role` phân định quyền hạn:
        * `ADMIN`: Có toàn quyền thêm/sửa/xóa dữ liệu, thu phí.
        * `RESIDENT`: Chỉ có quyền xem hóa đơn và thông tin hộ gia đình của chính mình.
* [cite_start]**Mapping yêu cầu:** Đáp ứng US09, US10[cite: 9].

#### 🔹 Bảng `audit_logs`
* **Chức năng:** Hộp đen ghi lại lịch sử thay đổi dữ liệu nhạy cảm.
* **Logic:**
    * Khi Admin thực hiện hành động nhạy cảm (vd: xóa nhân khẩu, sửa đơn giá phí), hệ thống sẽ ghi lại dòng log bao gồm: *Ai làm? Làm gì? Dữ liệu cũ là gì? Dữ liệu mới là gì?*
    * Mục đích: Truy vết lỗi và đảm bảo tính minh bạch.
* [cite_start]**Mapping yêu cầu:** Đáp ứng US11[cite: 10].

---

### Phân hệ 2: Household & Resident (Cư dân)

#### 🔹 Bảng `households` (Hộ dân)
* **Chức năng:** Đại diện cho một căn hộ vật lý.
* **Logic:**
    * `household_code` (Mã hộ) là duy nhất (Unique) để định danh (VD: A101).
    * Liên kết `user_id`: Mỗi hộ được liên kết với một tài khoản trong bảng `users`. Khi User đăng nhập, hệ thống tìm `household_id` tương ứng để hiển thị dữ liệu riêng tư.
* [cite_start]**Mapping yêu cầu:** Đáp ứng US01[cite: 8].

#### 🔹 Bảng `residents` (Nhân khẩu)
* **Chức năng:** Lưu thông tin từng người sống trong căn hộ.
* **Logic:**
    * Quan hệ 1-N (Một hộ có nhiều nhân khẩu).
    * **Quan trọng:** Cột `identity_card_number` (CCCD) được đánh dấu `UNIQUE`. Hệ thống sẽ chặn ngay lập tức nếu nhập trùng số CCCD của một người đã tồn tại trong hệ thống (tránh duplicate data).
* [cite_start]**Mapping yêu cầu:** Đáp ứng US02, US03[cite: 8].

---

### Phân hệ 3: Fee Management (Quản lý phí)

#### 🔹 Bảng `fee_types`
* **Chức năng:** Danh mục các loại phí (Điện, Nước, Gửi xe, Phí quản lý...).
* **Logic:**
    * Admin định nghĩa `unit_price` (đơn giá) tại đây.
    * Giúp hệ thống linh hoạt: Khi giá điện tăng, Admin chỉ cần sửa ở bảng này, các hóa đơn *tương lai* sẽ áp dụng giá mới (hóa đơn cũ không bị ảnh hưởng nhờ logic ở bảng `bill_details`).
* [cite_start]**Mapping yêu cầu:** Đáp ứng US04[cite: 8].

---

### Phân hệ 4: Billing & Payment (Cốt lõi - Tài chính)

Đây là phần phức tạp nhất, xử lý luồng tiền tệ.

#### 🔹 Bảng `bills` (Hóa đơn tổng)
* **Chức năng:** Đại diện cho "Tờ thông báo phí" hàng tháng gửi cho hộ dân.
* **Logic:**
    * Mỗi tháng, mỗi hộ sẽ có 1 bản ghi trong bảng này (VD: Hóa đơn tháng 10/2025).
    * `payment_status`:
        * `UNPAID`: Mới tạo, chưa đóng tiền.
        * `PARTIAL`: Đã đóng một phần (VD: Tổng 1tr, mới đóng 500k).
        * `PAID`: Đã đóng đủ.
* [cite_start]**Mapping yêu cầu:** Đáp ứng US07, US08[cite: 9].

#### 🔹 Bảng `bill_details` (Chi tiết hóa đơn)
* **Chức năng:** Các dòng chi tiết trong tờ hóa đơn (VD: Dòng 1 - Tiền điện, Dòng 2 - Tiền nước).
* **Logic tính toán:**
    * `amount` = `quantity` (số lượng tiêu thụ) * `current_unit_price` (giá tại thời điểm đó).
    * **Lưu ý thiết kế:** Bảng này lưu cứng cột `current_unit_price`.
        * *Tại sao?* Nếu tháng sau giá điện tăng trong bảng `fee_types`, hóa đơn tháng cũ trong `bill_details` vẫn giữ nguyên giá cũ, đảm bảo lịch sử tài chính chính xác tuyệt đối.

#### 🔹 Bảng `transactions` (Giao dịch thanh toán)
* **Chức năng:** Lưu lịch sử mỗi lần khách trả tiền.
* **Logic:**
    * Một hóa đơn (`bills`) có thể được trả làm nhiều lần (`transactions`).
    * Khi Admin nhận tiền (Tiền mặt hoặc Chuyển khoản), một dòng mới được tạo ra ở đây.
    * Tổng `amount` của các transaction liên quan sẽ được cộng lại để cập nhật vào cột `paid_amount` trong bảng `bills`.
* [cite_start]**Mapping yêu cầu:** Đáp ứng US05, US06[cite: 8, 9].

---

## 3. Luồng nghiệp vụ mẫu (Workflow Scenarios)

### Kịch bản A: Chốt phí cuối tháng
1.  **Admin** tạo một bản ghi `bills` mới cho hộ **A101** (Kỳ tháng 11).
2.  **Admin** nhập chỉ số điện/nước/gửi xe vào bảng `bill_details`.
3.  Hệ thống tính toán: `Total = (Số điện * Giá điện) + (Số nước * Giá nước) + ...`
4.  Cập nhật `total_amount` vào bảng `bills`.
5.  Trạng thái hóa đơn là `UNPAID`.

### Kịch bản B: Cư dân đóng tiền
1.  Cư dân **A101** đến đóng tiền mặt.
2.  **Admin** tìm hóa đơn tháng 11 của A101.
3.  **Admin** tạo một bản ghi vào bảng `transactions`:
    * `amount`: Số tiền khách đưa.
    * `payment_method`: 'CASH'.
4.  Hệ thống cập nhật bảng `bills`:
    * Tăng `paid_amount`.
    * Nếu `paid_amount` >= `total_amount` -> Cập nhật `payment_status` = 'PAID'.

### Kịch bản C: Tra cứu & Bảo mật
1.  **Cư dân** đăng nhập -> Hệ thống query bảng `households` theo `user_id` -> Lấy được danh sách `bills` của chính họ.
2.  **Admin** sửa giá tiền của một hóa đơn đã cũ -> Hệ thống tự động insert một dòng vào `audit_logs` ghi lại hành động này để đối soát sau này.

---

## 4. Quy ước đặt tên (Naming Convention)

* **Tên bảng:** Số nhiều, chữ thường, snake_case (vd: `users`, `fee_types`).
* **Khóa chính:** `[table_name_singular]_id` (vd: `user_id`, `bill_id`).
* **Khóa ngoại:** Tên giống khóa chính của bảng tham chiếu.
* **Ngôn ngữ:** Tiếng Anh hoàn toàn.