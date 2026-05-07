const express = require('express');
const { query } = require('../../config/db');

const router = express.Router();

/**
 * GET /api/v1/alerts/congestion
 * Returns routes with active congestion alerts.
 * A route qualifies when it has >= 3 reports with category 'Kemacetan'
 * and status 'Diterima' or 'Diproses' submitted within the last 1 hour.
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
router.get('/congestion', async (req, res) => {
  try {
    const result = await query(
      `SELECT r.id, r.name, COUNT(*) AS congestion_count
       FROM reports rep
       JOIN routes r ON rep.route_id = r.id
       WHERE rep.category = 'Kemacetan'
         AND rep.status IN ('Diterima', 'Diproses')
         AND rep.submitted_at >= NOW() - INTERVAL '1 hour'
       GROUP BY r.id, r.name
       HAVING COUNT(*) >= 3`,
      []
    );

    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching congestion alerts:', err);
    return res.status(500).json({ error: 'Gagal mengambil alert kemacetan', detail: err.message });
  }
});

module.exports = router;
