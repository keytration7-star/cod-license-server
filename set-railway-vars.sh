#!/bin/bash

echo "========================================"
echo "Set Railway Environment Variables"
echo "========================================"
echo ""

# Kiểm tra Railway CLI
if ! command -v railway &> /dev/null; then
    echo "[ERROR] Railway CLI chưa được cài đặt!"
    echo ""
    echo "Cài đặt Railway CLI:"
    echo "  npm install -g @railway/cli"
    echo ""
    echo "Hoặc xem hướng dẫn: https://docs.railway.app/develop/cli"
    exit 1
fi

echo "[1/4] Đang set LICENSE_SERVER_URL..."
railway variables set LICENSE_SERVER_URL=https://cod-license-server-production.up.railway.app
if [ $? -ne 0 ]; then
    echo "[ERROR] Không thể set LICENSE_SERVER_URL"
    exit 1
fi

echo "[2/4] Đang set PAYOS_CLIENT_ID..."
railway variables set PAYOS_CLIENT_ID=a9d73055-d322-41ce-874c-89499ce1f2a2
if [ $? -ne 0 ]; then
    echo "[ERROR] Không thể set PAYOS_CLIENT_ID"
    exit 1
fi

echo "[3/4] Đang set PAYOS_API_KEY..."
railway variables set PAYOS_API_KEY=f5ef7cf8-94d0-4ca9-836e-daa97ad310c7
if [ $? -ne 0 ]; then
    echo "[ERROR] Không thể set PAYOS_API_KEY"
    exit 1
fi

echo "[4/4] Đang set PAYOS_CHECKSUM_KEY..."
railway variables set PAYOS_CHECKSUM_KEY=fe4ac213e3346430205cce8da26a7edebe56385cbe4e36ed7030ee59f8760395
if [ $? -ne 0 ]; then
    echo "[ERROR] Không thể set PAYOS_CHECKSUM_KEY"
    exit 1
fi

echo ""
echo "========================================"
echo "✅ Hoàn thành! Đã set 4 biến môi trường"
echo "========================================"
echo ""
echo "Railway sẽ tự động redeploy sau khi set biến."
echo "Đợi 1-2 phút rồi test lại: https://cod-license-server-production.up.railway.app/api/test-payos"
echo ""

