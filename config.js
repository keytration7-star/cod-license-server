/**
 * Configuration file for License Server
 * 
 * IMPORTANT: These are FALLBACK values.
 * Railway environment variables take priority.
 * If environment variables are not set, these values will be used.
 */

module.exports = {
  // PayOS Configuration (Fallback values)
  PAYOS_CLIENT_ID: 'a9d73055-d322-41ce-874c-89499ce1f2a2',
  PAYOS_API_KEY: 'f5ef7cf8-94d0-4ca9-836e-daa97ad310c7',
  PAYOS_CHECKSUM_KEY: 'fe4ac213e3346430205cce8da26a7edebe56385cbe4e36ed7030ee59f8760395',
  PAYOS_API_URL: 'https://api-merchant.payos.vn/v2',
  
  // Server Configuration
  LICENSE_SERVER_URL: 'https://cod-license-server-production.up.railway.app',
  PORT: 3000,
};

