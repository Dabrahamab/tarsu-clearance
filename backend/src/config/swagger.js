const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Student Clearance System API',
      version: '0.1.0',
      description:
        'REST API for the Android-Based Student Clearance System with O\'Level Verification (Taraba State University).',
    },
    servers: [{ url: 'http://localhost:5000', description: 'Local development server' }],
  },
  apis: [require('path').join(__dirname, '..', 'routes', '*.js')],
};

module.exports = swaggerJsdoc(options);