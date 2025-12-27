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
 * Tạo chữ ký checksum cho PayOS API v2
 * 
 * Cách tạo signature đúng theo PayOS:
 * 1. Lấy toàn bộ dữ liệu cần gửi PayOS (orderCode, amount, description, returnUrl, cancelUrl, items)
 * 2. Sắp xếp key theo thứ tự alphabet (a → z)
 * 3. Ghép thành chuỗi: key1=value1&key2=value2&key3=value3 (KHÔNG encode, KHÔNG JSON, KHÔNG spaces)
 * 4. Dùng HMAC SHA256 với CHECKSUM_KEY để ký chuỗi này
 * 5. Kết quả trả về là chuỗi hex lowercase → đó là signature
 * 
 * Lưu ý:
 * - KHÔNG ký field signature
 * - KHÔNG encode values
 * - KHÔNG dùng JSON cho values
 * - Luôn sort key alphabet
 * - Luôn dùng UTF-8
 */
function createChecksum(data) {
  // Sắp xếp các key theo thứ tự alphabet (a → z)
  const sortedKeys = Object.keys(data).sort();
  
  // Tạo chuỗi dữ liệu theo format: key1=value1&key2=value2&key3=value3
  // KHÔNG có dấu cách, KHÔNG xuống dòng, KHÔNG JSON formatting
  const dataString = sortedKeys.map(key => {
    let value = data[key];
    
    // Nếu value là object hoặc array (như items), chuyển thành JSON string
    // PayOS yêu cầu items là JSON string (compact, không có spaces)
    if (typeof value === 'object' && value !== null) {
      value = JSON.stringify(value); // JSON.stringify tự động loại bỏ spaces không cần thiết
    }
    
    // Nếu value là null hoặc undefined, thay bằng chuỗi rỗng
    if (value === null || value === undefined) {
      value = '';
    }
    
    // Chuyển value thành string
    value = String(value);
    
    // Encode spaces và các ký tự đặc biệt (nhưng giữ nguyên : / ? = trong URL)
    // PayOS có thể yêu cầu encode spaces trong description nhưng không encode URL
    if (key === 'cancelUrl' || key === 'returnUrl') {
      // URL: KHÔNG encode (giữ nguyên : / ? =)
      // Nhưng có thể cần encode spaces nếu có
      value = value.replace(/ /g, '%20'); // Chỉ encode spaces
    } else if (key === 'description') {
      // Description: encode spaces
      value = value.replace(/ /g, '%20');
    } else if (key === 'items') {
      // Items: JSON string, có thể có spaces trong JSON, nhưng PayOS có thể yêu cầu encode
      // Thử encode spaces trong JSON string
      value = value.replace(/ /g, '%20');
    } else {
      // Các field khác: không encode
      // Giữ nguyên
    }
    
    // Ghép key=value (KHÔNG có spaces thừa)
    return `${key}=${value}`;
  }).join('&'); // Nối bằng & (KHÔNG có spaces)
  
  console.log('🔐 PayOS Data string for signature (FULL):', dataString);
  console.log('🔐 PayOS Data string for signature (first 200 chars):', dataString.substring(0, 200) + '...');
  
  // Tạo HMAC SHA256 signature với CHECKSUM_KEY
  const hmac = crypto.createHmac('sha256', PAYOS_CHECKSUM_KEY);
  hmac.update(dataString, 'utf8'); // Đảm bảo dùng UTF-8
  const signature = hmac.digest('hex'); // Hex lowercase
  
  console.log('🔐 PayOS Signature:', signature);
  
  // Trả về cả signature và dataString để debug
  return {
    signature: signature,
    dataString: dataString,
  };
}

/**
 * Tạo link thanh toán PayOS
 */
