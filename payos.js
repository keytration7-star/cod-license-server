const crypto = require('crypto');
const axios = require('axios');
const config = require('./config');

// Railway có thể tự động thêm prefix RAILWAY_SERVICE_ cho service variables
// Kiểm tra cả tên biến thường và tên biến có prefix
// Nếu không tìm thấy, dùng giá trị fallback từ config.js
const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID || 
                        process.env.RAILWAY_SERVICE_PAYOS_CLIENT_ID || 
                        config.PAYOS_CLIENT_ID;
const PAYOS_API_KEY = process.env.PAYOS_API_KEY || 
                      process.env.RAILWAY_SERVICE_PAYOS_API_KEY || 
                      config.PAYOS_API_KEY;
const PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY || 
                           process.env.RAILWAY_SERVICE_PAYOS_CHECKSUM_KEY || 
                           config.PAYOS_CHECKSUM_KEY;
// PayOS API endpoint - thử cả 2 URL
const PAYOS_API_URL = process.env.PAYOS_API_URL || 
                      process.env.RAILWAY_SERVICE_PAYOS_API_URL || 
                      config.PAYOS_API_URL;

// Log PayOS config khi module load (chỉ log prefix để bảo mật)
console.log('🔑 PayOS Config loaded:', {
  hasClientId: !!PAYOS_CLIENT_ID,
  hasApiKey: !!PAYOS_API_KEY,
  hasChecksumKey: !!PAYOS_CHECKSUM_KEY,
  clientIdLength: PAYOS_CLIENT_ID?.length || 0,
  apiKeyLength: PAYOS_API_KEY?.length || 0,
  apiUrl: PAYOS_API_URL,
  // Debug: kiểm tra cả 2 cách
  directClientId: !!process.env.PAYOS_CLIENT_ID,
  railwayClientId: !!process.env.RAILWAY_SERVICE_PAYOS_CLIENT_ID,
  allPayOSKeys: Object.keys(process.env).filter(k => k.includes('PAYOS')),
});

/**
 * Tạo chữ ký checksum
 */
function createChecksum(data) {
  const dataString = JSON.stringify(data);
  const hmac = crypto.createHmac('sha256', PAYOS_CHECKSUM_KEY);
  hmac.update(dataString);
  return hmac.digest('hex');
}

/**
 * Tạo link thanh toán PayOS
 */
