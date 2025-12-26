const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'license.db');

// Tạo database nếu chưa có
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, '');
}

const db = new sqlite3.Database(DB_PATH);

// Khởi tạo database
db.serialize(() => {
  // Bảng orders - lưu thông tin đơn hàng thanh toán
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT UNIQUE NOT NULL,
      customer_email TEXT,
      customer_phone TEXT,
      package_type TEXT NOT NULL,
      package_duration INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      payos_payment_link_id TEXT,
      payos_transaction_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Bảng licenses - lưu license keys đã cấp
  db.run(`
    CREATE TABLE IF NOT EXISTS licenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_key TEXT UNIQUE NOT NULL,
      order_id INTEGER,
      machine_id TEXT,
      package_type TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      activated_at DATETIME,
      expires_at DATETIME,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);

  // Bảng license_usage - theo dõi license đã kích hoạt trên máy nào
  db.run(`
    CREATE TABLE IF NOT EXISTS license_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_key TEXT NOT NULL,
      machine_id TEXT NOT NULL,
      activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(license_key, machine_id),
      FOREIGN KEY (license_key) REFERENCES licenses(license_key)
    )
  `);

  console.log('✅ Database initialized');
});

module.exports = db;

