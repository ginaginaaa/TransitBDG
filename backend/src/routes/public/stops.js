const express = require('express');
const { query } = require('../../config/db');

const router = express.Router();

/**
 * GET /api/v1/stops/search?origin=&destination=
 * Finds routes that have both a stop matching `origin` and a stop matching `destination`
 * (case-insensitive). Returns an array of matching routes with their stops.
 */
router.get('/search', async (req, res) => {
  const { origin, destination } = req.query;

  if (!origin || !destination) {
    return res.json([]);
  }

  try {
    // Find routes that have at least one stop matching origin AND at least one matching destination
    const routesResult = await query(
      `SELECT DISTINCT r.id, r.name, r.code, r.type, r.origin, r.destination, r.path_coords
       FROM routes r
       WHERE EXISTS (
         SELECT 1 FROM stops s1
         WHERE s1.route_id = r.id AND s1.name ILIKE $1
       )
       AND EXISTS (
         SELECT 1 FROM stops s2
         WHERE s2.route_id = r.id AND s2.name ILIKE $2
       )
       ORDER BY r.id ASC`,
      [`%${origin}%`, `%${destination}%`]
    );

    if (routesResult.rows.length === 0) {
      return res.json([]);
    }

    // For each matching route, fetch all its stops
    const routes = await Promise.all(
      routesResult.rows.map(async (route) => {
        const stopsResult = await query(
          'SELECT id, name, lat, lng, sequence, status FROM stops WHERE route_id = $1 ORDER BY sequence ASC',
          [route.id]
        );
        return { ...route, stops: stopsResult.rows };
      })
    );

    return res.json(routes);
  } catch (err) {
    console.error('Error searching stops:', err);
    return res.status(500).json({ error: 'Gagal mencari rute berdasarkan halte', detail: err.message });
  }
});

/**
 * GET /api/v1/stops/autocomplete?q=
 * Returns up to 10 stop names matching the query using ILIKE.
 * Returns empty array if `q` is empty or missing.
 */
router.get('/autocomplete', async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim() === '') {
    return res.json([]);
  }

  try {
    const result = await query(
      `SELECT DISTINCT name
       FROM stops
       WHERE name ILIKE $1
       ORDER BY name ASC
       LIMIT 10`,
      [`%${q}%`]
    );

    return res.json(result.rows.map((row) => ({ name: row.name })));
  } catch (err) {
    console.error('Error fetching autocomplete suggestions:', err);
    return res.status(500).json({ error: 'Gagal mengambil saran halte', detail: err.message });
  }
});

module.exports = router;
