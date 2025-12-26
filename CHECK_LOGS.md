# Cách kiểm tra Logs trên Railway

## Bước 1: Vào Railway Dashboard

1. Vào: https://railway.app
2. Chọn project: `disciplined-empathy`
3. Click vào service: `cod-license-server`

## Bước 2: Xem Logs

1. Click tab **"Logs"** ở trên cùng
2. Bạn sẽ thấy logs real-time của server
3. Tìm các dòng có chứa:
   - `PayOS createPaymentLink error`
   - `Create order error`
   - Hoặc bất kỳ error nào

## Bước 3: Test lại trong App

1. Khởi động lại app
2. Thử tạo đơn hàng lại
3. Xem logs trên Railway để thấy lỗi cụ thể

## Lỗi thường gặp:

### Lỗi: "Invalid API key"
- Kiểm tra Environment Variables trên Railway
- Đảm bảo `PAYOS_API_KEY` đúng

### Lỗi: "Invalid checksum"
- PayOS có thể yêu cầu format khác
- Cần kiểm tra tài liệu PayOS

### Lỗi: "Order code already exists"
- Order code bị trùng
- Cần tạo order code unique hơn

## Sau khi xem logs

Copy error message từ logs và gửi cho tôi để tôi sửa chính xác hơn.