async function createPaymentLink(orderData) {
  try {
    const {
      orderCode,
      amount,
      description,
      returnUrl,
      cancelUrl,
      items = []
    } = orderData;

    // Lấy server URL từ config nếu không có trong tham số
    const serverUrl = process.env.LICENSE_SERVER_URL || 
                     (process.env.RAILWAY_SERVICE_COD_LICENSE_SERVER_URL ? 
                       `https://${process.env.RAILWAY_SERVICE_COD_LICENSE_SERVER_URL}` : 
                       null) ||
                     config.LICENSE_SERVER_URL ||
                     'http://localhost:3000';

    // Format request theo PayOS API v2
    // PayOS yêu cầu:
    // - orderCode: số nguyên dương (int)
    // - amount: số nguyên (không có phần thập phân)
    // - items: mảng các object với name, quantity, price
    // - returnUrl, cancelUrl: URL hợp lệ
    
    // Đảm bảo orderCode là số nguyên dương
    // PayOS yêu cầu orderCode phải là số nguyên dương và không quá lớn
    // Lấy 10 chữ số cuối của timestamp để tránh số quá lớn
    let orderCodeInt = parseInt(orderCode);
    if (isNaN(orderCodeInt) || orderCodeInt <= 0) {
      return {
        success: false,
        error: 'orderCode phải là số nguyên dương',
      };
    }
    
    // Giới hạn orderCode trong phạm vi hợp lệ (PayOS có thể có giới hạn)
    // Nếu orderCode quá lớn, lấy 10 chữ số cuối
    if (orderCodeInt > 9999999999) {
      orderCodeInt = parseInt(orderCode.toString().slice(-10));
    }
    
    // Đảm bảo amount là số nguyên (làm tròn xuống)
    const amountInt = Math.floor(amount);
    if (isNaN(amountInt) || amountInt <= 0) {
      return {
        success: false,
        error: 'amount phải là số nguyên dương',
      };
    }
    
    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return {
        success: false,
        error: 'items phải là mảng không rỗng',
      };
    }
    
    // Validate và format items
    // PayOS yêu cầu items phải có name (string), quantity (int), price (int)
    const formattedItems = items.map(item => {
      const itemName = String(item.name || '').trim();
      const itemQuantity = parseInt(item.quantity || 1);
      const itemPrice = Math.floor(parseFloat(item.price || 0));
      
      if (!itemName || itemName === '') {
        throw new Error('Item name không được để trống');
      }
      if (isNaN(itemQuantity) || itemQuantity <= 0) {
        throw new Error('Item quantity phải là số nguyên dương');
      }
      if (isNaN(itemPrice) || itemPrice <= 0) {
        throw new Error('Item price phải là số nguyên dương');
      }
      
      return {
        name: itemName,
        quantity: itemQuantity,
        price: itemPrice,
      };
    });
    
    // Validate URLs
    const finalReturnUrl = returnUrl || `${serverUrl}/payment/success`;
    const finalCancelUrl = cancelUrl || `${serverUrl}/payment/cancel`;
    
    if (!finalReturnUrl.startsWith('http://') && !finalReturnUrl.startsWith('https://')) {
      return {
        success: false,
        error: 'returnUrl phải là URL hợp lệ (bắt đầu bằng http:// hoặc https://)',
      };
    }
    
    if (!finalCancelUrl.startsWith('http://') && !finalCancelUrl.startsWith('https://')) {
      return {
        success: false,
        error: 'cancelUrl phải là URL hợp lệ (bắt đầu bằng http:// hoặc https://)',
      };
    }
    
    // PayOS API v2 request body format
    // Đảm bảo tất cả field đúng type và format
    const requestBody = {
      orderCode: orderCodeInt, // Phải là số nguyên
      amount: amountInt, // Phải là số nguyên (VNĐ)
      description: String(description || '').trim(), // String, không được null
      items: formattedItems, // Array of objects với name, quantity, price
      cancelUrl: finalCancelUrl, // URL hợp lệ
      returnUrl: finalReturnUrl, // URL hợp lệ
    };
    
    // Validate tổng amount phải bằng tổng items
    const totalItemsAmount = formattedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (totalItemsAmount !== amountInt) {
      console.warn(`⚠️ Amount mismatch: total=${amountInt}, itemsTotal=${totalItemsAmount}. Using itemsTotal.`);
      requestBody.amount = totalItemsAmount;
    }

    // Kiểm tra API keys trước khi gọi (kiểm tra cả undefined, null và empty string)
    // Sử dụng giá trị từ config.js nếu không có trong env
    const clientId = (PAYOS_CLIENT_ID?.trim?.() || PAYOS_CLIENT_ID || '').toString().trim();
    const apiKey = (PAYOS_API_KEY?.trim?.() || PAYOS_API_KEY || '').toString().trim();
    
    if (!clientId || !apiKey || clientId === '' || apiKey === '') {
      console.error('PayOS API keys missing or empty:', {
        hasClientId: !!PAYOS_CLIENT_ID,
        hasApiKey: !!PAYOS_API_KEY,
        clientIdType: typeof PAYOS_CLIENT_ID,
        apiKeyType: typeof PAYOS_API_KEY,
        clientIdLength: PAYOS_CLIENT_ID?.length || 0,
        apiKeyLength: PAYOS_API_KEY?.length || 0,
        clientIdValue: PAYOS_CLIENT_ID ? (typeof PAYOS_CLIENT_ID === 'string' ? PAYOS_CLIENT_ID.substring(0, 8) + '...' : String(PAYOS_CLIENT_ID).substring(0, 8) + '...') : 'undefined',
        apiKeyValue: PAYOS_API_KEY ? (typeof PAYOS_API_KEY === 'string' ? PAYOS_API_KEY.substring(0, 8) + '...' : String(PAYOS_API_KEY).substring(0, 8) + '...') : 'undefined',
        allEnvVars: Object.keys(process.env).filter(k => k.includes('PAYOS')),
        // Kiểm tra config.js
        configClientId: require('./config').PAYOS_CLIENT_ID ? 'exists' : 'missing',
      });
      return {
        success: false,
        error: 'PayOS API keys chưa được cấu hình. Vui lòng kiểm tra Environment Variables trên Railway hoặc file config.js.',
      };
    }

    console.log('PayOS createPaymentLink request:', {
      url: `${PAYOS_API_URL}/payment-requests`,
      requestBody: JSON.stringify(requestBody, null, 2),
      orderCode: requestBody.orderCode,
      orderCodeType: typeof requestBody.orderCode,
      amount: requestBody.amount,
      amountType: typeof requestBody.amount,
      itemsCount: requestBody.items.length,
      items: JSON.stringify(requestBody.items, null, 2),
      returnUrl: requestBody.returnUrl,
      cancelUrl: requestBody.cancelUrl,
      hasClientId: !!PAYOS_CLIENT_ID,
      hasApiKey: !!PAYOS_API_KEY,
      clientIdPrefix: PAYOS_CLIENT_ID?.substring(0, 8) + '...',
      apiKeyPrefix: PAYOS_API_KEY?.substring(0, 8) + '...',
    });
    
    // Log request body để debug
    console.log('📤 PayOS Request Body:', JSON.stringify(requestBody, null, 2));

    const response = await axios.post(
      `${PAYOS_API_URL}/payment-requests`,
      requestBody,
      {
        headers: {
          'x-client-id': PAYOS_CLIENT_ID,
          'x-api-key': PAYOS_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds timeout
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('❌ PayOS createPaymentLink error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      requestBody: requestBody ? JSON.stringify(requestBody, null, 2) : 'N/A',
      fullError: error,
    });
    
    // Log chi tiết response từ PayOS
    if (error.response?.data) {
      console.error('📋 PayOS Error Response:', JSON.stringify(error.response.data, null, 2));
    }
    
    // Trả về error message chi tiết hơn
    const errorMessage = error.response?.data?.desc || 
                        error.response?.data?.message || 
                        error.response?.data?.error || 
                        JSON.stringify(error.response?.data) ||
                        error.message;
    
    return {
      success: false,
      error: errorMessage,
      details: error.response?.data,
    };
  }
}

/**
 * Xác minh webhook từ PayOS
 */
function verifyWebhook(data, signature) {
  const checksum = createChecksum(data);
  return checksum === signature;
}

/**
 * Lấy thông tin giao dịch từ PayOS
 */
async function getPaymentInfo(orderCode) {
  try {
    const response = await axios.get(
      `${PAYOS_API_URL}/payment-requests/${orderCode}`,
      {
        headers: {
          'x-client-id': PAYOS_CLIENT_ID,
          'x-api-key': PAYOS_API_KEY,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('PayOS getPaymentInfo error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
}

module.exports = {
  createPaymentLink,
  verifyWebhook,
  getPaymentInfo,
  createChecksum,
};

