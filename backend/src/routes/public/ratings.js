const express = require('express');
const { query } = require('../../config/db');

const router = express.Router();

/**
 * POST /api/v1/ratings
 * Submit a rating for a route.
 * Required body fields: route_id, score (integer 1–5)
 * Optional: comment (max 200 characters)
 * Returns 201 with the created rating on success.
 * Returns 400 if score is out of range or route_id is missing.
 */
router.post('/', async (req, res) => {
  const { route_id, score, comment } = req.body;

  // Validate route_id
  if (!route_id) {
    return res.status(400).json({ error: 'route_id wajib diisi' });
  }

  // Validate score: must be an integer between 1 and 5 inclusive
  const scoreInt = parseInt(score, 10);
  if (!score || isNaN(scoreInt) || scoreInt < 1 || scoreInt > 5 || String(scoreInt) !== String(score)) {
    return res.status(400).json({ error: 'Score harus antara 1 dan 5' });
  }

  // Validate comment length if provided
  if (comment && comment.length > 200) {
    return res.status(400).json({ error: 'Komentar maksimal 200 karakter' });
  }

  try {
    const result = await query(
      `INSERT INTO ratings (route_id, score, comment)
       VALUES ($1, $2, $3)
       RETURNING id, route_id, score, comment, submitted_at`,
      [route_id, scoreInt, comment || null]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error saving rating:', err);
    return res.status(500).json({ error: 'Gagal menyimpan rating', detail: err.message });
  }
});

/**
 * GET /api/v1/ratings/:route_id
 * Returns the average score and total rating count for a route.
 * Response: { route_id, average_score, total_ratings }
 * If no ratings exist: { route_id, average_score: null, total_ratings: 0 }
 */
router.get('/:route_id', async (req, res) => {
  const { route_id } = req.params;

  try {
    const result = await query(
      `SELECT
        COUNT(*)::INTEGER AS total_ratings,
        CASE WHEN COUNT(*) > 0 THEN ROUND(AVG(score)::NUMERIC, 2) ELSE NULL END AS average_score
       FROM ratings
       WHERE route_id = $1`,
      [route_id]
    );

    const { total_ratings, average_score } = result.rows[0];

    return res.json({
      route_id: parseInt(route_id, 10),
      average_score: average_score !== null ? parseFloat(average_score) : null,
      total_ratings,
    });
  } catch (err) {
    console.error(`Error fetching ratings for route ${route_id}:`, err);
    return res.status(500).json({ error: 'Gagal mengambil rating rute', detail: err.message });
  }
});

module.exports = router;
