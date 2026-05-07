const express = require('express');
const { query } = require('../../config/db');

const router = express.Router();

/**
 * GET /api/v1/routes
 * Returns all routes from the database.
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, code, type, origin, destination, path_coords, created_at, updated_at FROM routes ORDER BY id ASC'
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching routes:', err);
    return res.status(500).json({ error: 'Gagal mengambil data rute', detail: err.message });
  }
});

/**
 * GET /api/v1/routes/:id
 * Returns a single route by ID, including all associated stops ordered by sequence.
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch the route
    const routeResult = await query(
      'SELECT id, name, code, type, origin, destination, path_coords, created_at, updated_at FROM routes WHERE id = $1',
      [id]
    );

    if (routeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rute tidak ditemukan' });
    }

    const route = routeResult.rows[0];

    // Fetch associated stops ordered by sequence
    const stopsResult = await query(
      'SELECT id, name, lat, lng, sequence, status, created_at FROM stops WHERE route_id = $1 ORDER BY sequence ASC',
      [id]
    );

    route.stops = stopsResult.rows;

    return res.json(route);
  } catch (err) {
    console.error(`Error fetching route ${id}:`, err);
    return res.status(500).json({ error: 'Gagal mengambil detail rute', detail: err.message });
  }
});

module.exports = router;
