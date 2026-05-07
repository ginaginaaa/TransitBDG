/**
 * Utility untuk menghasilkan kode laporan unik.
 * Format: TBD-YYYYMMDD-XXXX
 * di mana XXXX adalah 4 karakter alfanumerik acak (uppercase).
 */

/**
 * Generate kode laporan dengan format TBD-YYYYMMDD-XXXX.
 * @returns {string} Kode laporan, contoh: TBD-20240115-A3F9
 */
function generateReportCode() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TBD-${date}-${rand}`;
}

module.exports = generateReportCode;
module.exports.generateReportCode = generateReportCode;
