const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/clearanceController');

const router = Router();

router.use(authenticate);

// Matric / name search used by staff.
router.get('/students/search', authorize('OFFICER', 'HOD', 'ADMIN'), ctrl.searchStudents);

// Admin-only: register a new clearance unit, faculty or department.
router.post('/catalog', authorize('ADMIN'), ctrl.createAdminCatalog);

module.exports = router;