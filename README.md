# License Server - Hệ Thống Đối Soát COD

Server quản lý license và thanh toán cho ứng dụng Hệ Thống Đối Soát COD Tự Động.

## Tính năng

- ✅ Tích hợp PayOS để thanh toán tự động
- ✅ Tạo và quản lý license keys
- ✅ Webhook tự động xác nhận thanh toán
- ✅ API để app kích hoạt license
- ✅ Database SQLite để lưu trữ orders và licenses

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Cấu hình `.env`:
```bash
cp .env.example .env
# Chỉnh sửa .env với thông tin PayOS của bạn
```

3. Khởi động server:
```bash
npm start
# hoặc development mode:
npm run dev
```

## Cấu hình

### Biến môi trường (.env)

```env
# PayOS Configuration
PAYOS_CLIENT_ID=your_client_id
PAYOS_API_KEY=your_api_key
PAYOS_CHECKSUM_KEY=your_checksum_key

# Server Configuration
PORT=3000
LICENSE_SERVER_URL=http://localhost:3000
```

### Cấu hình Webhook PayOS

1. Đăng nhập PayOS Dashboard
2. Vào phần "Webhook"
3. Thêm webhook URL: `https://your-domain.com/api/webhook`
4. Lưu lại

## API Endpoints

### GET /api/packages
Lấy danh sách các gói license

### POST /api/create-order
Tạo đơn hàng và link thanh toán
```json
{
  "packageType": "1month",
  "customerEmail": "user@example.com",
  "customerPhone": "0123456789",
  "machineId": "machine-id-123"
}
```

### POST /api/webhook
Webhook từ PayOS (tự động)

### GET /api/order/:orderCode
Kiểm tra trạng thái đơn hàng

### POST /api/activate-license
Kích hoạt license từ app
```json
{
  "licenseKey": "PAID-20240101-ABC123",
  "machineId": "machine-id-123"
}
```

### GET /api/license/:licenseKey
Lấy thông tin license

## Database Schema

### orders
- id, order_code, customer_email, customer_phone
- package_type, package_duration, amount
- status, payos_payment_link_id, payos_transaction_id
- created_at, updated_at

### licenses
- id, license_key, order_id, machine_id
- package_type, duration_days
- activated_at, expires_at, status
- created_at

### license_usage
- id, license_key, machine_id, activated_at

## Deploy

### VPS/Server
1. Clone repository
2. Cài đặt Node.js
3. Cấu hình `.env`
4. Chạy `npm start`
5. Dùng PM2 hoặc systemd để chạy background

### Cloud Services
- **Vercel**: Deploy dễ dàng
- **Railway**: Hỗ trợ Node.js tốt
- **Render**: Free tier available
- **Heroku**: Có thể dùng (có phí)

## Bảo mật

⚠️ **Quan trọng:**
- Không commit file `.env` vào Git
- Sử dụng HTTPS khi deploy production
- Bảo vệ API endpoints với rate limiting
- Validate tất cả input từ client

## Troubleshooting

### Webhook không hoạt động
- Kiểm tra URL webhook trong PayOS Dashboard
- Đảm bảo server có thể nhận request từ internet
- Kiểm tra firewall/port

### License không kích hoạt
- Kiểm tra database connection
- Xem logs để tìm lỗi
- Kiểm tra machine_id có đúng không

