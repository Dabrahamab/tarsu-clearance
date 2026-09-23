const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const DRIVER = (process.env.DB_DRIVER || 'sqlite').toLowerCase();

let pool = null;   // mysql2 pool
let sqlite = null; // better-sqlite3 instance

const MYSQL_DDL = `
CREATE TABLE IF NOT EXISTS departments (
  dept_id     INT AUTO_INCREMENT PRIMARY KEY,
  dept_name   VARCHAR(100) NOT NULL UNIQUE,
  dept_type   ENUM('DEPARTMENT','LIBRARY','BURSARY','STUDENT_AFFAIRS','REGISTRY') NOT NULL DEFAULT 'DEPARTMENT',
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  user_id        INT AUTO_INCREMENT PRIMARY KEY,
  role           ENUM('STUDENT','OFFICER','ADMIN') NOT NULL DEFAULT 'STUDENT',
  email          VARCHAR(100) NOT NULL UNIQUE,
  full_name      VARCHAR(100) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  department_id  INT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_dept FOREIGN KEY (department_id)
    REFERENCES departments(dept_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS students (
  student_id    INT PRIMARY KEY,
  matric_no     VARCHAR(30) NOT NULL UNIQUE,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(100) NOT NULL UNIQUE,
  department_id INT NOT NULL,
  level         VARCHAR(20) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_students_dept FOREIGN KEY (department_id)
    REFERENCES departments(dept_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS olevel_verifications (
  verify_id           INT AUTO_INCREMENT PRIMARY KEY,
  student_id          INT NOT NULL,
  exam_body           ENUM('WAEC','NECO','NABTEB') NOT NULL,
  exam_number         VARCHAR(30) NOT NULL,
  exam_year           INT NOT NULL,
  card_pin_serial     VARCHAR(100) NOT NULL,
  candidate_name      VARCHAR(100) NULL,
  verification_status ENUM('PENDING','VERIFIED','REJECTED') NOT NULL DEFAULT 'PENDING',
  result_payload      JSON NULL,
  verified_at         TIMESTAMP NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_olevel (exam_body, exam_number, exam_year)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS clearance_requests (
  clearance_id   INT AUTO_INCREMENT PRIMARY KEY,
  student_id     INT NOT NULL,
  overall_status ENUM('IN_PROGRESS','APPROVED','REJECTED') NOT NULL DEFAULT 'IN_PROGRESS',
  submitted_at   DATE NOT NULL,
  completed_at   DATE NULL,
  clearance_ref  VARCHAR(40) NOT NULL UNIQUE,
  CONSTRAINT fk_clearance_student FOREIGN KEY (student_id)
    REFERENCES students(student_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS clearance_department_approvals (
  approval_id         INT AUTO_INCREMENT PRIMARY KEY,
  clearance_id        INT NOT NULL,
  dept_id             INT NOT NULL,
  status              ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  remarks             TEXT NULL,
  approved_by_user_id INT NULL,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_approval (clearance_id, dept_id),
  CONSTRAINT fk_approval_clearance FOREIGN KEY (clearance_id)
    REFERENCES clearance_requests(clearance_id) ON DELETE CASCADE,
  CONSTRAINT fk_approval_dept FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS documents (
  doc_id       INT AUTO_INCREMENT PRIMARY KEY,
  student_id   INT NOT NULL,
  clearance_id INT NULL,
  doc_type     VARCHAR(50) NOT NULL,
  file_path    VARCHAR(255) NOT NULL,
  mime_type    VARCHAR(100) NULL,
  uploaded_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_doc_student FOREIGN KEY (student_id)
    REFERENCES students(student_id) ON DELETE CASCADE
) ENGINE=InnoDB;
`;

