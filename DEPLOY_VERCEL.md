# Hướng dẫn Deploy lên Vercel (Chi tiết)

## Bước 1: Chuẩn bị code

1. **Đảm bảo code đã sẵn sàng:**
   - Folder `license-server` có đầy đủ files
   - File `package.json` có đúng scripts

2. **Tạo file `vercel.json` (nếu cần):**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
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

## Bước 3: Deploy lên Vercel

1. **Đăng ký Vercel:**
   - Truy cập: https://vercel.com
   - Click "Sign Up"
   - Chọn "Continue with GitHub"
   - Authorize Vercel

2. **Tạo project mới:**
   - Click "Add New..." → "Project"
   - Chọn repository `cod-license-server`
   - Click "Import"

3. **Cấu hình project:**
   - **Framework Preset**: Other
   - **Root Directory**: `./` (hoặc để trống nếu code ở root)
   - **Build Command**: (để trống)
   - **Output Directory**: (để trống)
   - **Install Command**: `npm install`
   - **Start Command**: `npm start`

4. **Thêm Environment Variables:**
   - Click "Environment Variables"
   - Thêm từng biến:
     - `PAYOS_CLIENT_ID` = `a9d73055-d322-41ce-874c-89499ce1f2a2`
     - `PAYOS_API_KEY` = `f5ef7cf8-94d0-4ca9-836e-daa97ad310c7`
     - `PAYOS_CHECKSUM_KEY` = `fe4ac213e3346430205cce8da26a7edebe56385cbe4e36ed7030ee59f8760395`
     - `PORT` = `3000` (Vercel tự động set, không cần)
     - `LICENSE_SERVER_URL` = (sẽ set sau khi deploy xong)

5. **Deploy:**
   - Click "Deploy"
   - Đợi vài phút để deploy xong

6. **Lấy URL:**
   - Sau khi deploy xong, Vercel sẽ cho URL: `https://cod-license-server.vercel.app`
   - Copy URL này

7. **Cập nhật LICENSE_SERVER_URL:**
   - Vào Settings → Environment Variables
   - Sửa `LICENSE_SERVER_URL` = `https://cod-license-server.vercel.app`
   - Redeploy để áp dụng

## Bước 4: Test

1. **Test API:**
   - Mở browser: `https://cod-license-server.vercel.app/api/packages`
   - Nếu thấy JSON response → OK ✅

2. **Test Dashboard:**
   - Mở: `https://cod-license-server.vercel.app`
   - Nếu thấy dashboard → OK ✅

## Bước 5: Cấu hình Webhook PayOS

1. **Đăng nhập PayOS Dashboard:**
   - Truy cập: https://payos.vn
   - Đăng nhập

2. **Vào phần Webhook:**
   - Tìm phần "Webhook" hoặc "Cài đặt"
   - Thêm webhook URL: `https://cod-license-server.vercel.app/api/webhook`
   - Lưu lại

## Bước 6: Cập nhật App

1. **Cập nhật URL trong app:**
   - Mở `src/config/licenseServer.ts`
   - Thay đổi:
   ```typescript
   return 'https://cod-license-server.vercel.app';
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

## Troubleshooting

### Lỗi: "Module not found"
- Kiểm tra `package.json` có đúng dependencies không
- Vercel tự động chạy `npm install`, nhưng cần đảm bảo có `package.json`

### Lỗi: "Port already in use"
- Vercel tự động set PORT, không cần set trong code
- Đảm bảo code dùng `process.env.PORT || 3000`

### Lỗi: "Database error"
- SQLite có thể không hoạt động tốt trên Vercel (serverless)
- Cân nhắc dùng Railway hoặc Render thay vì Vercel cho database

### Lỗi: "CORS error"
- Đã có `app.use(cors())` trong code
- Nếu vẫn lỗi, kiểm tra lại cấu hình

## Lưu ý

⚠️ **Vercel là serverless:**
- Mỗi request sẽ khởi động function mới
- Database SQLite có thể bị reset mỗi lần
- **Khuyến nghị**: Dùng Railway hoặc Render thay vì Vercel cho app có database

✅ **Nên dùng Railway hoặc Render** cho app này vì:
- Hỗ trợ database tốt hơn
- Server chạy liên tục
- Phù hợp với SQLite

