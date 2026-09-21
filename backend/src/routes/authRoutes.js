const router = require('express').Router();
const auth = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterStudent:
 *       type: object
 *       required: [matricNo, fullName, email, departmentId, password]
 *       properties:
 *         matricNo:
 *           type: string
 *           example: 2023/12345
 *         fullName:
 *           type: string
 *           example: Aliyu Musa
 *         email:
 *           type: string
 *           example: ali.musa@tsuniversity.edu.ng
 *         departmentId:
 *           type: integer
 *           example: 1
 *         password:
 *           type: string
 *           example: StrongPass123
 *         level:
 *           type: string
 *           example: 400
 *     LoginRequest:
 *       type: object
 *       required: [identifier, password]
 *       properties:
 *         identifier:
 *           type: string
 *           description: Email address or matriculation number
 *           example: ali.musa@tsuniversity.edu.ng
 *         password:
 *           type: string
 *           example: StrongPass123
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *         user:
 *           type: object
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new student account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterStudent'
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       409:
 *         description: Account already exists
 */
router.post('/register', auth.registerStudent);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate and obtain a JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', auth.login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user object
 *       401:
 *         description: Authentication required
 */
router.get('/me', authenticate, auth.me);

module.exports = router;