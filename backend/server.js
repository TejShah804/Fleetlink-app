const dotenv = require('dotenv');

// Load environment variables before anything else
dotenv.config();

const app = require('./src/app');
const { testConnection } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  console.log(`=========================================`);
  console.log(` FleetLink Backend Server is running!`);
  console.log(` Port: ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Base URL: http://localhost:${PORT}/api`);
  console.log(` Health Check: http://localhost:${PORT}/api/health`);
  console.log(`=========================================`);

  // Verify MySQL Connection
  await testConnection();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
