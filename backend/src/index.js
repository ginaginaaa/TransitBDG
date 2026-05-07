require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Public routes
const publicRoutesRouter = require('./routes/public/routes');
const publicStopsRouter = require('./routes/public/stops');
const publicReportsRouter = require('./routes/public/reports');
const publicRatingsRouter = require('./routes/public/ratings');
const publicAnnouncementsRouter = require('./routes/public/announcements');
const publicAlertsRouter = require('./routes/public/alerts');

// Admin routes
const adminAuthRouter = require('./routes/admin/auth');
const adminReportsRouter = require('./routes/admin/reports');
const adminRoutesRouter = require('./routes/admin/routes');
const adminAnnouncementsRouter = require('./routes/admin/announcements');
const adminStatsRouter = require('./routes/admin/stats');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Public routes — /api/v1
app.use('/api/v1/routes', publicRoutesRouter);
app.use('/api/v1/stops', publicStopsRouter);
app.use('/api/v1/reports', publicReportsRouter);
app.use('/api/v1/ratings', publicRatingsRouter);
app.use('/api/v1/announcements', publicAnnouncementsRouter);
app.use('/api/v1/alerts', publicAlertsRouter);

// Admin routes — /api/v1/admin
app.use('/api/v1/admin/auth', adminAuthRouter);
app.use('/api/v1/admin/reports', adminReportsRouter);
app.use('/api/v1/admin/routes', adminRoutesRouter);
app.use('/api/v1/admin/announcements', adminAnnouncementsRouter);
app.use('/api/v1/admin/stats', adminStatsRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`TransitBDG backend running on port ${PORT}`);
});

module.exports = app;
