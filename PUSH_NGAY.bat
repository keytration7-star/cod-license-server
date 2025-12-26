@echo off
chcp 65001 >nul
echo ========================================
echo   PUSH CODE LÊN GITHUB - TỰ ĐỘNG
echo ========================================
echo.

REM Kiểm tra git
git --version >nul 2>&1
if errorlevel 1 (
    echo [LỖI] Git chưa được cài đặt!
    echo Vui lòng cài Git: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo [✓] Git đã được cài đặt
echo.

REM Kiểm tra đã có remote chưa
git remote -v >nul 2>&1
if errorlevel 1 (
    echo [THÔNG BÁO] Chưa có remote GitHub
    echo.
    echo Bạn cần tạo repository trên GitHub trước:
    echo.
    echo 1. Vào https://github.com/new
    echo 2. Đặt tên: cod-license-server
    echo 3. KHÔNG tick bất kỳ option nào
    echo 4. Click "Create repository"
    echo.
    set /p GITHUB_USERNAME="Nhập GitHub username của bạn: "
    if "%GITHUB_USERNAME%"=="" (
        echo [LỖI] Username không được để trống!
        pause
        exit /b 1
    )
    
    set REPO_URL=https://github.com/%GITHUB_USERNAME%/cod-license-server.git
    echo.
    echo [1/3] Thêm remote GitHub...
    git remote add origin %REPO_URL%
    echo       Đã thêm: %REPO_URL%
) else (
    echo [✓] Remote đã được cấu hình
    git remote -v
    echo.
)

echo [2/3] Set branch main...
git branch -M main
echo       Đã set branch main
echo.

echo [3/3] Push code lên GitHub...
echo.
echo Đang push... (Có thể yêu cầu đăng nhập)
echo.
echo LƯU Ý: Nếu được hỏi đăng nhập:
echo   - Username: GitHub username của bạn
echo   - Password: Dùng Personal Access Token (KHÔNG phải password)
echo   - Tạo token: https://github.com/settings/tokens
echo.

git push -u origin main

if errorlevel 1 (
    echo.
    echo [LỖI] Push thất bại!
    echo.
    echo Kiểm tra:
    echo   1. Đã tạo repository trên GitHub chưa?
    echo   2. URL repository có đúng không?
    echo   3. Đã đăng nhập GitHub chưa?
    echo.
    echo Nếu chưa tạo repository:
    echo   1. Vào https://github.com/new
    echo   2. Đặt tên: cod-license-server
    echo   3. Click "Create repository"
    echo   4. Chạy lại script này
    echo.
) else (
    echo.
    echo ========================================
    echo   [THÀNH CÔNG] Đã push code lên GitHub!
    echo ========================================
    echo.
    git remote -v | findstr origin
    echo.
    echo Bước tiếp theo:
    echo   1. Vào https://railway.app
    echo   2. Đăng ký bằng GitHub
    echo   3. Click "New Project" - "Deploy from GitHub repo"
    echo   4. Chọn repository: cod-license-server
    echo   5. Railway sẽ tự động deploy!
    echo.
)

pause