const SQLITE_DDL = `
CREATE TABLE IF NOT EXISTS departments (
  dept_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  dept_name  TEXT NOT NULL UNIQUE,
  dept_type  TEXT NOT NULL DEFAULT 'DEPARTMENT',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  user_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  role          TEXT NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT','OFFICER','ADMIN')),
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_active     INTEGER NOT NULL DEFAULT 1,
  department_id INTEGER NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (department_id) REFERENCES departments(dept_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS students (
  student_id    INTEGER PRIMARY KEY,
  matric_no     TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  department_id INTEGER NOT NULL,
  level         TEXT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (department_id) REFERENCES departments(dept_id)
);

CREATE TABLE IF NOT EXISTS olevel_verifications (
  verify_id           INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id          INTEGER NOT NULL,
  exam_body           TEXT NOT NULL CHECK (exam_body IN ('WAEC','NECO','NABTEB')),
  exam_number         TEXT NOT NULL,
  exam_year           INTEGER NOT NULL,
  card_pin_serial     TEXT NOT NULL,
  candidate_name      TEXT NULL,
  verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING','VERIFIED','REJECTED')),
  result_payload      TEXT NULL,
  verified_at         TEXT NULL,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (exam_body, exam_number, exam_year),
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS clearance_requests (
  clearance_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id     INTEGER NOT NULL,
  overall_status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (overall_status IN ('IN_PROGRESS','APPROVED','REJECTED')),
  submitted_at   TEXT NOT NULL,
  completed_at   TEXT NULL,
  clearance_ref  TEXT NOT NULL UNIQUE,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS clearance_department_approvals (
  approval_id         INTEGER PRIMARY KEY AUTOINCREMENT,
  clearance_id        INTEGER NOT NULL,
  dept_id             INTEGER NOT NULL,
  status              TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  remarks             TEXT NULL,
  approved_by_user_id INTEGER NULL,
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (clearance_id, dept_id),
  FOREIGN KEY (clearance_id) REFERENCES clearance_requests(clearance_id) ON DELETE CASCADE,
  FOREIGN KEY (dept_id) REFERENCES departments(dept_id),
  FOREIGN KEY (approved_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS documents (
  doc_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id   INTEGER NOT NULL,
  clearance_id INTEGER NULL,
  doc_type     TEXT NOT NULL,
  file_path    TEXT NOT NULL,
  mime_type    TEXT NULL,
  uploaded_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);
`;

function initDatabase() {
  if (DRIVER === 'mysql') {
    const mysql = require('mysql2/promise');
    const host = process.env.DB_HOST || 'localhost';
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'student_clearance';

    // Connect without database first to create it if missing.
    pool = mysql.createPool({ host, user, password, waitForConnections: true, connectionLimit: 10 });
    return pool
      .query(`CREATE DATABASE IF NOT EXISTS \`${database}\``)
      .then(() => pool.end())
      .then(() => {
        pool = mysql.createPool({ host, user, password, database, waitForConnections: true, connectionLimit: 10 });
        return pool.query(MYSQL_DDL);
      });
  }

  // SQLite dev fallback (Node.js built-in node:sqlite module)
  const { DatabaseSync } = require('node:sqlite');
  const dbFile =
    path.resolve(__dirname, '..', '..', process.env.DB_FILE || 'data/devdb.sqlite');
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  sqlite = new DatabaseSync(dbFile);
  sqlite.exec('PRAGMA journal_mode = WAL');
  sqlite.exec('PRAGMA foreign_keys = ON');
  sqlite.exec(SQLITE_DDL);
  return Promise.resolve();
}

/**
 * Unified parameterised query runner.
 * Uses MySQL positional placeholders (`?`) and parameter binding support
 * in both drivers, sharing identical SQL for auth-focused queries.
 */
function run(sql, params = []) {
  if (DRIVER === 'mysql') {
    return pool.execute(sql, params).then(([rows]) => rows);
  }
  const stmt = sqlite.prepare(sql);
  try {
    const rows = stmt.all(...params);
    return Promise.resolve(rows);
  } catch (err) {
    if (/no such table/.test(err.message)) {
      return Promise.resolve([]);
    }
    throw err;
  }
}

function runSingle(sql, params = []) {
  return run(sql, params).then((rows) => rows[0] || null);
}

function insert(sql, params = []) {
  if (DRIVER === 'mysql') {
    return pool.execute(sql, params).then(([result]) => ({ insertId: result.insertId }));
  }
  const info = sqlite.prepare(sql).run(...params);
  return Promise.resolve({ insertId: Number(info.lastInsertRowid) });
}

