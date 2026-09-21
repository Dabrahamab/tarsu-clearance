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
-- NOTE: passwords below are bcrypt hashes of the literal value "Password123!"

-- Admin account
INSERT INTO users (role, email, full_name, password_hash, department_id)
VALUES ('ADMIN', 'admin@tsuniversity.edu.ng', 'System Administrator',
        '$2b$10$Cw3u2KpU2sH0k0z9B8qIeO0m3vK7s1dY6lQaJgXbWnTfEoR4uImC.',
        5);

-- A clearance officer per clearing unit (Officer123! is the plain password)
INSERT INTO users (role, email, full_name, password_hash, department_id)
VALUES
  ('OFFICER', 'library.officer@tsuniversity.edu.ng',   'Library Officer',
   '$2b$10$Cw3u2KpU2sH0k0z9B8qIeO0m3vK7s1dY6lQaJgXbWnTfEoR4uImC.', 2),
  ('OFFICER', 'bursary.officer@tsuniversity.edu.ng',   'Bursary Officer',
   '$2b$10$Cw3u2KpU2sH0k0z9B8qIeO0m3vK7s1dY6lQaJgXbWnTfEoR4uImC.', 3),
  ('OFFICER', 'affairs.officer@tsuniversity.edu.ng',   'Student Affairs Officer',
   '$2b$10$Cw3u2KpU2sH0k0z9B8qIeO0m3vK7s1dY6lQaJgXbWnTfEoR4uImC.', 4),
  ('OFFICER', 'registry.officer@tsuniversity.edu.ng',  'Registry Officer',
   '$2b$10$Cw3u2KpU2sH0k0z9B8qIeO0m3vK7s1dY6lQaJgXbWnTfEoR4uImC.', 5);