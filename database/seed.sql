-- =============================================================================
-- Seed data for student_clearance
-- Departments (in workflow order) + default admin/officer accounts
-- =============================================================================
USE student_clearance;

INSERT INTO departments (dept_name, dept_type, sort_order) VALUES
  ('Computer Science Department', 'DEPARTMENT',       1),
  ('University Library',          'LIBRARY',          2),
  ('Bursary & Finance',           'BURSARY',          3),
  ('Student Affairs Division',    'STUDENT_AFFAIRS',  4),
  ('Registry / Senate',           'REGISTRY',         5);
-- NOTE: hashes generated via bcryptjs (10 rounds) - validated
--   Password123! -> $2a$10$LLbqSo7Dnf/CmdG23Ec4e.yDIN.HXWLcQjQdCPCgJr/SZfdlF5vm2
--   Officer123!  -> $2a$10$YOuZeIkE8u9RTQc7sd0qlOtNCDxjOh/ChP/8HcgeljtYYWc7kD.g.

-- Admin account (password: Password123!)
INSERT INTO users (role, email, full_name, password_hash, department_id)
VALUES ('ADMIN', 'admin@tsuniversity.edu.ng', 'System Administrator',
        '$2a$10$LLbqSo7Dnf/CmdG23Ec4e.yDIN.HXWLcQjQdCPCgJr/SZfdlF5vm2',
        5);

-- A clearance officer per clearing unit (password: Officer123!)
INSERT INTO users (role, email, full_name, password_hash, department_id)
VALUES
  ('OFFICER', 'library.officer@tsuniversity.edu.ng',   'Library Officer',
   '$2a$10$YOuZeIkE8u9RTQc7sd0qlOtNCDxjOh/ChP/8HcgeljtYYWc7kD.g.', 2),
  ('OFFICER', 'bursary.officer@tsuniversity.edu.ng',   'Bursary Officer',
   '$2a$10$YOuZeIkE8u9RTQc7sd0qlOtNCDxjOh/ChP/8HcgeljtYYWc7kD.g.', 3),
  ('OFFICER', 'affairs.officer@tsuniversity.edu.ng',   'Student Affairs Officer',
   '$2a$10$YOuZeIkE8u9RTQc7sd0qlOtNCDxjOh/ChP/8HcgeljtYYWc7kD.g.', 4),
  ('OFFICER', 'registry.officer@tsuniversity.edu.ng',  'Registry Officer',
   '$2a$10$YOuZeIkE8u9RTQc7sd0qlOtNCDxjOh/ChP/8HcgeljtYYWc7kD.g.', 5);