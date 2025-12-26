const crypto = require('crypto');
const axios = require('axios');

const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID;
const PAYOS_API_KEY = process.env.PAYOS_API_KEY;
const PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY;
const PAYOS_API_URL = 'https://api.payos.vn/v2';

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

    const paymentData = {
      orderCode: parseInt(orderCode),
      amount: amount,
      description: description,
      items: items,
      cancelUrl: cancelUrl || `${process.env.LICENSE_SERVER_URL}/payment/cancel`,
      returnUrl: returnUrl || `${process.env.LICENSE_SERVER_URL}/payment/success`,
    };

    const checksum = createChecksum(paymentData);

    const response = await axios.post(
      `${PAYOS_API_URL}/payment-requests`,
      paymentData,
      {
        headers: {
          'x-client-id': PAYOS_CLIENT_ID,
          'x-api-key': PAYOS_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('PayOS createPaymentLink error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message,
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

