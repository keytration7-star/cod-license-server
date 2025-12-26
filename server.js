require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database');
const payos = require('./payos');
const license = require('./license');
const config = require('./config');

const app = express();
const PORT = process.env.PORT || config.PORT || 3000;

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

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    serverUrl: process.env.LICENSE_SERVER_URL || 'http://localhost:3000',
  });
});

// API: Test PayOS connection
app.get('/api/test-payos', async (req, res) => {
  try {
    // Kiểm tra biến môi trường trực tiếp
    const payosClientId = process.env.PAYOS_CLIENT_ID;
    const payosApiKey = process.env.PAYOS_API_KEY;
    const payosChecksumKey = process.env.PAYOS_CHECKSUM_KEY;
    
    // Lấy tất cả biến môi trường để debug
    const allEnvKeys = Object.keys(process.env);
    const payosEnvVars = allEnvKeys.filter(k => k.includes('PAYOS'));
    const licenseEnvVars = allEnvKeys.filter(k => k.includes('LICENSE'));
    const railwayServiceVars = allEnvKeys.filter(k => k.startsWith('RAILWAY_SERVICE_'));
    const allEnvVarsSample = allEnvKeys.slice(0, 30); // Lấy 30 biến đầu tiên để debug
    
    // Tìm biến có thể là PayOS keys với prefix khác
    const possiblePayOSVars = allEnvKeys.filter(k => 
      k.toUpperCase().includes('PAYOS') || 
      k.toUpperCase().includes('CLIENT_ID') || 
      k.toUpperCase().includes('API_KEY') ||
      k.toUpperCase().includes('CHECKSUM')
    );
    
    console.log('🔍 Test PayOS endpoint - Environment check:', {
      hasClientId: !!payosClientId,
      hasApiKey: !!payosApiKey,
      hasChecksumKey: !!payosChecksumKey,
      clientIdLength: payosClientId?.length || 0,
      apiKeyLength: payosApiKey?.length || 0,
      payosEnvVars,
      licenseEnvVars,
      railwayServiceVars,
      possiblePayOSVars,
      totalEnvVars: allEnvKeys.length,
      sampleEnvVars: allEnvVarsSample,
      hasLicenseServerUrl: !!process.env.LICENSE_SERVER_URL,
      licenseServerUrlValue: process.env.LICENSE_SERVER_URL || process.env.RAILWAY_SERVICE_COD_LICENSE_SERVER_URL || 'not found',
    });
    
    const testResult = {
      config: {
        hasClientId: !!payosClientId,
        hasApiKey: !!payosApiKey,
        hasChecksumKey: !!payosChecksumKey,
        clientIdLength: payosClientId?.length || 0,
        apiKeyLength: payosApiKey?.length || 0,
        apiUrl: process.env.PAYOS_API_URL || 'https://api-merchant.payos.vn/v2',
        allPayOSEnvVars: payosEnvVars,
        licenseEnvVars: licenseEnvVars,
        railwayServiceVars: railwayServiceVars,
        possiblePayOSVars: possiblePayOSVars,
        totalEnvVars: allEnvKeys.length,
        hasLicenseServerUrl: !!process.env.LICENSE_SERVER_URL,
        licenseServerUrlValue: process.env.LICENSE_SERVER_URL || process.env.RAILWAY_SERVICE_COD_LICENSE_SERVER_URL || 'not found',
        sampleEnvVars: allEnvVarsSample, // Để debug xem có biến nào được load không
      },
      test: {
        canCreateLink: false,
        error: null,
      },
    };

    // Test tạo payment link với order code test
    const testOrderCode = Date.now();
    const testResult_payos = await payos.createPaymentLink({
      orderCode: testOrderCode.toString(),
      amount: 1000, // Test với 1000 VNĐ
      description: 'Test PayOS Connection',
      returnUrl: `${process.env.LICENSE_SERVER_URL || 'http://localhost:3000'}/payment/success?orderCode=${testOrderCode}`,
      cancelUrl: `${process.env.LICENSE_SERVER_URL || 'http://localhost:3000'}/payment/cancel?orderCode=${testOrderCode}`,
      items: [
        {
          name: 'Test Item',
          quantity: 1,
          price: 1000,
        },
      ],
    });

    testResult.test.canCreateLink = testResult_payos.success;
    testResult.test.error = testResult_payos.error || null;
    testResult.test.details = testResult_payos.details || null;

    res.json({
      success: true,
      ...testResult,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// API: Lấy danh sách gói
app.get('/api/packages', (req, res) => {
  res.json({
    success: true,
    packages: PACKAGES,
  });
});

// API: Tạo đơn hàng và link thanh toán
app.post('/api/create-order', async (req, res) => {
  // Đảm bảo response chỉ được gửi một lần
  let responseSent = false;
  const sendResponse = (status, data) => {
    if (!responseSent) {
      responseSent = true;
      try {
        res.status(status).json(data);
      } catch (err) {
        console.error('Error sending response:', err);
      }
    }
  };

  try {
    console.log('📥 Create order request received:', {
      packageType: req.body?.packageType,
      hasEmail: !!req.body?.customerEmail,
      hasPhone: !!req.body?.customerPhone,
      body: req.body,
    });
    
    const { packageType, customerEmail, customerPhone, machineId } = req.body || {};

    if (!PACKAGES[packageType]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid package type',
      });
    }

    const packageInfo = PACKAGES[packageType];
    const orderCode = Date.now(); // Tạo order code từ timestamp

    // Tạo order trong database
    try {
      db.run(
        `INSERT INTO orders (order_code, customer_email, customer_phone, package_type, package_duration, amount, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [orderCode, customerEmail || null, customerPhone || null, packageType, packageInfo.duration, packageInfo.price],
        async function(err) {
          try {
            if (err) {
              console.error('Database error:', err);
              return sendResponse(500, {
                success: false,
                error: 'Failed to create order: ' + err.message,
              });
            }

            const orderId = this.lastID;

            // Tạo link thanh toán PayOS (chỉ nếu không phải trial)
            if (packageType === 'trial') {
              // Trial không cần thanh toán, tạo license ngay
              try {
                const licenseData = await license.createLicense(orderId, packageType, packageInfo.duration);
                
                // Cập nhật order status
                db.run(`UPDATE orders SET status = 'completed' WHERE id = ?`, [orderId], (updateErr) => {
                  if (updateErr) {
                    console.error('Error updating trial order status:', updateErr);
                  }
                });

                return sendResponse(200, {
                  success: true,
                  orderId,
                  orderCode,
                  licenseKey: licenseData.licenseKey,
                  expiresAt: licenseData.expiresAt,
                  isTrial: true,
                });
              } catch (error) {
                console.error('Create trial license error:', error);
                return sendResponse(500, {
                  success: false,
                  error: 'Failed to create trial license: ' + error.message,
                });
              }
            }

            // Lấy server URL, Railway có thể tự động tạo RAILWAY_SERVICE_COD_LICENSE_SERVER_URL
            // Nếu không tìm thấy, dùng giá trị fallback từ config.js
            const serverUrl = process.env.LICENSE_SERVER_URL || 
                             (process.env.RAILWAY_SERVICE_COD_LICENSE_SERVER_URL ? 
                               `https://${process.env.RAILWAY_SERVICE_COD_LICENSE_SERVER_URL}` : 
                               null) ||
                             config.LICENSE_SERVER_URL ||
                             'http://localhost:3000';
            
            console.log('Creating PayOS payment link:', {
              orderCode,
              amount: packageInfo.price,
              serverUrl,
            });

            // Tạo link thanh toán PayOS
            const paymentResult = await payos.createPaymentLink({
              orderCode: orderCode.toString(),
              amount: packageInfo.price,
              description: `Thanh toán gói ${packageInfo.name} - Hệ Thống Đối Soát COD`,
              returnUrl: `${serverUrl}/payment/success?orderCode=${orderCode}`,
              cancelUrl: `${serverUrl}/payment/cancel?orderCode=${orderCode}`,
              items: [
                {
                  name: packageInfo.name,
                  quantity: 1,
                  price: packageInfo.price,
                },
              ],
            });

            if (!paymentResult.success) {
              console.error('PayOS payment link creation failed:', paymentResult.error, paymentResult.details);
              return sendResponse(500, {
                success: false,
                error: 'Failed to create payment link: ' + (paymentResult.error || 'Unknown error'),
                details: paymentResult.details || paymentResult.error,
              });
            }

            // PayOS response structure: response.data.data.checkoutUrl hoặc response.data.checkoutUrl
            const checkoutUrl = paymentResult.data?.data?.checkoutUrl || 
                               paymentResult.data?.checkoutUrl || 
                               paymentResult.data?.link;
            const paymentLinkId = paymentResult.data?.data?.paymentLinkId || 
                                 paymentResult.data?.paymentLinkId || 
                                 paymentResult.data?.id;

            if (!checkoutUrl) {
              console.error('PayOS response missing checkoutUrl:', JSON.stringify(paymentResult.data, null, 2));
              return sendResponse(500, {
                success: false,
                error: 'PayOS response không có checkoutUrl. Response: ' + JSON.stringify(paymentResult.data),
              });
            }

            // Lưu payment link ID (nếu có)
            if (paymentLinkId) {
              db.run(
                `UPDATE orders SET payos_payment_link_id = ? WHERE id = ?`,
                [paymentLinkId, orderId],
                (updateErr) => {
                  if (updateErr) {
                    console.error('Error updating order with payment link ID:', updateErr);
                  }
                }
              );
            }

            sendResponse(200, {
              success: true,
              orderId,
              orderCode,
              paymentLink: checkoutUrl,
              paymentLinkId: paymentLinkId,
            });
          } catch (innerError) {
            console.error('Error in create-order callback:', innerError);
            sendResponse(500, {
              success: false,
              error: 'Internal server error: ' + innerError.message,
              details: process.env.NODE_ENV === 'development' ? innerError.stack : undefined,
            });
          }
        }
      );
    } catch (dbError) {
      console.error('Database run error:', dbError);
      sendResponse(500, {
        success: false,
        error: 'Database error: ' + dbError.message,
      });
    }
  } catch (error) {
    console.error('Create order error:', {
      message: error.message,
      stack: error.stack,
      fullError: error,
      errorName: error.name,
      errorCode: error.code,
    });
    
    // Trả về error message chi tiết hơn để debug
    const errorMessage = error.message || 'Internal server error';
    const errorDetails = {
      name: error.name,
      code: error.code,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    };
    
    sendResponse(500, {
      success: false,
      error: 'Internal server error: ' + errorMessage,
      details: errorDetails,
    });
  }
});

