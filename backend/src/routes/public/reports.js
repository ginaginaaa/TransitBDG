const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { query } = require('../../config/db');
const { generateReportCode } = require('../../utils/reportCode');

const router = express.Router();

// Multer with memory storage for handling multipart/form-data
const upload = multer({ storage: multer.memoryStorage() });

// S3 client
const s3 = new S3Client({ region: process.env.AWS_REGION });

// Valid categories as defined in the DB schema
const VALID_CATEGORIES = ['Kemacetan', 'Kecelakaan', 'Kendaraan Rusak', 'Angkot Ngetem', 'Halte Rusak'];

// Max photo size: 5 MB
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

/**
 * Upload a file buffer to S3 and return the CloudFront URL.
 * @param {Buffer} buffer - File buffer
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} CloudFront URL
 */
async function uploadToS3(buffer, mimeType) {
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const key = `reports/${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));

  return `${process.env.CLOUDFRONT_URL}/${key}`;
}

/**
 * GET /api/v1/reports/feed
 * Returns reports with status 'Diterima' or 'Diproses', ordered by submitted_at DESC.
 * Supports query params: ?category=&route_id=
 * Joins with routes table to include route name.
 *
 * NOTE: This route is defined BEFORE /:code to avoid route conflicts.
 */
router.get('/feed', async (req, res) => {
  const { category, route_id } = req.query;

  try {
    const conditions = [`rep.status IN ('Diterima', 'Diproses')`];
    const params = [];

    if (category) {
      params.push(category);
      conditions.push(`rep.category = $${params.length}`);
    }

    if (route_id) {
      params.push(route_id);
      conditions.push(`rep.route_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

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
        rep.submitted_at
      FROM reports rep
      LEFT JOIN routes r ON rep.route_id = r.id
      ${whereClause}
      ORDER BY rep.submitted_at DESC
    `;

    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching reports feed:', err);
    return res.status(500).json({ error: 'Gagal mengambil feed laporan', detail: err.message });
  }
});

/**
 * GET /api/v1/reports/track/:code
 * Returns full report details by report_code, or 404 if not found.
 *
 * NOTE: This route is defined BEFORE any generic parameterized routes.
 */
router.get('/track/:code', async (req, res) => {
  const { code } = req.params;

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
      WHERE rep.report_code = $1`,
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Laporan tidak ditemukan' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error fetching report ${code}:`, err);
    return res.status(500).json({ error: 'Gagal mengambil detail laporan', detail: err.message });
  }
});

/**
 * POST /api/v1/reports
 * Accepts multipart/form-data.
 * Required fields: category, description, and either location_text OR (location_lat + location_lng).
 * Optional: photo (image/jpeg or image/png, max 5MB), route_id.
 * Returns { report_code, status: 'Diterima' } on success.
 */
router.post('/', upload.single('photo'), async (req, res) => {
  const { category, description, location_text, location_lat, location_lng, route_id } = req.body;
  const errors = {};

  // Validate category
  if (!category) {
    errors.category = 'Kategori wajib diisi';
  } else if (!VALID_CATEGORIES.includes(category)) {
    errors.category = `Kategori harus salah satu dari: ${VALID_CATEGORIES.join(', ')}`;
  }

  // Validate description
  if (!description) {
    errors.description = 'Deskripsi wajib diisi';
  } else if (description.length > 500) {
    errors.description = 'Deskripsi maksimal 500 karakter';
  }

  // Validate location: either location_text OR (location_lat + location_lng) must be provided
  const hasLocationText = location_text && location_text.trim().length > 0;
  const hasCoords = location_lat && location_lng;

  if (!hasLocationText && !hasCoords) {
    errors.location_text = 'Lokasi wajib diisi (teks lokasi atau koordinat)';
  }

  // Validate photo if provided
  let photoUrl = null;
  if (req.file) {
    const allowedMimeTypes = ['image/jpeg', 'image/png'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      errors.photo = 'Format foto harus JPEG atau PNG';
    } else if (req.file.size > MAX_PHOTO_SIZE) {
      errors.photo = 'Ukuran foto maksimal 5 MB';
    }
  }

  // Return 400 with per-field errors if validation fails
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  // Upload photo to S3 if provided and valid
  if (req.file) {
    try {
      photoUrl = await uploadToS3(req.file.buffer, req.file.mimetype);
    } catch (err) {
      console.error('Error uploading photo to S3:', err);
      return res.status(500).json({ error: 'Gagal mengunggah foto', detail: err.message });
    }
  }

  // Generate unique report code
  const reportCode = generateReportCode();

  try {
    await query(
      `INSERT INTO reports
        (report_code, category, description, location_text, location_lat, location_lng, route_id, photo_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Diterima')`,
      [
        reportCode,
        category,
        description,
        location_text || null,
        location_lat || null,
        location_lng || null,
        route_id || null,
        photoUrl,
      ]
    );

    return res.status(201).json({ report_code: reportCode, status: 'Diterima' });
  } catch (err) {
    console.error('Error saving report:', err);
    return res.status(500).json({ error: 'Gagal menyimpan laporan', detail: err.message });
  }
});

module.exports = router;
