const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/clearanceController');

const router = Router();

router.use(authenticate);

// Matric / name search used by officers & admins.
router.get('/students/search', authorize('OFFICER', 'ADMIN'), ctrl.searchStudents);

module.exports = router;