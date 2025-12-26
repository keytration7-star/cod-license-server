# Hướng dẫn Setup License Server

## Bước 1: Cài đặt

```bash
cd license-server
npm install
```

## Bước 2: Cấu hình

1. File `.env` đã được tạo với API keys của bạn
2. Kiểm tra lại các thông tin:
   - `PAYOS_CLIENT_ID`
   - `PAYOS_API_KEY`
   - `PAYOS_CHECKSUM_KEY`
   - `LICENSE_SERVER_URL` (thay đổi khi deploy)

## Bước 3: Khởi động server

### Development:
```bash
npm run dev
```

### Production:
```bash
npm start
```

Server sẽ chạy tại: http://localhost:3000

## Bước 4: Cấu hình Webhook PayOS

1. Đăng nhập PayOS Dashboard: https://payos.vn/
2. Vào phần "Webhook" hoặc "Cài đặt"
3. Thêm webhook URL:
   - **Development**: `http://localhost:3000/api/webhook` (dùng ngrok để test)
   - **Production**: `https://your-domain.com/api/webhook`

## Bước 5: Test

1. Mở browser: http://localhost:3000/api/packages
2. Kiểm tra xem có trả về danh sách gói không

## Deploy lên Server

### Option 1: VPS (khuyến nghị)

1. Upload code lên VPS
2. Cài đặt Node.js
3. Chạy `npm install`
4. Cấu hình `.env` với thông tin production
5. Dùng PM2 để chạy:
```bash
npm install -g pm2
pm2 start server.js --name license-server
pm2 save
pm2 startup
```

### Option 2: Cloud Services

- **Vercel**: Deploy dễ dàng, có free tier
- **Railway**: Hỗ trợ Node.js tốt
- **Render**: Free tier available

## Cấu hình App

Trong app Electron, cần cấu hình URL của license server:

1. Tạo file config hoặc dùng environment variable
2. URL mặc định: `http://localhost:3000` (development)
3. URL production: `https://your-domain.com`

## Troubleshooting

### Webhook không hoạt động
- Kiểm tra URL webhook trong PayOS Dashboard
- Đảm bảo server có thể nhận request từ internet
- Dùng ngrok để test local: `ngrok http 3000`

### License không kích hoạt
- Kiểm tra database connection
- Xem logs: `pm2 logs license-server`
- Kiểm tra machine_id có đúng không

