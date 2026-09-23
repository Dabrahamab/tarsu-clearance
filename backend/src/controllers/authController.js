const bcrypt = require('bcryptjs');
const { queries } = require('../config/db');
const { signToken } = require('../middleware/auth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeUsername(input = '') {
  return input.trim().toLowerCase();
}

async function registerStudent(req, res) {
  const { matricNo, fullName, email, facultyId, departmentId, password, level } = req.body;

  if (!matricNo || !fullName || !email || !facultyId || !departmentId || !password) {
    return res.status(400).json({
      error: 'matricNo, fullName, email, facultyId, departmentId and password are required.',
    });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  const normEmail = normalizeUsername(email);
  const normMatric = normalizeUsername(matricNo);

  const faculty = await queries.findFacultyById(Number(facultyId));
  if (!faculty) {
    return res.status(400).json({ error: 'Invalid facultyId.' });
  }
  const dept = await queries.findDeptById(Number(departmentId));
  if (!dept || Number(dept.faculty_id) !== Number(facultyId)) {
    return res.status(400).json({ error: 'The selected department does not belong to that faculty.' });
  }

  const [existingUser, existingMatric] = await Promise.all([
    queries.findUserByEmail(normEmail),
    queries.findStudentByMatric(normMatric),
  ]);

  if (existingUser) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }
  if (existingMatric) {
    return res.status(409).json({ error: 'This matriculation number is already registered.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const { insertId: userId } = await queries.createUser({
    role: 'STUDENT',
    email: normEmail,
    fullName,
    passwordHash,
    departmentId: Number(departmentId),
  });

  await queries.createStudent({
    studentId: userId,
    matricNo: normMatric,
    fullName,
    email: normEmail,
    departmentId: Number(departmentId),
    level,
  });

  const user = await queries.findUserById(userId);
  const token = signToken(user);
  return res.status(201).json({ token, user });
}

async function login(req, res) {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'identifier and password are required.' });
  }

  const norm = normalizeUsername(identifier);
  let user = await queries.findUserByEmail(norm);
  if (!user) {
    const student = await queries.findStudentByMatric(norm);
    if (student) user = await queries.findUserWithPasswordById(student.student_id);
  }
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  if (!user.password_hash) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const token = signToken(user);
  return res.json({ token, user: { ...user, password_hash: undefined } });
}

async function me(req, res) {
  return res.json({ user: req.user });
}

async function listFaculties(req, res) {
  const faculties = await queries.listFaculties();
  const departments = await queries.listAllDepartments();
  return res.json({ faculties, departments });
}

module.exports = { registerStudent, login, me, listFaculties };