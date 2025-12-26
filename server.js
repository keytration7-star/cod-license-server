require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database');
const payos = require('./payos');
const license = require('./license');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Định nghĩa các gói license
const PACKAGES = {
  trial: { duration: 7, price: 0, name: 'Dùng thử 7 ngày' },
  '1month': { duration: 30, price: 299000, name: '1 tháng' },
  '3months': { duration: 90, price: 799000, name: '3 tháng' },
  '6months': { duration: 180, price: 1399000, name: '6 tháng' },
  '12months': { duration: 365, price: 2499000, name: '12 tháng' },
};

// API: Lấy danh sách gói
app.get('/api/packages', (req, res) => {
  res.json({
    success: true,
    packages: PACKAGES,
  });
});

// API: Tạo đơn hàng và link thanh toán
app.post('/api/create-order', async (req, res) => {
  try {
    const { packageType, customerEmail, customerPhone, machineId } = req.body;

    if (!PACKAGES[packageType]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid package type',
      });
    }

    const packageInfo = PACKAGES[packageType];
    const orderCode = Date.now(); // Tạo order code từ timestamp

    // Tạo order trong database
    db.run(
      `INSERT INTO orders (order_code, customer_email, customer_phone, package_type, package_duration, amount, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [orderCode, customerEmail || null, customerPhone || null, packageType, packageInfo.duration, packageInfo.price],
      async function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to create order',
          });
        }

        const orderId = this.lastID;

        // Tạo link thanh toán PayOS (chỉ nếu không phải trial)
        if (packageType === 'trial') {
          // Trial không cần thanh toán, tạo license ngay
          try {
            const licenseData = await license.createLicense(orderId, packageType, packageInfo.duration);
            
            // Cập nhật order status
            db.run(`UPDATE orders SET status = 'completed' WHERE id = ?`, [orderId]);

            return res.json({
              success: true,
              orderId,
              orderCode,
              licenseKey: licenseData.licenseKey,
              expiresAt: licenseData.expiresAt,
              isTrial: true,
            });
          } catch (error) {
            console.error('Create trial license error:', error);
            return res.status(500).json({
              success: false,
              error: 'Failed to create trial license',
            });
          }
        }

        // Tạo link thanh toán PayOS
        const paymentResult = await payos.createPaymentLink({
          orderCode: orderCode.toString(),
          amount: packageInfo.price,
          description: `Thanh toán gói ${packageInfo.name} - Hệ Thống Đối Soát COD`,
          returnUrl: `${process.env.LICENSE_SERVER_URL}/payment/success?orderCode=${orderCode}`,
          cancelUrl: `${process.env.LICENSE_SERVER_URL}/payment/cancel?orderCode=${orderCode}`,
          items: [
            {
              name: packageInfo.name,
              quantity: 1,
              price: packageInfo.price,
            },
          ],
        });

        if (!paymentResult.success) {
          return res.status(500).json({
            success: false,
            error: 'Failed to create payment link',
            details: paymentResult.error,
          });
        }

        // Lưu payment link ID
        db.run(
          `UPDATE orders SET payos_payment_link_id = ? WHERE id = ?`,
          [paymentResult.data.data.paymentLinkId, orderId]
        );

        res.json({
          success: true,
          orderId,
          orderCode,
          paymentLink: paymentResult.data.data.checkoutUrl,
          paymentLinkId: paymentResult.data.data.paymentLinkId,
        });
      }
    );
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// API: Webhook từ PayOS (tự động được gọi khi có thanh toán)
app.post('/api/webhook', async (req, res) => {
  try {
    const { code, desc, data, signature } = req.body;

    // Xác minh signature
    if (!payos.verifyWebhook(data, signature)) {
      console.error('Invalid webhook signature');
      return res.status(400).json({
      success: false,
      error: 'Invalid signature',
    });
    }

    const orderCode = data.orderCode;

    // Tìm order trong database
    db.get(
      `SELECT * FROM orders WHERE order_code = ?`,
      [orderCode],
      async (err, order) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            error: 'Database error',
          });
        }

        if (!order) {
          console.error('Order not found:', orderCode);
          return res.status(404).json({
            success: false,
            error: 'Order not found',
          });
        }

        // Nếu đã xử lý rồi thì bỏ qua
        if (order.status === 'completed') {
          return res.json({
            success: true,
            message: 'Order already processed',
          });
        }

        // Kiểm tra trạng thái thanh toán
        if (code === '00' && data.status === 'PAID') {
          // Thanh toán thành công - tạo license
          try {
            const licenseData = await license.createLicense(
              order.id,
              order.package_type,
              order.package_duration
            );

            // Cập nhật order status
            db.run(
              `UPDATE orders SET status = 'completed', payos_transaction_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [data.transactionDateTime || data.id, order.id]
            );

            console.log(`✅ License created for order ${orderCode}: ${licenseData.licenseKey}`);

            res.json({
              success: true,
              message: 'Payment processed successfully',
              licenseKey: licenseData.licenseKey,
            });
          } catch (error) {
            console.error('Create license error:', error);
            res.status(500).json({
              success: false,
              error: 'Failed to create license',
            });
          }
        } else {
          // Thanh toán thất bại hoặc hủy
          db.run(
            `UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [order.id]
          );

          res.json({
            success: true,
            message: 'Payment cancelled or failed',
          });
        }
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// API: Kiểm tra trạng thái đơn hàng
app.get('/api/order/:orderCode', (req, res) => {
  const { orderCode } = req.params;

  db.get(
    `SELECT o.*, l.license_key, l.expires_at 
     FROM orders o 
     LEFT JOIN licenses l ON o.id = l.order_id 
     WHERE o.order_code = ?`,
    [orderCode],
    (err, order) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: 'Database error',
        });
      }

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
        });
      }

      res.json({
        success: true,
        order: {
          orderCode: order.order_code,
          status: order.status,
          packageType: order.package_type,
          amount: order.amount,
          licenseKey: order.license_key,
          expiresAt: order.expires_at,
          createdAt: order.created_at,
        },
      });
    }
  );
});

// API: Kích hoạt license (từ app)
app.post('/api/activate-license', async (req, res) => {
  try {
    const { licenseKey, machineId } = req.body;

    if (!licenseKey || !machineId) {
      return res.status(400).json({
        success: false,
        error: 'License key and machine ID are required',
      });
    }

    const validation = await license.validateLicense(licenseKey, machineId);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.reason,
      });
    }

    res.json({
      success: true,
      license: validation.license,
    });
  } catch (error) {
    console.error('Activate license error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// API: Lấy thông tin license
app.get('/api/license/:licenseKey', async (req, res) => {
  try {
    const { licenseKey } = req.params;
    const licenseInfo = await license.getLicenseInfo(licenseKey);

    if (!licenseInfo) {
      return res.status(404).json({
        success: false,
        error: 'License not found',
      });
    }

    res.json({
      success: true,
      license: licenseInfo,
    });
  } catch (error) {
    console.error('Get license info error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// API: Admin - Lấy tất cả orders (cho dashboard)
app.get('/api/admin/orders', (req, res) => {
  db.all(
    `SELECT o.*, l.license_key 
     FROM orders o 
     LEFT JOIN licenses l ON o.id = l.order_id 
     ORDER BY o.created_at DESC`,
    [],
    (err, orders) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Database error',
        });
      }

      res.json({
        success: true,
        orders: orders || [],
      });
    }
  );
});

// Trang success (sau khi thanh toán)
app.get('/payment/success', (req, res) => {
  const { orderCode } = req.query;
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Thanh toán thành công</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .success { color: green; font-size: 24px; }
        .info { margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="success">✅ Thanh toán thành công!</div>
      <div class="info">
        <p>Mã đơn hàng: ${orderCode || 'N/A'}</p>
        <p>License sẽ được kích hoạt tự động trong ứng dụng.</p>
        <p>Bạn có thể đóng cửa sổ này.</p>
      </div>
    </body>
    </html>
  `);
});

// Trang cancel
app.get('/payment/cancel', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Thanh toán bị hủy</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .cancel { color: orange; font-size: 24px; }
      </style>
    </head>
    <body>
      <div class="cancel">⚠️ Thanh toán bị hủy</div>
      <p>Bạn có thể đóng cửa sổ này và thử lại.</p>
    </body>
    </html>
  `);
});

// Serve dashboard
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`🚀 License Server running on port ${PORT}`);
  console.log(`📦 Packages available: ${Object.keys(PACKAGES).join(', ')}`);
  console.log(`🔗 Webhook URL: ${process.env.LICENSE_SERVER_URL}/api/webhook`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
});

