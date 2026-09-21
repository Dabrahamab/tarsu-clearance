-- =============================================================================
-- Android-Based Student Clearance System with O'Level Verification
-- MySQL 8.x Schema (Authoritative production schema)
-- Taraba State University - Dept. of Computer Science (Sprint 1)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS student_clearance
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE student_clearance;

-- -----------------------------------------------------------------------------
-- departments: institutional clearing authorities
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  dept_id     INT AUTO_INCREMENT PRIMARY KEY,
  dept_name   VARCHAR(100) NOT NULL UNIQUE,
  dept_type   ENUM('DEPARTMENT','LIBRARY','BURSARY','STUDENT_AFFAIRS','REGISTRY') NOT NULL DEFAULT 'DEPARTMENT',
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- users: all authenticated actors (students, officers, admins) - RBAC
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- students: student-specific profile / academic identity
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
  student_id    INT PRIMARY KEY,
  matric_no     VARCHAR(30) NOT NULL UNIQUE,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(100) NOT NULL UNIQUE,
  department_id INT NOT NULL,
  level         VARCHAR(20) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_students_department FOREIGN KEY (department_id)
    REFERENCES departments(dept_id),
  CONSTRAINT fk_students_user FOREIGN KEY (student_id)
    REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- olevel_verifications: WAEC / NECO / NABTEB credential verification records
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS olevel_verifications (
  verify_id          INT AUTO_INCREMENT PRIMARY KEY,
  student_id         INT NOT NULL,
  exam_body          ENUM('WAEC','NECO','NABTEB') NOT NULL,
  exam_number        VARCHAR(30) NOT NULL,
  exam_year          INT NOT NULL,
  card_pin_serial    VARCHAR(100) NOT NULL,
  candidate_name     VARCHAR(100) NULL,
  verification_status ENUM('PENDING','VERIFIED','REJECTED') NOT NULL DEFAULT 'PENDING',
  result_payload     JSON NULL,
  verified_at        TIMESTAMP NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_olevel_student FOREIGN KEY (student_id)
    REFERENCES students(student_id) ON DELETE CASCADE,
  UNIQUE KEY uq_olevel (exam_body, exam_number, exam_year)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- clearance_requests: one student may hold one active clearance process
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clearance_requests (
  clearance_id   INT AUTO_INCREMENT PRIMARY KEY,
  student_id     INT NOT NULL,
  overall_status ENUM('IN_PROGRESS','APPROVED','REJECTED') NOT NULL DEFAULT 'IN_PROGRESS',
  submitted_at   DATE NOT NULL,
  completed_at   DATE NULL,
  clearance_ref  VARCHAR(40) NOT NULL UNIQUE,
  CONSTRAINT fk_clearance_student FOREIGN KEY (student_id)
    REFERENCES students(student_id) ON DELETE CASCADE,
  CONSTRAINT fk_clearance_olevel FOREIGN KEY (student_id)
    REFERENCES olevel_verifications(student_id)
) ENGINE=InnoDB;
-- NOTE: clearance_requests.student_id acts as a gateway key to the student's
-- verified O'Level record. A separate FK to olevel_verifications can be added
-- once Sprint 2 defines the mid-gate semantics.

-- -----------------------------------------------------------------------------
-- clearance_department_approvals: per-department stage in the workflow
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clearance_department_approvals (
  approval_id         INT AUTO_INCREMENT PRIMARY KEY,
  clearance_id        INT NOT NULL,
  dept_id             INT NOT NULL,
  status              ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  remarks             TEXT NULL,
  approved_by_user_id INT NULL,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_approval_clearance FOREIGN KEY (clearance_id)
    REFERENCES clearance_requests(clearance_id) ON DELETE CASCADE,
  CONSTRAINT fk_approval_dept FOREIGN KEY (dept_id)
    REFERENCES departments(dept_id),
  CONSTRAINT fk_approval_officer FOREIGN KEY (approved_by_user_id)
    REFERENCES users(user_id) ON DELETE SET NULL,
  UNIQUE KEY uq_approval (clearance_id, dept_id)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- documents: uploaded proof attachments (receipts, library slips, ID)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  doc_id        INT AUTO_INCREMENT PRIMARY KEY,
  student_id    INT NOT NULL,
  clearance_id  INT NULL,
  doc_type      VARCHAR(50) NOT NULL,
  file_path     VARCHAR(255) NOT NULL,
  mime_type     VARCHAR(100) NULL,
  uploaded_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_doc_student FOREIGN KEY (student_id)
    REFERENCES students(student_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- Indexes for common lookups
-- -----------------------------------------------------------------------------
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_students_matric ON students(matric_no);
CREATE INDEX idx_olevel_status ON olevel_verifications(verification_status);
CREATE INDEX idx_approval_clearance ON clearance_department_approvals(clearance_id, status);