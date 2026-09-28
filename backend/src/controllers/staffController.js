/**
 * Admin-only staff management: list HOD/OFFICER accounts, create a new HOD or
 * officer, and reset a staff member's password. The app exposes these from the
 * admin dashboard so an admin never needs direct DB access.
 */
const bcrypt = require('bcryptjs');
const { queries } = require('../config/db');
const { encryptPassword, decryptPassword } = require('../config/crypto');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STAFF_ROLES = ['HOD', 'OFFICER'];

async function listStaff(req, res) {
  const staff = await queries.listStaff();
  return res.json({ staff });
}

async function createStaff(req, res) {
  const { role, fullName, email, password, departmentId } = req.body;

  if (!STAFF_ROLES.includes(role)) {
    return res.status(400).json({ error: 'role must be HOD or OFFICER.' });
  }
  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ error: 'fullName is required.' });
  }
  if (!EMAIL_RE.test(email || '')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  const normEmail = email.trim().toLowerCase();
  const existing = await queries.findUserByEmail(normEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

  let deptId = null;
  if (departmentId) {
    const dept = await queries.findDeptById(Number(departmentId));
    if (!dept) {
      return res.status(400).json({ error: 'Invalid department.' });
    }
    deptId = Number(departmentId);
  } else if (role === 'HOD') {
    return res.status(400).json({ error: 'An HOD must be assigned a department.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const passwordEnc = encryptPassword(password);
  const { insertId: userId } = await queries.createUser({
    role,
    email: normEmail,
    fullName: fullName.trim(),
    passwordHash,
    passwordEnc,
    departmentId: deptId,
  });

  const user = await queries.findUserById(userId);
  return res.status(201).json({ staff: user });
}

async function resetPassword(req, res) {
  const { password } = req.body;
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  const staff = await queries.findUserById(Number(req.params.staffId));
  if (!staff) {
    return res.status(404).json({ error: 'Staff member not found.' });
  }
  if (!STAFF_ROLES.includes(staff.role)) {
    return res.status(400).json({ error: 'Only HOD/OFFICER passwords can be reset here.' });
  }

const passwordHash = await bcrypt.hash(password, 10);
  await queries.updateUserPassword(staff.user_id, { passwordHash, passwordEnc: encryptPassword(password) });
  return res.json({ message: 'Password updated successfully.', staff: { ...staff, password_hash: undefined } });
}

async function resetStudentPassword(req, res) {
  const { password } = req.body;
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  const user = await queries.findUserById(Number(req.params.studentId));
  if (!user || user.role !== 'STUDENT') {
    return res.status(404).json({ error: 'Student not found.' });
  }
  const student = await queries.findStudentByIdWithDept(user.user_id);
  if (!student) {
    return res.status(404).json({ error: 'Student profile not found.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await queries.updateUserPassword(user.user_id, { passwordHash, passwordEnc: encryptPassword(password) });
  return res.json({ message: 'Password updated successfully.', student });
}

async function listStudents(req, res) {
  const rows = await queries.listStudentsAll();
  const students = rows.map((r) => ({
    user_id: r.user_id,
    student_id: r.student_id,
    matric_no: r.matric_no,
    full_name: r.full_name,
    email: r.student_email || r.user_email,
    department_id: r.department_id,
    dept_name: r.dept_name || null,
    faculty_id: r.faculty_id || null,
    faculty_name: r.faculty_name || null,
    level: r.level,
    created_at: r.created_at,
    password: decryptPassword(r.pw_enc) || null,
  }));
  return res.json({ students });
}

module.exports = { listStaff, createStaff, resetPassword, resetStudentPassword, listStudents };