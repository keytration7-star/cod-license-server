# Hướng dẫn Push Code lên GitHub

## Cách 1: Dùng Script Tự Động (Dễ nhất)

### Bước 1: Chạy script đầu tiên
```bash
push-to-github.bat
```

Script này sẽ:
- Kiểm tra git đã cài chưa
- Khởi tạo git repository (nếu chưa có)
- Add tất cả files
- Commit changes
- Hiển thị hướng dẫn tạo repository trên GitHub

### Bước 2: Tạo repository trên GitHub

1. **Vào GitHub:**
   - Truy cập: https://github.com
   - Đăng nhập (hoặc đăng ký nếu chưa có)

2. **Tạo repository mới:**
   - Click nút **"+"** ở góc trên bên phải
   - Chọn **"New repository"**
   - Đặt tên: `cod-license-server`
   - Chọn **Public** hoặc **Private** (tùy bạn)
   - **KHÔNG** tick "Initialize with README"
   - **KHÔNG** tick "Add .gitignore" (đã có sẵn)
   - **KHÔNG** tick "Choose a license"
   - Click **"Create repository"**

3. **Copy URL repository:**
   - GitHub sẽ hiển thị URL như: `https://github.com/your-username/cod-license-server.git`
   - Copy URL này

### Bước 3: Chạy script bước 2
```bash
push-to-github-step2.bat
```

Script sẽ hỏi:
- GitHub username của bạn
- Tự động push code lên GitHub

**Lưu ý:** Nếu yêu cầu đăng nhập:
- Username: GitHub username của bạn
- Password: Dùng **Personal Access Token** (không phải password)
  - Tạo token: https://github.com/settings/tokens
  - Click "Generate new token (classic)"
  - Chọn scope: `repo` (full control)
  - Copy token và dùng làm password

---

## Cách 2: Làm Thủ Công

### Bước 1: Khởi tạo git
```bash
cd license-server
git init
```

### Bước 2: Add files
```bash
git add .
```

### Bước 3: Commit
```bash
git commit -m "Initial commit - License Server"
```

### Bước 4: Tạo repository trên GitHub
- Vào https://github.com/new
- Đặt tên: `cod-license-server`
- Click "Create repository"

### Bước 5: Push code
```bash
git remote add origin https://github.com/YOUR_USERNAME/cod-license-server.git
git branch -M main
git push -u origin main
```

Thay `YOUR_USERNAME` bằng GitHub username của bạn.

---

## Cách 3: Dùng GitHub Desktop (GUI)

1. **Tải GitHub Desktop:**
   - https://desktop.github.com

2. **Mở GitHub Desktop:**
   - File → Add Local Repository
   - Chọn folder `license-server`

3. **Tạo repository trên GitHub:**
   - Publish repository
   - Đặt tên: `cod-license-server`
   - Click "Publish repository"

---

## Kiểm tra

Sau khi push thành công, vào:
```
https://github.com/YOUR_USERNAME/cod-license-server
```

Bạn sẽ thấy tất cả files đã được upload.

---

## Troubleshooting

### Lỗi: "Git is not installed"
- Tải và cài Git: https://git-scm.com/download/win
- Restart lại terminal/command prompt

### Lỗi: "Authentication failed"
- Dùng Personal Access Token thay vì password
- Tạo token: https://github.com/settings/tokens

### Lỗi: "Repository not found"
- Đảm bảo đã tạo repository trên GitHub
- Kiểm tra URL có đúng không
- Kiểm tra username có đúng không

### Lỗi: "Permission denied"
- Kiểm tra bạn có quyền truy cập repository không
- Nếu là private repo, đảm bảo đã đăng nhập đúng tài khoản

---

## Sau khi push thành công

1. **Vào Railway:**
   - https://railway.app
   - Đăng ký bằng GitHub

2. **Deploy:**
   - New Project → Deploy from GitHub repo
   - Chọn `cod-license-server`
   - Railway tự động deploy

3. **Cấu hình:**
   - Thêm Environment Variables (PayOS keys)
   - Lấy URL server
   - Cập nhật trong app

