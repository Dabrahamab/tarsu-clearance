const router = require('express').Router();
const auth = require('../controllers/authController');

/**
 * @swagger
 * /api/departments:
 *   get:
 *     tags: [Data]
 *     summary: List all clearance departments (in workflow order)
 *     responses:
 *       200:
 *         description: Array of departments
 */
router.get('/departments', auth.listDepartments);

module.exports = router;