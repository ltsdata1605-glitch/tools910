
# BI Dashboard Pro - Công cụ Phân tích Doanh thu & Thi đua

BI Dashboard Pro là một ứng dụng web hiện đại, mạnh mẽ dành cho việc quản lý hiệu suất kinh doanh tại các siêu thị. Ứng dụng tập trung vào việc xử lý dữ liệu từ hệ thống BI, phân tích hiệu quả nhân viên và tích hợp Trợ lý AI (Gemini) để đưa ra các nhận định kinh doanh thông minh.

## 🚀 Tính năng nổi bật

- **Tổng quan Siêu thị**: Theo dõi Realtime và Luỹ kế doanh thu, Target vượt trội, hiệu quả quy đổi (HQQĐ).
- **Phân tích Nhân viên**: 
  - Bảng doanh thu chi tiết kèm Avatar nhân viên.
  - Theo dõi trả góp/trả chậm chuyên sâu.
  - Quản lý thi đua nhóm hàng linh hoạt.
- **Trợ lý AI (Gemini)**: Phân tích dữ liệu tự động, đề xuất giải pháp cải thiện doanh số dựa trên dữ liệu thực tế.
- **Tùy biến mạnh mẽ**: Thay đổi tên nhóm thi đua, cấu hình màu sắc ngưỡng hiệu suất (Tốt/TB/Yếu).
- **Sao lưu & Khôi phục**: Xuất toàn bộ dữ liệu ra file JSON để chuyển thiết bị mà không mất cấu hình Target.
- **Xuất báo cáo PNG**: Công nghệ chụp ảnh bảng biểu chất lượng cao để chia sẻ nhanh qua Zalo/Telegram.
- **Offline-first**: Sử dụng IndexedDB để lưu trữ dữ liệu bền vững ngay trên trình duyệt.

## 🛠 Hướng dẫn Cài đặt (Local Development)

1. **Clone dự án:**
   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
   ```

2. **Cài đặt thư viện:**
   ```bash
   npm install
   ```

3. **Cấu hình API Key:**
   Tạo file `.env` ở thư mục gốc và thêm key của bạn:
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

4. **Chạy dự án:**
   ```bash
   npm run dev
   ```

## 📸 Snapshot & Bảo mật
- Dữ liệu hoàn toàn nằm trên thiết bị của người dùng (IndexedDB).
- Ứng dụng hỗ trợ lưu trữ Snapshot lịch sử để so sánh tăng trưởng giữa các ngày.

## 📄 Giấy phép
Dự án được phát triển phục vụ mục đích quản trị nội bộ siêu thị.
