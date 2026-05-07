const express = require('express');
const { query } = require('../../config/db');
const authMiddleware = require('../../middleware/auth');

const router = express.Router();

// Protect all routes with JWT auth middleware
router.use(authMiddleware);

/**
 * GET /api/v1/admin/stats/summary
 * Dashboard summary numbers:
 *   - total_today: reports submitted today (UTC)
 *   - total_active: reports with status 'Diterima' or 'Diproses'
 *   - total_completed: reports with status 'Selesai'
 *   - total_routes: total count of routes
 */
router.get('/summary', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*) FILTER (WHERE DATE(submitted_at) = CURRENT_DATE)                    AS total_today,
        COUNT(*) FILTER (WHERE status IN ('Diterima', 'Diproses'))                   AS total_active,
        COUNT(*) FILTER (WHERE status = 'Selesai')                                   AS total_completed,
        (SELECT COUNT(*) FROM routes)                                                 AS total_routes
      FROM reports
    `);

    const row = result.rows[0];
    return res.json({
      total_today:     parseInt(row.total_today, 10),
      total_active:    parseInt(row.total_active, 10),
      total_completed: parseInt(row.total_completed, 10),
      total_routes:    parseInt(row.total_routes, 10),
    });
  } catch (err) {
    console.error('Error fetching stats summary:', err);
    return res.status(500).json({ error: 'Gagal mengambil ringkasan statistik', detail: err.message });
  }
});

/**
 * GET /api/v1/admin/stats/reports-by-category
 * Reports grouped by category.
 * Returns array of { category, count }.
 */
router.get('/reports-by-category', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        category,
        COUNT(*) AS count
      FROM reports
      GROUP BY category
      ORDER BY count DESC
    `);

    return res.json(
      result.rows.map((row) => ({
        category: row.category,
        count:    parseInt(row.count, 10),
      }))
    );
  } catch (err) {
    console.error('Error fetching reports by category:', err);
    return res.status(500).json({ error: 'Gagal mengambil statistik per kategori', detail: err.message });
  }
});

/**
 * GET /api/v1/admin/stats/reports-by-route
 * Reports grouped by route, joined with routes table.
 * Returns array of { route_id, route_name, count }.
 */
router.get('/reports-by-route', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        r.id   AS route_id,
        r.name AS route_name,
        COUNT(rep.id) AS count
      FROM routes r
      LEFT JOIN reports rep ON rep.route_id = r.id
      GROUP BY r.id, r.name
      ORDER BY count DESC
    `);

    return res.json(
      result.rows.map((row) => ({
        route_id:   row.route_id,
        route_name: row.route_name,
        count:      parseInt(row.count, 10),
      }))
    );
  } catch (err) {
    console.error('Error fetching reports by route:', err);
    return res.status(500).json({ error: 'Gagal mengambil statistik per rute', detail: err.message });
  }
});

/**
 * GET /api/v1/admin/stats/daily-trend
 * Daily report count for the last 30 days.
 * Returns array of { date, count } ordered by date ASC.
 */
router.get('/daily-trend', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        DATE(submitted_at) AS date,
        COUNT(*)           AS count
      FROM reports
      WHERE submitted_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(submitted_at)
      ORDER BY date ASC
    `);

    return res.json(
      result.rows.map((row) => ({
        date:  row.date instanceof Date
          ? row.date.toISOString().slice(0, 10)
          : String(row.date),
        count: parseInt(row.count, 10),
      }))
    );
  } catch (err) {
    console.error('Error fetching daily trend:', err);
    return res.status(500).json({ error: 'Gagal mengambil tren harian', detail: err.message });
  }
});

module.exports = router;
