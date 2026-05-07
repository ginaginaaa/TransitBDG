const express = require('express');
const { query } = require('../../config/db');
const authMiddleware = require('../../middleware/auth');

const router = express.Router();

// Protect all routes with JWT auth middleware
router.use(authMiddleware);

// Valid status transitions
const VALID_TRANSITIONS = {
  'Diterima': ['Diproses', 'Ditolak'],
  'Diproses': ['Selesai'],
  'Selesai': [],
  'Ditolak': [],
};

/**
 * Build WHERE clause and params array from common filter query params.
 * Supports: status, category, date_from, date_to
 * @param {object} queryParams - Express req.query object
 * @returns {{ conditions: string[], params: any[] }}
 */
function buildFilters(queryParams) {
  const { status, category, date_from, date_to } = queryParams;
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push('rep.status = $' + params.length);
  }

  if (category) {
    params.push(category);
    conditions.push('rep.category = $' + params.length);
  }

  if (date_from) {
    params.push(date_from);
    conditions.push('rep.submitted_at >= $' + params.length);
  }

  if (date_to) {
    params.push(date_to);
    conditions.push('rep.submitted_at <= $' + params.length);
  }

  return { conditions, params };
}

/**
 * GET /api/v1/admin/reports/export/csv
 * Export reports as CSV with optional filters.
 * Columns: Kode Laporan, Kategori, Deskripsi, Lokasi, Rute Terkait,
 *          Waktu Pengiriman, Status, Waktu Perubahan Status Terakhir
 *
 * NOTE: Defined BEFORE /:id to avoid route conflicts.
 */
router.get('/export/csv', async (req, res) => {
  const { conditions, params } = buildFilters(req.query);
  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const sql = `
    SELECT
      rep.report_code,
      rep.category,
      rep.description,
      rep.location_text,
      r.name AS route_name,
      rep.submitted_at,
      rep.status,
      rep.status_changed_at
    FROM reports rep
    LEFT JOIN routes r ON rep.route_id = r.id
    ${whereClause}
    ORDER BY rep.submitted_at DESC
  `;

  try {
    const result = await query(sql, params);

    // Generate filename with current date YYYYMMDD
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = 'laporan-transitbdg-' + today + '.csv';

    res.setHeader('Content-Disposition', 'attachment; filename=' + filename);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');

    // CSV header row
    const headers = [
      'Kode Laporan',
      'Kategori',
      'Deskripsi',
      'Lokasi',
      'Rute Terkait',
      'Waktu Pengiriman',
      'Status',
      'Waktu Perubahan Status Terakhir',
    ];

    /**
     * Escape a CSV field value: wrap in double quotes and escape internal quotes.
     * @param {any} value
     * @returns {string}
     */
    function escapeCsvField(value) {
      if (value === null || value === undefined) return '';
      const str = String(value);
      // Wrap in quotes if the value contains comma, newline, or double quote
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }

    const rows = result.rows.map((row) => [
      escapeCsvField(row.report_code),
      escapeCsvField(row.category),
      escapeCsvField(row.description),
      escapeCsvField(row.location_text),
      escapeCsvField(row.route_name),
      escapeCsvField(row.submitted_at ? row.submitted_at.toISOString() : ''),
      escapeCsvField(row.status),
      escapeCsvField(row.status_changed_at ? row.status_changed_at.toISOString() : ''),
    ].join(','));

    // UTF-8 BOM for Excel compatibility + header + data rows
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');

    return res.send(csvContent);
  } catch (err) {
    console.error('Error exporting CSV:', err);
    return res.status(500).json({ error: 'Gagal mengekspor laporan', detail: err.message });
  }
});

/**
 * GET /api/v1/admin/reports
 * List reports with optional filters: status, category, date_from, date_to.
 * Returns reports ordered by submitted_at DESC, joined with routes for route name.
 */
router.get('/', async (req, res) => {
  const { conditions, params } = buildFilters(req.query);
  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const sql = `
    SELECT
      rep.id,
      rep.report_code,
      rep.category,
      rep.description,
      rep.location_text,
      rep.location_lat,
      rep.location_lng,
      rep.route_id,
      r.name AS route_name,
      rep.photo_url,
      rep.status,
      rep.admin_note,
      rep.status_changed_at,
      rep.submitted_at
    FROM reports rep
    LEFT JOIN routes r ON rep.route_id = r.id
    ${whereClause}
    ORDER BY rep.submitted_at DESC
  `;

  try {
    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching admin reports:', err);
    return res.status(500).json({ error: 'Gagal mengambil daftar laporan', detail: err.message });
  }
});

/**
 * GET /api/v1/admin/reports/:id
 * Get full report details including admin_note.
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT
        rep.id,
        rep.report_code,
        rep.category,
        rep.description,
        rep.location_text,
        rep.location_lat,
        rep.location_lng,
        rep.route_id,
        r.name AS route_name,
        rep.photo_url,
        rep.status,
        rep.admin_note,
        rep.status_changed_at,
        rep.submitted_at
      FROM reports rep
      LEFT JOIN routes r ON rep.route_id = r.id
      WHERE rep.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Laporan tidak ditemukan' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching report ' + id + ':', err);
    return res.status(500).json({ error: 'Gagal mengambil detail laporan', detail: err.message });
  }
});

/**
 * PATCH /api/v1/admin/reports/:id/status
 * Update report status with valid transition enforcement.
 * Valid transitions:
 *   Diterima -> Diproses | Ditolak
 *   Diproses -> Selesai
 *   Selesai  -> (none)
 *   Ditolak  -> (none)
 * Updates status_changed_at = NOW() on success.
 *
 * Body: { status: string }
 */
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status: newStatus } = req.body;

  if (!newStatus) {
    return res.status(400).json({ error: 'Field status wajib diisi' });
  }

  try {
    // Fetch current status
    const current = await query('SELECT status FROM reports WHERE id = $1', [id]);

    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Laporan tidak ditemukan' });
    }

    const currentStatus = current.rows[0].status;
    const allowedTransitions = VALID_TRANSITIONS[currentStatus];

    if (!allowedTransitions) {
      return res.status(400).json({ error: 'Status saat ini tidak dikenali: ' + currentStatus });
    }

    if (!allowedTransitions.includes(newStatus)) {
      return res.status(400).json({
        error: 'Transisi status tidak valid: ' + currentStatus + ' -> ' + newStatus,
        allowed: allowedTransitions,
      });
    }

    // Update status and record the change timestamp
    const result = await query(
      `UPDATE reports
       SET status = $1, status_changed_at = NOW()
       WHERE id = $2
       RETURNING id, report_code, status, status_changed_at`,
      [newStatus, id]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating status for report ' + id + ':', err);
    return res.status(500).json({ error: 'Gagal memperbarui status laporan', detail: err.message });
  }
});

/**
 * PATCH /api/v1/admin/reports/:id/note
 * Update the admin_note field for a report.
 *
 * Body: { admin_note: string }
 */
router.patch('/:id/note', async (req, res) => {
  const { id } = req.params;
  const { admin_note } = req.body;

  if (admin_note === undefined) {
    return res.status(400).json({ error: 'Field admin_note wajib diisi' });
  }

  try {
    const result = await query(
      `UPDATE reports
       SET admin_note = $1
       WHERE id = $2
       RETURNING id, report_code, admin_note`,
      [admin_note, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Laporan tidak ditemukan' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating note for report ' + id + ':', err);
    return res.status(500).json({ error: 'Gagal memperbarui catatan laporan', detail: err.message });
  }
});

module.exports = router;