// ---------------------------------------------------------------------------
// Data-access helpers (auth scope - Sprint 1)
// ---------------------------------------------------------------------------
const queries = {
  findUserByEmail: (email) =>
    runSingle('SELECT user_id, role, email, full_name, password_hash, department_id, created_at FROM users WHERE email = ?', [email]),
  findUserById: (id) =>
    runSingle('SELECT user_id, role, email, full_name, department_id, created_at FROM users WHERE user_id = ?', [id]),
  findUserWithPasswordById: (id) =>
    runSingle('SELECT user_id, role, email, full_name, password_hash, department_id, created_at FROM users WHERE user_id = ?', [id]),
  createUser: (u) =>
    insert(
      'INSERT INTO users (role, email, full_name, password_hash, department_id) VALUES (?, ?, ?, ?, ?)',
      [u.role, u.email, u.fullName, u.passwordHash, u.departmentId || null]
    ),
  findStudentByMatric: (matric) =>
    runSingle(
      'SELECT student_id, matric_no, full_name, email, department_id FROM students WHERE matric_no = ?',
      [matric]
    ),
  createStudent: (s) =>
    insert(
      'INSERT INTO students (student_id, matric_no, full_name, email, department_id, level) VALUES (?, ?, ?, ?, ?, ?)',
      [s.studentId, s.matricNo, s.fullName, s.email, s.departmentId, s.level || null]
    ),
  listDepartments: () =>
    run('SELECT dept_id, dept_name, dept_type, sort_order FROM departments ORDER BY sort_order ASC'),
  findDeptById: (id) => runSingle('SELECT dept_id, dept_name FROM departments WHERE dept_id = ?', [id]),
  seedDepartments: (depts) => {
    const insertDept = sqlite.prepare(
      'INSERT OR IGNORE INTO departments (dept_name, dept_type, sort_order) VALUES (?, ?, ?)'
    );
    sqlite.exec('BEGIN');
    try {
      for (const d of depts) insertDept.run(d.name, d.type, d.order);
      sqlite.exec('COMMIT');
    } catch (err) {
      sqlite.exec('ROLLBACK');
      throw err;
    }
    return Promise.resolve();
  },

  // -------------------------------------------------------------------------
  // O'Level verification queries (Sprint 2 — blueprint §4-B)
  // -------------------------------------------------------------------------
  createOlevelVerification: (v) =>
    insert(
      `INSERT INTO olevel_verifications
         (student_id, exam_body, exam_number, exam_year, card_pin_serial, candidate_name, verification_status, result_payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [v.studentId, v.examBody, v.examNumber, v.examYear, v.cardPinSerial, v.candidateName, v.status || 'PENDING', v.resultPayload || null]
    ),
  findOlevelByComposite: ({ examBody, examNumber, examYear }) =>
    runSingle(
      `SELECT verify_id, student_id, exam_body, exam_number, exam_year, card_pin_serial,
              candidate_name, verification_status, result_payload, verified_at, created_at
       FROM olevel_verifications
       WHERE exam_body = ? AND exam_number = ? AND exam_year = ?`,
      [examBody, examNumber, examYear]
    ),
  findOlevelById: (verifyId) =>
    runSingle(
      `SELECT v.verify_id, v.student_id, v.exam_body, v.exam_number, v.exam_year, v.card_pin_serial,
              v.candidate_name, v.verification_status, v.result_payload, v.verified_at, v.created_at,
              s.full_name AS student_name, s.matric_no
       FROM olevel_verifications v
       LEFT JOIN students s ON s.student_id = v.student_id
       WHERE v.verify_id = ?`,
      [verifyId]
    ),
  listOlevelByStudent: (studentId) =>
    run(
      `SELECT verify_id, student_id, exam_body, exam_number, exam_year, card_pin_serial,
              candidate_name, verification_status, result_payload, verified_at, created_at
       FROM olevel_verifications
       WHERE student_id = ?
       ORDER BY created_at DESC`,
      [studentId]
    ),
  listAllOlevel: () =>
    run(
      `SELECT v.verify_id, v.student_id, v.exam_body, v.exam_number, v.exam_year, v.card_pin_serial,
              v.candidate_name, v.verification_status, v.verified_at, v.created_at,
              s.full_name AS student_name, s.matric_no
       FROM olevel_verifications v
       LEFT JOIN students s ON s.student_id = v.student_id
       ORDER BY v.created_at DESC`
    ),
  updateOlevelStatus: (verifyId, { status, resultPayload }) =>
    run(
      `UPDATE olevel_verifications
       SET verification_status = ?, result_payload = ?, verified_at = CURRENT_TIMESTAMP
       WHERE verify_id = ?`,
      [status, resultPayload || null, verifyId]
    ),

  // -------------------------------------------------------------------------
  // Documents / uploads (Sprint 3 — blueprint §4-A, §6 uploads)
  // -------------------------------------------------------------------------
  createDocument: (d) =>
    insert(
      `INSERT INTO documents (student_id, doc_type, file_path, mime_type) VALUES (?, ?, ?, ?)`,
      [d.studentId, d.docType, d.filePath, d.mimeType || null]
    ),
  listDocumentsByStudent: (studentId) =>
    run(
      `SELECT doc_id, student_id, doc_type, file_path, mime_type, uploaded_at
       FROM documents
       WHERE student_id = ?
       ORDER BY uploaded_at DESC`,
      [studentId]
    ),

  // -------------------------------------------------------------------------
  // Clearance requests + department approvals (Sprint 3 — blueprint §4-C)
  // -------------------------------------------------------------------------
  createClearanceRequest: (c) =>
    insert(
      `INSERT INTO clearance_requests (student_id, overall_status, submitted_at, clearance_ref)
       VALUES (?, ?, ?, ?)`,
      [c.studentId, 'IN_PROGRESS', c.submittedAt, c.clearanceRef]
    ),
  findClearanceByStudent: (studentId) =>
    runSingle(
      `SELECT clearance_id, student_id, overall_status, submitted_at, completed_at, clearance_ref
       FROM clearance_requests
       WHERE student_id = ?`,
      [studentId]
    ),
  findClearanceById: (clearanceId) =>
    runSingle(
      `SELECT c.clearance_id, c.student_id, c.overall_status, c.submitted_at, c.completed_at, c.clearance_ref,
              s.matric_no, s.full_name, s.email, s.level, s.department_id, d.dept_name
       FROM clearance_requests c
       LEFT JOIN students s ON s.student_id = c.student_id
       LEFT JOIN departments d ON d.dept_id = s.department_id
       WHERE c.clearance_id = ?`,
      [clearanceId]
    ),
  ensureApprovalRows: (clearanceId, deptIds) =>
    Promise.all(
      deptIds.map((deptId) =>
        run(
          `INSERT INTO clearance_department_approvals (clearance_id, dept_id, status)
           VALUES (?, ?, 'PENDING')`,
          [clearanceId, deptId]
        ).catch(() => null)
      )
    ),
  listApprovalsByClearance: (clearanceId) =>
    run(
      `SELECT a.approval_id, a.clearance_id, a.dept_id, a.status, a.remarks, a.approved_by_user_id, a.updated_at,
              d.dept_name, d.dept_type
       FROM clearance_department_approvals a
       LEFT JOIN departments d ON d.dept_id = a.dept_id
       WHERE a.clearance_id = ?
       ORDER BY d.sort_order ASC`,
      [clearanceId]
    ),
  listClearances: () =>
    run(
      `SELECT c.clearance_id, c.student_id, c.overall_status, c.submitted_at, c.completed_at, c.clearance_ref,
              s.matric_no, s.full_name AS student_name, s.email AS student_email,
              d.dept_name AS department_name
       FROM clearance_requests c
       LEFT JOIN students s ON s.student_id = c.student_id
       LEFT JOIN departments d ON d.dept_id = s.department_id
       ORDER BY c.submitted_at DESC`
    ),
  updateApprovalStatus: (clearanceId, deptId, { status, remarks, approvedByUserId }) =>
    run(
      `UPDATE clearance_department_approvals
       SET status = ?, remarks = ?, approved_by_user_id = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE clearance_id = ? AND dept_id = ?`,
      [status, remarks || null, approvedByUserId, clearanceId, deptId]
    ),
  updateClearanceStatus: (clearanceId, { overallStatus, completedAt }) => {
    if (DRIVER === 'sqlite') {
      return run(
        `UPDATE clearance_requests SET overall_status = ?, completed_at = ?
         WHERE clearance_id = ?`,
        [overallStatus, completedAt || null, clearanceId]
      );
    }
    return run(
      `UPDATE clearance_requests
       SET overall_status = ?, completed_at = ?
       WHERE clearance_id = ?`,
      [overallStatus, completedAt || null, clearanceId]
    );
  },
  findStudentByIdWithDept: (studentId) =>
    runSingle(
      `SELECT s.student_id, s.matric_no, s.full_name, s.email, s.department_id, s.level, s.created_at,
              d.dept_name
       FROM students s
       LEFT JOIN departments d ON d.dept_id = s.department_id
       WHERE s.student_id = ?`,
      [studentId]
    ),
  searchStudentsByMatric: (term) =>
    run(
      `SELECT s.student_id, s.matric_no, s.full_name, s.email, s.department_id, s.level, s.created_at,
              d.dept_name
       FROM students s
       LEFT JOIN departments d ON d.dept_id = s.department_id
       WHERE s.matric_no LIKE ? OR s.full_name LIKE ? OR s.email LIKE ?
       ORDER BY s.full_name ASC
       LIMIT 50`,
      [`%${term}%`, `%${term}%`, `%${term}%`]
    ),
};

module.exports = { DRIVER, initDatabase, run, runSingle, insert, queries };