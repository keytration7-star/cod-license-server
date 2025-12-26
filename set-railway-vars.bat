@echo off
echo ========================================
echo Set Railway Environment Variables
echo ========================================
echo.

REM Kiểm tra Railway CLI
railway --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Railway CLI chua duoc cai dat!
    echo.
    echo Cai dat Railway CLI:
    echo   npm install -g @railway/cli
    echo.
    echo Hoac xem huong dan: https://docs.railway.app/develop/cli
    pause
    exit /b 1
)

echo [1/4] Dang set LICENSE_SERVER_URL...
railway variables set LICENSE_SERVER_URL=https://cod-license-server-production.up.railway.app
if errorlevel 1 (
    echo [ERROR] Khong the set LICENSE_SERVER_URL
    pause
    exit /b 1
)

echo [2/4] Dang set PAYOS_CLIENT_ID...
railway variables set PAYOS_CLIENT_ID=a9d73055-d322-41ce-874c-89499ce1f2a2
if errorlevel 1 (
    echo [ERROR] Khong the set PAYOS_CLIENT_ID
    pause
    exit /b 1
)

echo [3/4] Dang set PAYOS_API_KEY...
railway variables set PAYOS_API_KEY=f5ef7cf8-94d0-4ca9-836e-daa97ad310c7
if errorlevel 1 (
    echo [ERROR] Khong the set PAYOS_API_KEY
    pause
    exit /b 1
)

echo [4/4] Dang set PAYOS_CHECKSUM_KEY...
railway variables set PAYOS_CHECKSUM_KEY=fe4ac213e3346430205cce8da26a7edebe56385cbe4e36ed7030ee59f8760395
if errorlevel 1 (
    echo [ERROR] Khong the set PAYOS_CHECKSUM_KEY
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ Hoan thanh! Da set 4 bien moi truong
echo ========================================
echo.
echo Railway se tu dong redeploy sau khi set bien.
echo Doi 1-2 phut roi test lai: https://cod-license-server-production.up.railway.app/api/test-payos
echo.
pause

