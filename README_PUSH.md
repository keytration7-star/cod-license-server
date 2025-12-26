# ✅ ĐÃ CHUẨN BỊ XONG!

Code đã được commit và sẵn sàng push lên GitHub.

## 🚀 CÁCH NHANH NHẤT - Chạy Script Tự Động:

### Bước 1: Tạo Repository trên GitHub

1. **Vào:** https://github.com/new
2. **Repository name:** `cod-license-server`
3. **Description:** `License Server for COD Management App` (tùy chọn)
4. **Chọn:** Public hoặc Private
5. ⚠️ **QUAN TRỌNG:** 
   - ❌ KHÔNG tick "Add a README file"
   - ❌ KHÔNG tick "Add .gitignore"
   - ❌ KHÔNG tick "Choose a license"
6. **Click:** "Create repository"

### Bước 2: Chạy Script

**Double-click file:** `PUSH_NGAY.bat`

Script sẽ:
- Tự động hỏi GitHub username của bạn
- Tự động thêm remote
- Tự động push code lên GitHub

**Nếu được hỏi đăng nhập:**
- **Username:** GitHub username của bạn
- **Password:** Dùng **Personal Access Token** (KHÔNG phải password thường)
  - Tạo token: https://github.com/settings/tokens
  - Click "Generate new token (classic)"
  - Chọn scope: ✅ **repo**
  - Copy token và dùng làm password

---

## 📋 CÁCH THỦ CÔNG (Nếu script không chạy):

### Bước 1: Tạo Repository trên GitHub
- Vào: https://github.com/new
- Đặt tên: `cod-license-server`
- Click "Create repository"

### Bước 2: Push code

Mở Command Prompt trong folder `license-server` và chạy:

```bash
git remote add origin https://github.com/YOUR_USERNAME/cod-license-server.git
git branch -M main
git push -u origin main
```

**Thay `YOUR_USERNAME` bằng GitHub username của bạn!**

---

## ✅ KIỂM TRA

Sau khi push thành công, vào:
```
https://github.com/YOUR_USERNAME/cod-license-server
```

Bạn sẽ thấy tất cả files đã được upload! ✅

---

## 🎯 BƯỚC TIẾP THEO: Deploy lên Railway

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
   - Thêm Environment Variables:
     - `PAYOS_CLIENT_ID`
     - `PAYOS_API_KEY`
     - `PAYOS_CHECKSUM_KEY`
     - `LICENSE_SERVER_URL` = (URL Railway sẽ cho)
   - Lấy URL server
   - Cập nhật trong app (`src/config/licenseServer.ts`)

---

## 📝 LƯU Ý

✅ **Đã commit:**
- Tất cả files cần thiết
- Không có file `.env` (bảo mật)
- Không có `node_modules` (sẽ cài khi deploy)

⚠️ **Khi deploy trên Railway:**
- Cần thêm Environment Variables thủ công
- PayOS keys sẽ được thêm trong Railway dashboard
- Database (`license.db`) sẽ được tạo tự động

---

## 🆘 TROUBLESHOOTING

### Lỗi: "Repository not found"
- Đảm bảo đã tạo repository trên GitHub
- Kiểm tra username có đúng không

### Lỗi: "Authentication failed"
- Dùng Personal Access Token thay vì password
- Tạo token: https://github.com/settings/tokens

### Lỗi: "Permission denied"
- Kiểm tra bạn có quyền truy cập repository không
- Nếu là private repo, đảm bảo đã đăng nhập đúng tài khoản

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề, kiểm tra:
1. Git đã được cài đặt chưa? (`git --version`)
2. Đã tạo repository trên GitHub chưa?
3. Username có đúng không?
4. Đã dùng Personal Access Token chưa?