// API: Webhook từ PayOS (tự động được gọi khi có thanh toán)
app.post('/api/webhook', async (req, res) => {
  try {
    const { code, desc, data, signature } = req.body;

    // Log để debug
    console.log('Webhook received:', { code, desc, hasData: !!data, hasSignature: !!signature });

    // Nếu không có data, có thể là test webhook - trả về OK
    if (!data) {
      console.log('Webhook test - no data, returning OK');
      return res.json({
        success: true,
        message: 'Webhook endpoint is working',
      });
    }

    // Xác minh signature (nếu có)
    if (signature && !payos.verifyWebhook(data, signature)) {
      console.error('Invalid webhook signature');
      return res.status(400).json({
        success: false,
        error: 'Invalid signature',
      });
    }

    const orderCode = data.orderCode;

    if (!orderCode) {
      console.log('Webhook test - no orderCode, returning OK');
      return res.json({
        success: true,
        message: 'Webhook endpoint is working',
      });
    }

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
          // Nếu không tìm thấy order, có thể là test webhook - trả về OK
          console.log('Order not found (might be test webhook):', orderCode);
          return res.json({
            success: true,
            message: 'Webhook received but order not found (might be test)',
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
    // Trả về 200 để PayOS không báo lỗi (có thể là test webhook)
    res.json({
      success: false,
      error: 'Internal server error',
      message: error.message,
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
const server = app.listen(PORT, () => {
  // Railway có thể tự động tạo RAILWAY_SERVICE_COD_LICENSE_SERVER_URL
  // Nếu không tìm thấy, dùng giá trị fallback từ config.js
  const serverUrl = process.env.LICENSE_SERVER_URL || 
                   (process.env.RAILWAY_SERVICE_COD_LICENSE_SERVER_URL ? 
                     `https://${process.env.RAILWAY_SERVICE_COD_LICENSE_SERVER_URL}` : 
                     null) ||
                   config.LICENSE_SERVER_URL ||
                   `http://localhost:${PORT}`;
  console.log(`🚀 License Server running on port ${PORT}`);
  console.log(`📦 Packages available: ${Object.keys(PACKAGES).join(', ')}`);
  console.log(`🔗 Webhook URL: ${serverUrl}/api/webhook`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  
  // Thông báo nguồn config
  const configSource = process.env.PAYOS_CLIENT_ID ? 'Environment Variables' : 
                       (process.env.RAILWAY_SERVICE_PAYOS_CLIENT_ID ? 'Railway Service Variables' : 
                        'Fallback Config (config.js)');
  console.log(`⚙️  Config source: ${configSource}`);
  console.log(`✅ Server started successfully at ${new Date().toISOString()}`);
  console.log(`🔧 Server version: 2.0.0 - All syntax errors fixed`);
});

// Xử lý SIGTERM signal để graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

