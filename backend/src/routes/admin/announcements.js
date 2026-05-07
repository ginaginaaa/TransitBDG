const express = require('express');
const { query } = require('../../config/db');
const authMiddleware = require('../../middleware/auth');

const router = express.Router();

// Protect all routes with JWT auth middleware
router.use(authMiddleware);

/**
 * GET /api/v1/admin/announcements
 * List all announcements (active and inactive), ordered by published_at DESC.
 * Joins with routes to include route name.
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
      ORDER BY a.published_at DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching admin announcements:', err);
    return res.status(500).json({ error: 'Gagal mengambil daftar pengumuman', detail: err.message });
  }
});

/**
 * POST /api/v1/admin/announcements
 * Create a new announcement.
 * Required fields: title, content
 * Optional: route_id
 * Sets published_at = NOW()
 * Returns 201 with the created announcement.
 */
router.post('/', async (req, res) => {
  const { title, content, route_id } = req.body;

  // Validate required fields
  const errors = {};
  if (!title || String(title).trim() === '') {
    errors.title = 'Judul wajib diisi';
  }
  if (!content || String(content).trim() === '') {
    errors.content = 'Isi pengumuman wajib diisi';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Validasi gagal', fields: errors });
  }

  try {
    const result = await query(
      `INSERT INTO announcements (title, content, route_id, published_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, title, content, route_id, is_active, published_at, created_at`,
      [title.trim(), content.trim(), route_id || null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating announcement:', err);
    return res.status(500).json({ error: 'Gagal membuat pengumuman', detail: err.message });
  }
});

/**
 * PUT /api/v1/admin/announcements/:id
 * Update an existing announcement.
 * Updatable fields: title, content, route_id
 * Returns updated announcement or 404 if not found.
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, route_id } = req.body;

  try {
    const result = await query(
      `UPDATE announcements
       SET
         title    = COALESCE($1, title),
         content  = COALESCE($2, content),
         route_id = $3
       WHERE id = $4
       RETURNING id, title, content, route_id, is_active, published_at, created_at`,
      [
        title !== undefined ? title : null,
        content !== undefined ? content : null,
        route_id !== undefined ? route_id : null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pengumuman tidak ditemukan' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating announcement ' + id + ':', err);
    return res.status(500).json({ error: 'Gagal memperbarui pengumuman', detail: err.message });
  }
});

/**
 * DELETE /api/v1/admin/announcements/:id
 * Delete an announcement.
 * Returns 204 on success or 404 if not found.
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      'DELETE FROM announcements WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pengumuman tidak ditemukan' });
    }

    return res.status(204).send();
  } catch (err) {
    console.error('Error deleting announcement ' + id + ':', err);
    return res.status(500).json({ error: 'Gagal menghapus pengumuman', detail: err.message });
  }
});

/**
 * PATCH /api/v1/admin/announcements/:id/toggle
 * Toggle the is_active boolean for an announcement.
 * Returns the updated announcement.
 */
router.patch('/:id/toggle', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      `UPDATE announcements
       SET is_active = NOT is_active
       WHERE id = $1
       RETURNING id, title, content, route_id, is_active, published_at, created_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pengumuman tidak ditemukan' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error toggling announcement ' + id + ':', err);
    return res.status(500).json({ error: 'Gagal mengubah status pengumuman', detail: err.message });
  }
});

module.exports = router;
