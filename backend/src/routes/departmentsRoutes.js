const router = require('express').Router();
const auth = require('../controllers/authController');

/**
 * @swagger
 * /api/faculties:
 *   get:
 *     tags: [Data]
 *     summary: List all faculties and their departments
 *     responses:
 *       200:
 *         description: Faculties and full department catalog
 */
router.get('/faculties', auth.listFaculties);

module.exports = router;