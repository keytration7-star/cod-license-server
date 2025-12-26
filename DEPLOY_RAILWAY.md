# Hướng dẫn Deploy lên Railway (Khuyến nghị)

## Bước 1: Chuẩn bị code

1. **Đảm bảo code đã sẵn sàng:**
   - Folder `license-server` có đầy đủ files
   - File `package.json` có đúng scripts

2. **Tạo file `Procfile` (tùy chọn):**
```
web: node server.js
```

## Bước 2: Push code lên GitHub

1. **Tạo repository mới trên GitHub:**
   - Vào https://github.com
   - Click "New repository"
   - Đặt tên: `cod-license-server`
   - Chọn Public hoặc Private
   - Click "Create repository"

2. **Push code lên GitHub:**
```bash
cd license-server
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/cod-license-server.git
git push -u origin main
```

## Bước 3: Deploy lên Railway

1. **Đăng ký Railway:**
   - Truy cập: https://railway.app
   - Click "Start a New Project"
   - Chọn "Login with GitHub"
   - Authorize Railway

2. **Tạo project mới:**
   - Click "New Project"
   - Chọn "Deploy from GitHub repo"
   - Chọn repository `cod-license-server`
   - Railway tự động detect Node.js

3. **Cấu hình:**
   - Railway tự động detect `package.json`
   - Tự động chạy `npm install` và `npm start`
   - Không cần cấu hình thêm

4. **Thêm Environment Variables:**
   - Click vào project
   - Vào tab "Variables"
   - Thêm từng biến:
     - `PAYOS_CLIENT_ID` = `a9d73055-d322-41ce-874c-89499ce1f2a2`
     - `PAYOS_API_KEY` = `f5ef7cf8-94d0-4ca9-836e-daa97ad310c7`
     - `PAYOS_CHECKSUM_KEY` = `fe4ac213e3346430205cce8da26a7edebe56385cbe4e36ed7030ee59f8760395`
     - `PORT` = `3000` (Railway tự động set, không cần)
     - `LICENSE_SERVER_URL` = (sẽ set sau khi deploy xong)

5. **Lấy URL:**
   - Railway tự động tạo domain: `https://your-project.up.railway.app`
   - Hoặc click "Generate Domain" để tạo domain tùy chỉnh
   - Copy URL này

6. **Cập nhật LICENSE_SERVER_URL:**
   - Vào Variables
   - Sửa `LICENSE_SERVER_URL` = `https://your-project.up.railway.app`
   - Railway tự động redeploy

## Bước 4: Test

1. **Test API:**
   - Mở browser: `https://your-project.up.railway.app/api/packages`
   - Nếu thấy JSON response → OK ✅

2. **Test Dashboard:**
   - Mở: `https://your-project.up.railway.app`
   - Nếu thấy dashboard → OK ✅

## Bước 5: Cấu hình Webhook PayOS

1. **Đăng nhập PayOS Dashboard:**
   - Truy cập: https://payos.vn
   - Đăng nhập

2. **Vào phần Webhook:**
   - Tìm phần "Webhook" hoặc "Cài đặt"
   - Thêm webhook URL: `https://your-project.up.railway.app/api/webhook`
   - Lưu lại

## Bước 6: Cập nhật App

1. **Cập nhật URL trong app:**
   - Mở `src/config/licenseServer.ts`
   - Thay đổi:
   ```typescript
   return 'https://your-project.up.railway.app';
   ```

2. **Build lại app:**
   ```bash
   npm run build:react
   npm run build:electron
   ```

3. **Test trong app:**
   - Khởi động app
   - Mở "Quản lý License" → "Mua License"
   - Test thanh toán

## Ưu điểm Railway

✅ **Hỗ trợ database tốt:**
- SQLite hoạt động ổn định
- Có thể dùng PostgreSQL nếu cần (Railway có sẵn)

✅ **Server chạy liên tục:**
- Không bị sleep như Vercel
- Phù hợp với webhook

✅ **Dễ dùng:**
- Tự động detect Node.js
- Tự động deploy khi push code

✅ **Miễn phí:**
- Có free tier
- Đủ dùng cho bắt đầu

## Troubleshooting

### Lỗi: "Application failed to respond"
- Kiểm tra logs trong Railway dashboard
- Đảm bảo server chạy đúng port (Railway tự set PORT)

### Lỗi: "Database error"
- Kiểm tra file `license.db` có được tạo không
- Railway có thể reset file khi redeploy
- Cân nhắc dùng Railway PostgreSQL (có sẵn)

### Lỗi: "Environment variable not found"
- Kiểm tra Variables trong Railway dashboard
- Đảm bảo đã thêm đầy đủ biến

## Lưu ý

⚠️ **Database persistence:**
- Railway có thể reset file khi redeploy
- Nên backup database định kỳ
- Hoặc dùng Railway PostgreSQL (persistent hơn)

✅ **Railway là lựa chọn tốt nhất** cho app này vì:
- Hỗ trợ database tốt
- Server chạy liên tục
- Dễ deploy và quản lý

