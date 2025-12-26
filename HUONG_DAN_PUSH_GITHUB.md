# ✅ Đã chuẩn bị xong! Bước tiếp theo:

## Bước 1: Tạo Repository trên GitHub

1. **Vào GitHub:**
   - Truy cập: https://github.com
   - Đăng nhập (hoặc đăng ký nếu chưa có)

2. **Tạo repository mới:**
   - Click nút **"+"** ở góc trên bên phải → **"New repository"**
   - **Repository name:** `cod-license-server`
   - **Description:** `License Server for COD Management App`
   - Chọn **Public** hoặc **Private** (tùy bạn)
   - ⚠️ **QUAN TRỌNG:** 
     - ❌ KHÔNG tick "Add a README file"
     - ❌ KHÔNG tick "Add .gitignore" (đã có sẵn)
     - ❌ KHÔNG tick "Choose a license"
   - Click **"Create repository"**

3. **Copy URL:**
   - GitHub sẽ hiển thị URL như: `https://github.com/YOUR_USERNAME/cod-license-server.git`
   - Copy URL này (sẽ dùng ở bước sau)

## Bước 2: Push code lên GitHub

Sau khi tạo repository xong, chạy lệnh sau trong Command Prompt:

```bash
cd f:\quan_ly_khach_hang_cod\license-server
git remote add origin https://github.com/YOUR_USERNAME/cod-license-server.git
git branch -M main
git push -u origin main
```

**Thay `YOUR_USERNAME` bằng GitHub username của bạn!**

Ví dụ: Nếu username là `john`, thì URL sẽ là:
```
https://github.com/john/cod-license-server.git
```

## Bước 3: Xác thực (nếu được hỏi)

Khi push, GitHub có thể yêu cầu đăng nhập:
- **Username:** GitHub username của bạn
- **Password:** Dùng **Personal Access Token** (KHÔNG phải password thường)

### Tạo Personal Access Token:

1. Vào: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Đặt tên: `License Server Push`
4. Chọn scope: ✅ **repo** (full control)
5. Click **"Generate token"**
6. **Copy token ngay** (chỉ hiển thị 1 lần!)
7. Dùng token này làm password khi push

## Hoặc dùng Script Tự Động

Tôi đã tạo 2 script để tự động hóa:

### Script 1: `push-to-github.bat`
- Khởi tạo git (nếu chưa có)
- Add và commit files
- Hiển thị hướng dẫn

### Script 2: `push-to-github-step2.bat`
- Tự động push lên GitHub
- Chỉ cần nhập username

**Cách dùng:**
1. Chạy `push-to-github.bat` (đã chạy xong)
2. Tạo repository trên GitHub (bước 1 ở trên)
3. Chạy `push-to-github-step2.bat` và nhập username

## Kiểm tra

Sau khi push thành công, vào:
```
https://github.com/YOUR_USERNAME/cod-license-server
```

Bạn sẽ thấy tất cả files đã được upload! ✅

## Bước tiếp theo: Deploy lên Railway

Sau khi code đã trên GitHub:

1. **Vào Railway:**
   - https://railway.app
   - Đăng ký bằng GitHub

2. **Deploy:**
   - Click "New Project"
   - Chọn "Deploy from GitHub repo"
   - Chọn repository `cod-license-server`
   - Railway tự động deploy!

3. **Cấu hình:**
   - Thêm Environment Variables (PayOS keys)
   - Lấy URL server
   - Cập nhật trong app

---

## Lưu ý

⚠️ **File `.env` KHÔNG được push lên GitHub** (đã có trong .gitignore)
- Khi deploy trên Railway, bạn cần thêm Environment Variables thủ công
- PayOS keys sẽ được thêm trong Railway dashboard

✅ **Các files đã được commit:**
- ✅ server.js
- ✅ package.json
- ✅ database.js
- ✅ payos.js
- ✅ license.js
- ✅ public/index.html
- ✅ Tất cả files cần thiết

