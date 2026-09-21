require('dotenv').config();
const { bootstrap } = require('./app');

const PORT = process.env.PORT || 5000;

bootstrap()
  .then((app) => {
    const server = app.listen(PORT, () => {
      console.log(`[student-clearance] API running on http://localhost:${PORT}`);
      console.log(`[student-clearance] Swagger UI  -> http://localhost:${PORT}/api-docs`);
      console.log(`[student-clearance] DB driver   -> ${require('./config/db').DRIVER}`);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[student-clearance] Port ${PORT} is already in use.`);
        process.exit(1);
      }
      throw err;
    });
  })
  .catch((err) => {
    console.error('Failed to start API:', err);
    process.exit(1);
  });