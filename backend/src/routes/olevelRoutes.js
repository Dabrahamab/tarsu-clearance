const router = require('express').Router();
const {
  authenticate,
  authorize,
} = require('../middleware/auth');
const olevelController = require('../controllers/olevelController');
const { uploadMiddleware } = require('../middleware/upload');

/**
 * @swagger
 * /api/olevel/verify:
 *   post:
 *     tags: [O'Level]
 *     summary: Submit an O'Level result for verification (STUDENT)
 *     description: >
 *       Student submits their WAEC/NECO/NABTEB credential plus the scratch-card
 *       PIN/serial. The engine validates the credential, queries the result
 *       provider (mock gateway in dev), parses the payload into subject/grade
 *       rows and returns a VERIFIED / REJECTED verdict with the candidate name.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OlevelVerifyRequest'
 *     responses:
 *       201:
 *         description: Verification created with verdict
 *       400:
 *         description: Invalid credential format
 *       409:
 *         description: Result already submitted for this credential
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Students only
 */
router.post('/verify', authenticate, authorize('STUDENT'), olevelController.submitVerification);

/**
 * @swagger
 * /api/olevel/my:
 *   get:
 *     tags: [O'Level]
 *     summary: List my verification records (STUDENT)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of the student's own verifications
 */
router.get('/my', authenticate, authorize('STUDENT'), olevelController.listMyVerifications);

/**
 * @swagger
 * /api/olevel/verifications:
 *   get:
 *     tags: [O'Level]
 *     summary: List all verifications (OFFICER/ADMIN)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated verification records
 */
router.get(
  '/verifications',
  authenticate,
  authorize('OFFICER', 'ADMIN'),
  olevelController.listStudentVerifications
);

/**
 * @swagger
 * /api/olevel/verifications/{verifyId}:
 *   get:
 *     tags: [O'Level]
 *     summary: Get a verification by id (owner, or OFFICER/ADMIN)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: verifyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verification record
 *       404:
 *         description: Not found
 */
router.get(
  '/verifications/:verifyId',
  authenticate,
  olevelController.getVerification
);

/**
 * @swagger
 * /api/olevel/verifications/{verifyId}/confirm:
 *   patch:
 *     tags: [O'Level]
 *     summary: Confirm or reject a verification (OFFICER/ADMIN)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: verifyId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [VERIFIED, REJECTED]
 *     responses:
 *       200:
 *         description: Verification status updated
 *       403:
 *         description: Officers/admins only
 */
router.patch(
  '/verifications/:verifyId/confirm',
  authenticate,
  authorize('OFFICER', 'ADMIN'),
  olevelController.confirmVerification
);

/**
 * @swagger
 * /api/olevel/verifications/{verifyId}:
 *   patch:
 *     tags: [O'Level]
 *     summary: Edit a verification record (ADMIN only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: verifyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verification updated
 *       403:
 *         description: Admin only
 */
router.patch(
  '/verifications/:verifyId',
  authenticate,
  olevelController.editVerification
);

/**
 * @swagger
 * /api/olevel/verifications/{verifyId}:
 *   delete:
 *     tags: [O'Level]
 *     summary: Delete a verification record (ADMIN only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: verifyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verification deleted
 *       403:
 *         description: Admin only
 */
router.delete(
  '/verifications/:verifyId',
  authenticate,
  olevelController.deleteVerification
);

/**
 * @swagger
 * /api/olevel/upload:
 *   post:
 *     tags: [O'Level]
 *     summary: Upload an O'Level document (STUDENT)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Document uploaded
 *       400:
 *         description: No file provided
 */
router.post(
  '/upload',
  authenticate,
  authorize('STUDENT'),
  uploadMiddleware.single('file'),
  olevelController.uploadDocument
);

router.get(
  '/documents',
  authenticate,
  authorize('STUDENT'),
  olevelController.listMyDocuments
);

module.exports = router;