async function createPaymentLink(orderData) {
  let requestBody = null; // Khai báo ở ngoài để có thể truy cập trong catch
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
    // Lưu ý: PayOS yêu cầu description không được rỗng
    const finalDescription = String(description || 'Payment').trim() || 'Payment';
    
    // ⚠️ QUAN TRỌNG: PayOS KHÔNG cho phép ký field items!
    // Chỉ ký các field primitive: orderCode, amount, description, cancelUrl, returnUrl
    // Tạo object riêng để ký (KHÔNG có items, KHÔNG có signature)
    const dataToSign = {
      orderCode: orderCodeInt, // Phải là số nguyên
      amount: amountInt, // Phải là số nguyên (VNĐ)
      description: finalDescription, // String, không được null hoặc rỗng
      cancelUrl: finalCancelUrl, // URL hợp lệ
      returnUrl: finalReturnUrl, // URL hợp lệ
    };
    
    // Tạo signature từ dataToSign (KHÔNG có items)
    const signatureResult = createChecksum(dataToSign);
    const signature = signatureResult.signature;
    
    // Sau đó mới tạo request body đầy đủ (có items và signature)
    requestBody = {
      ...dataToSign, // Các field đã ký
      items: formattedItems, // Array - gửi PayOS nhưng KHÔNG được ký
      signature: signature, // Signature đã tạo
    };
    
    console.log('🔐 PayOS Signature created:', signature.substring(0, 16) + '...');
    
    // Lưu data string để trả về trong response (cho debug)
    requestBody._signatureDataString = signatureResult.dataString;
    
    // Clone requestBody ngay sau khi tạo để đảm bảo có sẵn trong mọi trường hợp
    const requestBodyForResponse = JSON.parse(JSON.stringify(requestBody));
    
    // Validate tổng amount phải bằng tổng items (PayOS yêu cầu)
    const totalItemsAmount = formattedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (Math.abs(totalItemsAmount - amountInt) > 0) {
      console.warn(`⚠️ Amount mismatch: total=${amountInt}, itemsTotal=${totalItemsAmount}. Adjusting amount to match items.`);
      // PayOS yêu cầu amount phải bằng tổng items, nên dùng itemsTotal
      requestBody.amount = totalItemsAmount;
    }
    
    // Đảm bảo description không quá dài (PayOS có thể có giới hạn)
    if (requestBody.description.length > 255) {
      requestBody.description = requestBody.description.substring(0, 255);
      console.warn('⚠️ Description quá dài, đã cắt xuống 255 ký tự');
    }
    
    // Đảm bảo description không rỗng (PayOS yêu cầu)
    if (!requestBody.description || requestBody.description.trim() === '') {
      requestBody.description = 'Payment'; // Default description
      console.warn('⚠️ Description rỗng, đã set default: "Payment"');
    }
    
    // Đảm bảo items name không quá dài (PayOS có thể có giới hạn)
    requestBody.items = requestBody.items.map(item => ({
      ...item,
      name: item.name.length > 255 ? item.name.substring(0, 255) : item.name,
    }));

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

    // Validate lại một lần nữa trước khi gửi
    const validationErrors = [];
    if (typeof requestBody.orderCode !== 'number' || requestBody.orderCode <= 0) {
      validationErrors.push('orderCode phải là số nguyên dương');
    }
    if (typeof requestBody.amount !== 'number' || requestBody.amount <= 0) {
      validationErrors.push('amount phải là số nguyên dương');
    }
    if (!requestBody.description || typeof requestBody.description !== 'string') {
      validationErrors.push('description phải là string không rỗng');
    }
    if (!Array.isArray(requestBody.items) || requestBody.items.length === 0) {
      validationErrors.push('items phải là mảng không rỗng');
    }
    requestBody.items.forEach((item, index) => {
      if (typeof item.name !== 'string' || !item.name.trim()) {
        validationErrors.push(`items[${index}].name phải là string không rỗng`);
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        validationErrors.push(`items[${index}].quantity phải là số nguyên dương`);
      }
      if (typeof item.price !== 'number' || item.price <= 0 || !Number.isInteger(item.price)) {
        validationErrors.push(`items[${index}].price phải là số nguyên dương`);
      }
    });
    if (validationErrors.length > 0) {
      console.error('❌ Validation errors before sending to PayOS:', validationErrors);
      return {
        success: false,
        error: 'Validation failed: ' + validationErrors.join(', '),
        requestBody: JSON.parse(JSON.stringify(requestBody)), // Clone để trả về
      };
    }

    // Log chi tiết request body
    console.log('📤 PayOS Request Body (FULL):', JSON.stringify(requestBody, null, 2));
    console.log('📤 PayOS Request Details:', {
      url: `${PAYOS_API_URL}/payment-requests`,
      orderCode: requestBody.orderCode,
      orderCodeType: typeof requestBody.orderCode,
      orderCodeValue: requestBody.orderCode,
      orderCodeString: String(requestBody.orderCode),
      amount: requestBody.amount,
      amountType: typeof requestBody.amount,
      amountValue: requestBody.amount,
      description: requestBody.description,
      descriptionLength: requestBody.description?.length || 0,
      itemsCount: requestBody.items.length,
      items: JSON.stringify(requestBody.items, null, 2),
      itemsTotal: requestBody.items.reduce((sum, item) => sum + (item.quantity * item.price), 0),
      returnUrl: requestBody.returnUrl,
      cancelUrl: requestBody.cancelUrl,
      hasClientId: !!PAYOS_CLIENT_ID,
      hasApiKey: !!PAYOS_API_KEY,
      clientIdPrefix: PAYOS_CLIENT_ID ? PAYOS_CLIENT_ID.substring(0, 8) + '...' : 'missing',
      apiKeyPrefix: PAYOS_API_KEY ? PAYOS_API_KEY.substring(0, 8) + '...' : 'missing',
    });

    // Gửi request đến PayOS
    console.log('🚀 Sending request to PayOS...');
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

    // Log response từ PayOS
    console.log('✅ PayOS Response received:', {
      status: response.status,
      statusText: response.statusText,
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : [],
      fullResponse: JSON.stringify(response.data, null, 2),
    });

    // Kiểm tra response structure
    if (!response.data) {
      console.error('❌ PayOS response không có data');
      return {
        success: false,
        error: 'PayOS response không có data',
        details: response,
      };
    }

    // PayOS có thể trả về checkoutUrl ở nhiều vị trí khác nhau
    const checkoutUrl = response.data?.data?.checkoutUrl || 
                       response.data?.checkoutUrl || 
                       response.data?.link;
    
    if (!checkoutUrl) {
      console.error('❌ PayOS response không có checkoutUrl:', JSON.stringify(response.data, null, 2));
      // Lưu signatureDataString vào response để debug
      const errorResponse = {
        success: false,
        error: 'PayOS response không có checkoutUrl. Response: ' + JSON.stringify(response.data),
        details: response.data,
        requestBody: requestBodyForResponse, // Sử dụng clone đã tạo sẵn
      };
      // Thêm signatureDataString nếu có
      if (requestBodyForResponse && requestBodyForResponse._signatureDataString) {
        errorResponse.signatureDataString = requestBodyForResponse._signatureDataString;
        // Xóa _signatureDataString khỏi requestBody để không gửi lên PayOS
        delete requestBodyForResponse._signatureDataString;
      }
      return errorResponse;
    }

    console.log('✅ PayOS checkoutUrl received:', checkoutUrl);

    return {
      success: true,
      data: {
        ...response.data,
        checkoutUrl: checkoutUrl, // Đảm bảo có checkoutUrl
      },
    };
  } catch (error) {
    console.error('❌ PayOS createPaymentLink error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      requestBody: requestBody ? JSON.stringify(requestBody, null, 2) : 'N/A',
      hasRequestBody: !!requestBody,
      fullError: error,
    });
    
    // Log chi tiết response từ PayOS
    if (error.response?.data) {
      console.error('📋 PayOS Error Response:', JSON.stringify(error.response.data, null, 2));
    }
    
    // Log request body nếu có
    if (requestBody) {
      console.error('📤 PayOS Request Body that caused error:', JSON.stringify(requestBody, null, 2));
    } else {
      console.error('⚠️ Request body is null - error occurred before creating requestBody');
    }
    
    // Trả về error message chi tiết hơn
    const errorMessage = error.response?.data?.desc || 
                        error.response?.data?.message || 
                        error.response?.data?.error || 
                        JSON.stringify(error.response?.data) ||
                        error.message;
    
    // Sử dụng requestBodyForResponse nếu đã có, nếu không thì clone lại
    let requestBodyForError = requestBodyForResponse || null;
    if (!requestBodyForError && requestBody) {
      try {
        requestBodyForError = JSON.parse(JSON.stringify(requestBody));
      } catch (e) {
        console.error('Error cloning requestBody in catch:', e);
        requestBodyForError = { ...requestBody };
      }
    }
    
    const errorResponse = {
      success: false,
      error: errorMessage,
      details: error.response?.data,
      requestBody: requestBodyForError,
      errorType: error.response ? 'API_ERROR' : 'NETWORK_ERROR',
      statusCode: error.response?.status || null,
    };
    
    // Thêm signatureDataString nếu có
    if (requestBodyForError && requestBodyForError._signatureDataString) {
      errorResponse.signatureDataString = requestBodyForError._signatureDataString;
      // Xóa _signatureDataString khỏi requestBody để không gửi lên PayOS
      delete requestBodyForError._signatureDataString;
    }
    
    return errorResponse;
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

