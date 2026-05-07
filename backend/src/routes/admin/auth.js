const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/db');

const router = express.Router();

/**
 * POST /login
 * Login admin — query berdasarkan username, verifikasi password dengan bcrypt,
 * terbitkan JWT dengan masa berlaku 8 jam.
 *
 * Body: { username: string, password: string }
 * Response 200: { token: string }
 * Response 401: { error: 'Username atau password salah' }
 */
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Validasi input dasar
    if (!username || !password) {
        return res.status(401).json({ error: 'Username atau password salah' });
    }

    try {
        // Query admin berdasarkan username
        const result = await query(
            'SELECT id, username, password_hash FROM admins WHERE username = $1',
            [username]
        );

        const admin = result.rows[0];

        // Jika admin tidak ditemukan, kembalikan pesan generik (jangan ungkap detail)
        if (!admin) {
            return res.status(401).json({ error: 'Username atau password salah' });
        }

        // Bandingkan password dengan hash yang tersimpan
        const passwordMatch = await bcrypt.compare(password, admin.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Username atau password salah' });
        }

        // Terbitkan JWT dengan payload minimal, masa berlaku 8 jam
        const token = jwt.sign(
            { id: admin.id, username: admin.username },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        return res.status(200).json({ token });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

module.exports = router;
