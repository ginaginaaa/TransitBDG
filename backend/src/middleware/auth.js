const jwt = require('jsonwebtoken');

/**
 * Middleware autentikasi JWT.
 * Memvalidasi token dari header `Authorization: Bearer <token>`.
 * Menyimpan payload admin yang ter-decode ke `req.admin`.
 * Mengembalikan HTTP 401 jika token tidak ada atau tidak valid.
 */
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        req.admin = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
