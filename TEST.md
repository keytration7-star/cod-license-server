# Hướng dẫn Test License Server

## Bước 1: Khởi động Server

```bash
cd license-server
npm install
npm start
```

Server sẽ chạy tại: http://localhost:3000

## Bước 2: Test API Endpoints

### 2.1. Test lấy danh sách gói
```bash
curl http://localhost:3000/api/packages
```

Kết quả mong đợi:
```json
{
  "success": true,
  "packages": {
    "trial": {...},
    "1month": {...},
    "3months": {...},
    ...
  }
}
```

### 2.2. Test tạo đơn hàng
```bash
curl -X POST http://localhost:3000/api/create-order \
  -H "Content-Type: application/json" \
  -d '{
    "packageType": "1month",
    "customerEmail": "test@example.com",
    "customerPhone": "0123456789"
  }'
```

Kết quả mong đợi:
```json
{
  "success": true,
  "orderId": 1,
  "orderCode": "1234567890",
  "paymentLink": "https://pay.payos.vn/web/...",
  "paymentLinkId": "..."
}
```

### 2.3. Test kiểm tra trạng thái đơn hàng
```bash
curl http://localhost:3000/api/order/1234567890
```

### 2.4. Test webhook (giả lập)
```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "code": "00",
    "desc": "Success",
    "data": {
      "orderCode": 1234567890,
      "amount": 299000,
      "description": "Thanh toán gói 1 tháng",
      "accountNumber": "1234567890",
      "reference": "PAYOS123",
      "transactionDateTime": "2024-01-01T10:00:00Z",
      "currency": "VND",
      "paymentLinkId": "...",
      "code": "00",
      "desc": "Success",
      "counterAccountBankId": null,
      "counterAccountBankName": null,
      "counterAccountName": null,
      "counterAccountNumber": null,
      "virtualAccountName": null,
      "virtualAccountNumber": null,
      "id": "...",
      "status": "PAID"
    },
    "signature": "..."
  }'
```

## Bước 3: Test trong App

1. Khởi động app Electron
2. Mở "Quản lý License"
3. Chọn tab "Mua License"
4. Chọn gói và thanh toán
5. Kiểm tra xem license có được kích hoạt tự động không

## Bước 4: Cấu hình Webhook PayOS

1. Đăng nhập PayOS Dashboard
2. Vào phần "Webhook" hoặc "Cài đặt"
3. Thêm webhook URL:
   - **Local test**: Dùng ngrok: `ngrok http 3000` → lấy URL
   - **Production**: `https://your-domain.com/api/webhook`

## Troubleshooting

### Server không khởi động
- Kiểm tra port 3000 có bị chiếm không: `netstat -ano | findstr :3000`
- Kiểm tra file `.env` có đúng không

### API trả về lỗi
- Kiểm tra PayOS API keys trong `.env`
- Xem logs trong console

### Webhook không hoạt động
- Kiểm tra URL webhook trong PayOS Dashboard
- Dùng ngrok để test local
- Kiểm tra signature verification

