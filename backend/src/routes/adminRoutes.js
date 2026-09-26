const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/clearanceController');
const staff = require('../controllers/staffController');

const router = Router();

router.use(authenticate);

// Matric / name search used by staff.
router.get('/students/search', authorize('OFFICER', 'HOD', 'ADMIN'), ctrl.searchStudents);

// Admin-only: register a new clearance unit, faculty or department.
router.post('/catalog', authorize('ADMIN'), ctrl.createAdminCatalog);

// Admin-only: HOD / officer account management (create + password reset).
router.get('/staff', authorize('ADMIN'), staff.listStaff);
router.post('/staff', authorize('ADMIN'), staff.createStaff);
router.patch('/staff/:staffId/password', authorize('ADMIN'), staff.resetPassword);

// Admin-only: reset a student's password (student_id == user_id).
router.patch('/students/:studentId/password', authorize('ADMIN'), staff.resetStudentPassword);

module.exports = router;