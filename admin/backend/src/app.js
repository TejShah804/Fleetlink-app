const express = require('express');
const cors = require('cors');

const adminAuthRoutes = require('./routes/adminAuthRoutes');
const overviewRoutes = require('./routes/overviewRoutes');
const operatorRoutes = require('./routes/operatorRoutes');
const driverRoutes = require('./routes/driverRoutes');
const tripRoutes = require('./routes/tripRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Global Middleware
app.use(cors({
  origin: '*', // Admin panel origin; lock this down to the panel's domain in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'FleetLink Admin API is active',
    timestamp: new Date().toISOString()
  });
});

// Mount Resource API Routes
app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin', overviewRoutes);
app.use('/api/admin/operators', operatorRoutes);
app.use('/api/admin/drivers', driverRoutes);
app.use('/api/admin/trips', tripRoutes);
app.use('/api/admin/applications', applicationRoutes);

// Fallthrough 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
