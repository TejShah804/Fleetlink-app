const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const tripRoutes = require('./routes/tripRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
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

// Mount Resource API Routes
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/applications', applicationRoutes);

// Fallthrough 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
