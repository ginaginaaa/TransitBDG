const express = require('express');
const { query } = require('../../config/db');
const authMiddleware = require('../../middleware/auth');

const router = express.Router();

// Protect all routes with JWT auth middleware
router.use(authMiddleware);

// Valid route types
const VALID_TYPES = ['TMB', 'angkot'];

/**
 * PUT /api/v1/admin/stops/:stop_id
 * Update a stop by ID.
 * NOTE: Defined BEFORE /:id to avoid route conflicts.
 *
 * Body: { name, lat, lng, sequence, status }
 */
router.put('/stops/:stop_id', async (req, res) => {
  const { stop_id } = req.params;
  const { name, lat, lng, sequence, status } = req.body;

  try {
    const result = await query(
      `UPDATE stops
       SET
         name     = COALESCE($1, name),
         lat      = COALESCE($2, lat),
         lng      = COALESCE($3, lng),
         sequence = COALESCE($4, sequence),
         status   = COALESCE($5, status)
       WHERE id = $6
       RETURNING id, route_id, name, lat, lng, sequence, status, created_at`,
      [name, lat, lng, sequence, status, stop_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Halte tidak ditemukan' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error updating stop ${stop_id}:`, err);
    return res.status(500).json({ error: 'Gagal memperbarui halte', detail: err.message });
  }
});

/**
 * DELETE /api/v1/admin/stops/:stop_id
 * Delete a stop by ID.
 * NOTE: Defined BEFORE /:id to avoid route conflicts.
 */
router.delete('/stops/:stop_id', async (req, res) => {
  const { stop_id } = req.params;

  try {
    const result = await query(
      'DELETE FROM stops WHERE id = $1 RETURNING id',
      [stop_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Halte tidak ditemukan' });
    }

    return res.status(204).send();
  } catch (err) {
    console.error(`Error deleting stop ${stop_id}:`, err);
    return res.status(500).json({ error: 'Gagal menghapus halte', detail: err.message });
  }
});

/**
 * POST /api/v1/admin/routes
 * Create a new route.
 * Validates required fields: name, code, type, origin, destination.
 * Returns 409 if a route with the same code already exists.
 * Returns 201 with the created route on success.
 *
 * Body: { name, code, type, origin, destination, path_coords? }
 */
router.post('/', async (req, res) => {
  const { name, code, type, origin, destination, path_coords } = req.body;

  // Validate required fields
  const missing = [];
  if (!name) missing.push('name');
  if (!code) missing.push('code');
  if (!type) missing.push('type');
  if (!origin) missing.push('origin');
  if (!destination) missing.push('destination');

  if (missing.length > 0) {
    return res.status(400).json({
      error: 'Field wajib tidak boleh kosong',
      fields: missing,
    });
  }

  // Validate type value
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({
      error: `Tipe rute tidak valid. Harus salah satu dari: ${VALID_TYPES.join(', ')}`,
    });
  }

  try {
    // Check for duplicate code
    const duplicate = await query('SELECT id FROM routes WHERE code = $1', [code]);
    if (duplicate.rows.length > 0) {
      return res.status(409).json({ error: 'Kode rute sudah digunakan' });
    }

    const result = await query(
      `INSERT INTO routes (name, code, type, origin, destination, path_coords)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, code, type, origin, destination, path_coords, created_at, updated_at`,
      [name, code, type, origin, destination, path_coords || []]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating route:', err);
    return res.status(500).json({ error: 'Gagal membuat rute', detail: err.message });
  }
});

/**
 * PUT /api/v1/admin/routes/:id
 * Update an existing route by ID.
 * Returns the updated route or 404 if not found.
 *
 * Body: { name?, code?, type?, origin?, destination?, path_coords? }
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, code, type, origin, destination, path_coords } = req.body;

  // Validate type if provided
  if (type && !VALID_TYPES.includes(type)) {
    return res.status(400).json({
      error: `Tipe rute tidak valid. Harus salah satu dari: ${VALID_TYPES.join(', ')}`,
    });
  }

  try {
    const result = await query(
      `UPDATE routes
       SET
         name        = COALESCE($1, name),
         code        = COALESCE($2, code),
         type        = COALESCE($3, type),
         origin      = COALESCE($4, origin),
         destination = COALESCE($5, destination),
         path_coords = COALESCE($6, path_coords),
         updated_at  = NOW()
       WHERE id = $7
       RETURNING id, name, code, type, origin, destination, path_coords, created_at, updated_at`,
      [name, code, type, origin, destination, path_coords, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rute tidak ditemukan' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error updating route ${id}:`, err);
    return res.status(500).json({ error: 'Gagal memperbarui rute', detail: err.message });
  }
});

/**
 * DELETE /api/v1/admin/routes/:id
 * Delete a route by ID.
 * Associated stops are cascade-deleted via FK constraint.
 * Returns 204 on success or 404 if not found.
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      'DELETE FROM routes WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rute tidak ditemukan' });
    }

    return res.status(204).send();
  } catch (err) {
    console.error(`Error deleting route ${id}:`, err);
    return res.status(500).json({ error: 'Gagal menghapus rute', detail: err.message });
  }
});

/**
 * POST /api/v1/admin/routes/:id/stops
 * Add a stop to a route.
 * Validates required fields: name, lat, lng, sequence.
 * Returns 201 with the created stop on success.
 *
 * Body: { name, lat, lng, sequence, status? }
 */
router.post('/:id/stops', async (req, res) => {
  const { id } = req.params;
  const { name, lat, lng, sequence, status } = req.body;

  // Validate required fields
  const missing = [];
  if (!name) missing.push('name');
  if (lat === undefined || lat === null || lat === '') missing.push('lat');
  if (lng === undefined || lng === null || lng === '') missing.push('lng');
  if (sequence === undefined || sequence === null || sequence === '') missing.push('sequence');

  if (missing.length > 0) {
    return res.status(400).json({
      error: 'Field wajib tidak boleh kosong',
      fields: missing,
    });
  }

  try {
    // Verify the route exists
    const routeCheck = await query('SELECT id FROM routes WHERE id = $1', [id]);
    if (routeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Rute tidak ditemukan' });
    }

    const result = await query(
      `INSERT INTO stops (route_id, name, lat, lng, sequence, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, route_id, name, lat, lng, sequence, status, created_at`,
      [id, name, lat, lng, sequence, status || 'aktif']
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(`Error adding stop to route ${id}:`, err);
    return res.status(500).json({ error: 'Gagal menambahkan halte', detail: err.message });
  }
});

module.exports = router;
