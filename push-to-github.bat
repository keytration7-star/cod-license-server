@echo off
echo ========================================
echo   Push License Server len GitHub
echo ========================================
echo.

REM Kiểm tra xem đã có git chưa
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git chua duoc cai dat!
    echo Vui long cai dat Git: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo [1/5] Kiem tra git repository...
if exist .git (
    echo       Git repository da ton tai.
) else (
    echo [2/5] Khoi tao git repository...
    git init
    echo       Da khoi tao git repository.
)

echo [3/5] Them files vao git...
git add .
echo       Da them files.

echo [4/5] Commit changes...
git commit -m "Initial commit - License Server" 2>nul
if errorlevel 1 (
    echo       Khong co thay doi nao de commit.
) else (
    echo       Da commit.
)

echo.
echo [5/5] Huong dan push len GitHub:
echo.
echo   1. Vao https://github.com
echo   2. Click "New repository" (hoac "+" o goc tren ben phai)
echo   3. Dat ten: cod-license-server
echo   4. Chon Public hoac Private
echo   5. KHONG tick "Initialize with README"
echo   6. Click "Create repository"
echo.
echo   7. Sau khi tao xong, GitHub se hien URL nhu:
echo      https://github.com/your-username/cod-license-server.git
echo.
echo   8. Chay lenh sau (thay YOUR_USERNAME bang username cua ban):
echo.
echo      git remote add origin https://github.com/YOUR_USERNAME/cod-license-server.git
echo      git branch -M main
echo      git push -u origin main
echo.
echo   HOAC chay script: push-to-github-step2.bat (sau khi tao repo)
echo.

pause

