const express = require('express');
const cors = require('cors');

const path = require('path');

const authRoutes = require('./routes/authRoutes');
const tripRoutes = require('./routes/tripRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Global Middleware
app.use(cors({
  origin: '*', // For development flexibility; can be locked down in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'FleetLink API is active',
    timestamp: new Date().toISOString()
  });
});

/**
 * Delivery proof photos.
 *
 * Served as static files so the operator's trip detail page can render the
 * proof with a plain <img src>. multer already restricted the extension to
 * .jpg/.jpeg/.png, and uploads live outside the public folder, so this path
 * cannot be used to read application source or .env.
 */
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Mount Resource API Routes
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/notifications', notificationRoutes);

// Fallthrough 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
