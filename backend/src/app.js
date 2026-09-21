const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const authRoutes = require('./routes/authRoutes');
const { initDatabase, queries, DRIVER } = require('./config/db');

const DEFAULT_DEPARTMENTS = [
  { name: 'Computer Science Department', type: 'DEPARTMENT', order: 1 },
  { name: 'University Library', type: 'LIBRARY', order: 2 },
  { name: 'Bursary & Finance', type: 'BURSARY', order: 3 },
  { name: 'Student Affairs Division', type: 'STUDENT_AFFAIRS', order: 4 },
  { name: 'Registry / Senate', type: 'REGISTRY', order: 5 },
];

async function bootstrap() {
  await initDatabase();

  // Seed default departments for the SQLite dev fallback.
  if (DRIVER === 'sqlite') {
    try {
      await queries.seedDepartments(DEFAULT_DEPARTMENTS);
    } catch {
      /* tables already consistent */
    }
  }

  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (req, res) =>
    res.json({ status: 'ok', driver: DRIVER, time: new Date().toISOString() })
  );

  app.use('/api/auth', authRoutes);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // 404
  app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));

  // central error handler
  app.use((err, req, res, next) => {
    console.error(err);
    const message = err.message || 'Internal server error.';
    const code = /duplicate/i.test(message) ? 409 : 500;
    res.status(code).json({ error: message });
  });

  return app;
}

module.exports = { bootstrap };