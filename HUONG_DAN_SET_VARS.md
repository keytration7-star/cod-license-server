# Hướng dẫn Set Environment Variables trên Railway

## Cách 1: Dùng Railway CLI (Tự động - Khuyến nghị)

### Bước 1: Cài đặt Railway CLI

```bash
npm install -g @railway/cli
```

### Bước 2: Login Railway

```bash
railway login
```

### Bước 3: Chọn project và service

```bash
cd license-server
railway link
# Chọn project: discerning-consideration
# Chọn service: cod-license-server
```

### Bước 4: Chạy script tự động

**Windows:**
```bash
set-railway-vars.bat
```

**Linux/Mac:**
```bash
chmod +x set-railway-vars.sh
./set-railway-vars.sh
```

Hoặc chạy từng lệnh thủ công:

```bash
railway variables set LICENSE_SERVER_URL=https://cod-license-server-production.up.railway.app
railway variables set PAYOS_CLIENT_ID=a9d73055-d322-41ce-874c-89499ce1f2a2
railway variables set PAYOS_API_KEY=f5ef7cf8-94d0-4ca9-836e-daa97ad310c7
railway variables set PAYOS_CHECKSUM_KEY=fe4ac213e3346430205cce8da26a7edebe56385cbe4e36ed7030ee59f8760395
```

---

## Cách 2: Set thủ công trên Railway Dashboard

### Bước 1: Vào Railway Dashboard

1. Truy cập: https://railway.app
2. Chọn project: **discerning-consideration**
3. Chọn service: **cod-license-server**
4. Click tab **"Variables"**

### Bước 2: Thêm từng biến

Click **"+ New Variable"** và thêm 4 biến sau:

**Biến 1:**
- Key: `LICENSE_SERVER_URL`
- Value: `https://cod-license-server-production.up.railway.app`
- Click **"Add"**

**Biến 2:**
- Key: `PAYOS_CLIENT_ID`
- Value: `a9d73055-d322-41ce-874c-89499ce1f2a2`
- Click **"Add"**

**Biến 3:**
- Key: `PAYOS_API_KEY`
- Value: `f5ef7cf8-94d0-4ca9-836e-daa97ad310c7`
- Click **"Add"**

**Biến 4:**
- Key: `PAYOS_CHECKSUM_KEY`
- Value: `fe4ac213e3346430205cce8da26a7edebe56385cbe4e36ed7030ee59f8760395`
- Click **"Add"**

### Bước 3: Đợi Railway redeploy

Sau khi thêm biến, Railway sẽ tự động redeploy (1-2 phút).

### Bước 4: Test

Sau khi redeploy xong, test endpoint:
```
https://cod-license-server-production.up.railway.app/api/test-payos
```

Nếu thấy:
- `allPayOSEnvVars: ["PAYOS_CLIENT_ID", "PAYOS_API_KEY", "PAYOS_CHECKSUM_KEY"]`
- `hasClientId: true`, `hasApiKey: true`, `hasChecksumKey: true`

→ ✅ Thành công!

---

## Cách 3: Dùng Raw Editor (Nhanh nhất)

### Bước 1: Vào Railway Variables

1. Truy cập: https://railway.app
2. Chọn project → service `cod-license-server`
3. Click tab **"Variables"**
4. Click nút **"Raw Editor"** (có icon `{}`)

### Bước 2: Paste JSON

Paste đoạn này vào:

```json
{
  "LICENSE_SERVER_URL": "https://cod-license-server-production.up.railway.app",
  "PAYOS_CLIENT_ID": "a9d73055-d322-41ce-874c-89499ce1f2a2",
  "PAYOS_API_KEY": "f5ef7cf8-94d0-4ca9-836e-daa97ad310c7",
  "PAYOS_CHECKSUM_KEY": "fe4ac213e3346430205cce8da26a7edebe56385cbe4e36ed7030ee59f8760395"
}
```

### Bước 3: Click "Save"

Railway sẽ tự động redeploy.

---

## Kiểm tra

Sau khi set xong, test endpoint:
```
https://cod-license-server-production.up.railway.app/api/test-payos
```

Nếu thành công, bạn sẽ thấy:
- `allPayOSEnvVars` có 3 phần tử
- `hasClientId: true`, `hasApiKey: true`, `hasChecksumKey: true`
- `canCreateLink: true` (nếu PayOS API hoạt động)

