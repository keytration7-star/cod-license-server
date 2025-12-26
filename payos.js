const crypto = require('crypto');
const axios = require('axios');

const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID;
const PAYOS_API_KEY = process.env.PAYOS_API_KEY;
const PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY;
// PayOS API endpoint - thử cả 2 URL
const PAYOS_API_URL = process.env.PAYOS_API_URL || 'https://api-merchant.payos.vn/v2';

// Log PayOS config khi module load (chỉ log prefix để bảo mật)
console.log('🔑 PayOS Config loaded:', {
  hasClientId: !!PAYOS_CLIENT_ID,
  hasApiKey: !!PAYOS_API_KEY,
  hasChecksumKey: !!PAYOS_CHECKSUM_KEY,
  clientIdLength: PAYOS_CLIENT_ID?.length || 0,
  apiKeyLength: PAYOS_API_KEY?.length || 0,
  apiUrl: PAYOS_API_URL,
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

    // Lấy server URL, nếu không có thì dùng localhost
    const serverUrl = process.env.LICENSE_SERVER_URL || 'http://localhost:3000';
    
    const paymentData = {
      orderCode: parseInt(orderCode),
      amount: amount,
      description: description,
      items: items,
      cancelUrl: cancelUrl || `${serverUrl}/payment/cancel`,
      returnUrl: returnUrl || `${serverUrl}/payment/success`,
    };

    // PayOS API v2 không yêu cầu checksum trong body khi tạo payment link
    // Chỉ cần checksum khi verify webhook
    // Format request theo PayOS API v2
    const requestBody = {
      orderCode: parseInt(orderCode),
      amount: amount,
      description: description,
      items: items,
      cancelUrl: cancelUrl || `${process.env.LICENSE_SERVER_URL}/payment/cancel`,
      returnUrl: returnUrl || `${process.env.LICENSE_SERVER_URL}/payment/success`,
    };

    // Kiểm tra API keys trước khi gọi (kiểm tra cả undefined, null và empty string)
    const clientId = PAYOS_CLIENT_ID?.trim?.() || PAYOS_CLIENT_ID || '';
    const apiKey = PAYOS_API_KEY?.trim?.() || PAYOS_API_KEY || '';
    
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
      });
      return {
        success: false,
        error: 'PayOS API keys chưa được cấu hình. Vui lòng kiểm tra Environment Variables trên Railway.',
      };
    }

    console.log('PayOS createPaymentLink request:', {
      url: `${PAYOS_API_URL}/payment-requests`,
      orderCode: requestBody.orderCode,
      amount: requestBody.amount,
      hasClientId: !!PAYOS_CLIENT_ID,
      hasApiKey: !!PAYOS_API_KEY,
      clientIdPrefix: PAYOS_CLIENT_ID?.substring(0, 8) + '...',
      apiKeyPrefix: PAYOS_API_KEY?.substring(0, 8) + '...',
    });

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
    console.error('PayOS createPaymentLink error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      fullError: error,
    });
    
    // Trả về error message chi tiết hơn
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        error.response?.data?.desc ||
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

