const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const authRoutes = require('./routes/authRoutes');
const departmentsRoutes = require('./routes/departmentsRoutes');
const olevelRoutes = require('./routes/olevelRoutes');
const clearanceRoutes = require('./routes/clearanceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { initDatabase, DRIVER } = require('./config/db');
const { UPLOAD_DIR } = require('./middleware/upload');

async function bootstrap() {
  await initDatabase();

  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (req, res) =>
    res.json({ status: 'ok', driver: DRIVER, time: new Date().toISOString() })
  );

  app.use('/api/auth', authRoutes);
  app.use('/api', departmentsRoutes);
  app.use('/api/olevel', olevelRoutes);
  app.use('/api/clearance', clearanceRoutes);
  app.use('/api/admin', adminRoutes);

  // Serve uploaded documents (student O'Level files etc.).
  app.use('/uploads', express.static(UPLOAD_DIR));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // 404
  app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));

  // central error handler
  app.use((err, req, res, next) => {
    console.error(err);
    const message = err.message || 'Internal server error.';
    let code = /duplicate/i.test(message) ? 409 : 500;
    if (err.name === 'MulterError') code = 400; // e.g. LIMIT_FILE_SIZE
    res.status(code).json({ error: message });
  });

  return app;
}

module.exports = { bootstrap };