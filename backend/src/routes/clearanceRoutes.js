const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/clearanceController');

const router = Router();

router.use(authenticate);

// Student: start / view own clearance progress (auto-creates approvals).
router.post('/apply', authorize('STUDENT'), ctrl.applyClearance);
router.get('/my', authorize('STUDENT'), ctrl.myProgress);

// Officer / admin: dashboard + stamping.
router.get('/all', authorize('OFFICER', 'ADMIN'), ctrl.listAllClearances);
router.get('/:clearanceId', authorize('OFFICER', 'ADMIN'), ctrl.getClearanceDetail);
router.patch(
  '/:clearanceId/approvals/:deptId',
  authorize('OFFICER', 'ADMIN'),
  ctrl.stampApproval
);

module.exports = router;