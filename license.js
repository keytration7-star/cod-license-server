const crypto = require('crypto');
const db = require('./database');

/**
 * Tạo license key mới
 */
function generateLicenseKey() {
  // Format: PAID-YYYYMMDD-XXXXXX (6 ký tự ngẫu nhiên)
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `PAID-${date}-${random}`;
}

/**
 * Tạo license từ order
 */
async function createLicense(orderId, packageType, durationDays) {
  return new Promise((resolve, reject) => {
    const licenseKey = generateLicenseKey();
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    db.run(
      `INSERT INTO licenses (license_key, order_id, package_type, duration_days, activated_at, expires_at, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [licenseKey, orderId, packageType, durationDays, now.toISOString(), expiresAt.toISOString()],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            licenseKey,
            expiresAt: expiresAt.toISOString(),
          });
        }
      }
    );
  });
}

/**
 * Kiểm tra license có hợp lệ không
 */
async function validateLicense(licenseKey, machineId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM licenses WHERE license_key = ? AND status = 'active'`,
      [licenseKey],
      (err, license) => {
        if (err) {
          reject(err);
          return;
        }

        if (!license) {
          resolve({ valid: false, reason: 'License not found or inactive' });
          return;
        }

        const expiresAt = new Date(license.expires_at);
        const now = new Date();

        if (now > expiresAt) {
          resolve({ valid: false, reason: 'License expired' });
          return;
        }

        // Kiểm tra xem license đã được kích hoạt trên máy khác chưa
        db.get(
          `SELECT * FROM license_usage WHERE license_key = ? AND machine_id != ?`,
          [licenseKey, machineId],
          (err, usage) => {
            if (err) {
              reject(err);
              return;
            }

            if (usage) {
              resolve({ valid: false, reason: 'License already activated on another machine' });
              return;
            }

            // Ghi lại việc sử dụng license trên máy này
            db.run(
              `INSERT OR IGNORE INTO license_usage (license_key, machine_id) VALUES (?, ?)`,
              [licenseKey, machineId],
              () => {
                resolve({
                  valid: true,
                  license: {
                    key: license.license_key,
                    packageType: license.package_type,
                    expiresAt: license.expires_at,
                    durationDays: license.duration_days,
                  },
                });
              }
            );
          }
        );
      }
    );
  });
}

/**
 * Lấy thông tin license
 */
async function getLicenseInfo(licenseKey) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM licenses WHERE license_key = ?`,
      [licenseKey],
      (err, license) => {
        if (err) {
          reject(err);
        } else {
          resolve(license);
        }
      }
    );
  });
}

module.exports = {
  generateLicenseKey,
  createLicense,
  validateLicense,
  getLicenseInfo,
};

