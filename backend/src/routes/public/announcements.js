const express = require('express');
const { query } = require('../../config/db');

const router = express.Router();

/**
 * GET /api/v1/announcements
 * Returns all active announcements ordered by published_at DESC.
 * Joins with routes table to include route name if route_id is set.
 * Requirements: 8.1, 8.4
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT
        a.id,
        a.title,
        a.content,
        a.route_id,
        r.name AS route_name,
        a.is_active,
        a.published_at,
        a.created_at
       FROM announcements a
       LEFT JOIN routes r ON a.route_id = r.id
       WHERE a.is_active = true
       ORDER BY a.published_at DESC`,
      []
    );

    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching announcements:', err);
    return res.status(500).json({ error: 'Gagal mengambil pengumuman', detail: err.message });
  }
});

/**
 * GET /api/v1/announcements/:id
 * Returns a single active announcement by ID.
 * Returns 404 if not found or not active.
 * Joins with routes table to include route name if route_id is set.
 * Requirements: 8.1, 8.5
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT
        a.id,
        a.title,
        a.content,
        a.route_id,
        r.name AS route_name,
        a.is_active,
        a.published_at,
        a.created_at
       FROM announcements a
       LEFT JOIN routes r ON a.route_id = r.id
       WHERE a.id = $1 AND a.is_active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pengumuman tidak ditemukan' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error fetching announcement ${id}:`, err);
    return res.status(500).json({ error: 'Gagal mengambil pengumuman', detail: err.message });
  }
});

module.exports = router;
