@echo off
echo ========================================
echo   Push License Server len GitHub (Buoc 2)
echo ========================================
echo.
echo Vui long nhap thong tin:
echo.

set /p GITHUB_USERNAME="Nhap GitHub username cua ban: "
if "%GITHUB_USERNAME%"=="" (
    echo [ERROR] Username khong duoc de trong!
    pause
    exit /b 1
)

set REPO_NAME=cod-license-server
set GITHUB_URL=https://github.com/%GITHUB_USERNAME%/%REPO_NAME%.git

echo.
echo [1/4] Kiem tra remote...
git remote -v >nul 2>&1
if errorlevel 1 (
    echo [2/4] Them remote origin...
    git remote add origin %GITHUB_URL%
    echo       Da them remote: %GITHUB_URL%
) else (
    echo       Remote da ton tai.
    git remote set-url origin %GITHUB_URL%
    echo       Da cap nhat remote: %GITHUB_URL%
)

echo [3/4] Set branch main...
git branch -M main
echo       Da set branch main.

echo [4/4] Push len GitHub...
echo.
echo Dang push code len GitHub...
echo Neu hien thong bao yeu cau dang nhap, vui long:
echo   1. Dang nhap GitHub username
echo   2. Dung Personal Access Token thay vi password
echo      (Tao token: https://github.com/settings/tokens)
echo.

git push -u origin main

if errorlevel 1 (
    echo.
    echo [ERROR] Push that bai!
    echo.
    echo Kiem tra:
    echo   1. Da tao repository tren GitHub chua?
    echo   2. Repository URL co dung khong?
    echo   3. Da dang nhap GitHub chua?
    echo.
    echo Neu chua tao repository, vui long:
    echo   1. Vao https://github.com/new
    echo   2. Dat ten: cod-license-server
    echo   3. Click "Create repository"
    echo   4. Chay lai script nay
    echo.
) else (
    echo.
    echo [SUCCESS] Da push code len GitHub thanh cong!
    echo.
    echo Repository URL: https://github.com/%GITHUB_USERNAME%/%REPO_NAME%
    echo.
    echo Buoc tiep theo:
    echo   1. Vao https://railway.app
    echo   2. Dang ky tai khoan (dung GitHub)
    echo   3. Click "New Project" - "Deploy from GitHub repo"
    echo   4. Chon repository: %REPO_NAME%
    echo   5. Railway se tu dong deploy
    echo.
)

pause

