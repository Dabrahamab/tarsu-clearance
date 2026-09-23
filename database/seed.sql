-- =============================================================================
-- Seed data for student_clearance
-- 12 faculties + 102 departments (catalog, deduplicated) + 5 clearance units
-- + staff accounts.
-- Canonical catalog source: backend/src/config/faculties.js
-- =============================================================================
USE student_clearance;

-- -----------------------------------------------------------------------------
-- Faculties
-- -----------------------------------------------------------------------------
INSERT INTO faculties (faculty_id, faculty_name, sort_order) VALUES
  (1, 'Faculty of Arts & Humanities', 1),
  (2, 'Faculty of Social Sciences', 2),
  (3, 'Faculty of Management Sciences', 3),
  (4, 'Faculty of Sciences', 4),
  (5, 'Faculty of Engineering', 5),
  (6, 'Faculty of Education', 6),
  (7, 'Faculty of Law', 7),
  (8, 'Faculty of Health Sciences', 8),
  (9, 'Faculty of Agriculture', 9),
  (10, 'Faculty of Environmental Sciences', 10),
  (11, 'Faculty of Communication & Media', 11),
  (12, 'Faculty of Computing and Artificial Intelligence', 12)
ON DUPLICATE KEY UPDATE faculty_name = VALUES(faculty_name);

-- -----------------------------------------------------------------------------
-- Departments (each dept belongs to exactly one faculty; dept_name is unique)
-- -----------------------------------------------------------------------------
INSERT INTO departments (dept_name, faculty_id, sort_order) VALUES
  ('English Language', 1, 1), ('Literature in English', 1, 2),
  ('History & International Studies', 1, 3), ('Religious Studies', 1, 4),
  ('Philosophy', 1, 5), ('Linguistics', 1, 6),
  ('Theatre & Performing Arts', 1, 7), ('Music', 1, 8), ('Foreign Languages', 1, 9),
  ('Economics', 2, 1), ('Political Science', 2, 2), ('Sociology', 2, 3),
  ('Psychology', 2, 4), ('Criminology & Security Studies', 2, 5),
  ('Social Work', 2, 6), ('Geography & Environmental Management', 2, 7),
  ('Public Administration', 2, 8),
  ('Accounting', 3, 1), ('Banking & Finance', 3, 2), ('Business Administration', 3, 3),
  ('Marketing', 3, 4), ('Entrepreneurship', 3, 5), ('Insurance', 3, 6),
  ('Actuarial Science', 3, 7), ('Human Resource Management', 3, 8),
  ('Mathematics', 4, 1), ('Statistics', 4, 2), ('Physics', 4, 3), ('Chemistry', 4, 4),
  ('Biology', 4, 5), ('Microbiology', 4, 6), ('Biochemistry', 4, 7),
  ('Geology', 4, 8), ('Environmental Science', 4, 9),
  ('Civil Engineering', 5, 1), ('Mechanical Engineering', 5, 2),
  ('Electrical/Electronics Engineering', 5, 3), ('Chemical Engineering', 5, 4),
  ('Petroleum Engineering', 5, 5), ('Mechatronics Engineering', 5, 6),
  ('Agricultural Engineering', 5, 7), ('Biomedical Engineering', 5, 8),
  ('Environmental Engineering', 5, 9),
  ('Education & English', 6, 1), ('Education & Biology', 6, 2),
  ('Education & Chemistry', 6, 3), ('Education & Mathematics', 6, 4),
  ('Education & Physics', 6, 5), ('Educational Management', 6, 6),
  ('Guidance & Counselling', 6, 7), ('Early Childhood Education', 6, 8),
  ('Primary Education', 6, 9), ('Special Education', 6, 10),
  ('Adult Education', 6, 11), ('Physical & Health Education', 6, 12),
  ('Vocational & Technical Education', 6, 13),
  ('Law (LL.B)', 7, 1), ('Legal Studies', 7, 2),
  ('International/Comparative Law', 7, 3), ('Commercial Law', 7, 4),
  ('Public/Constitutional Law', 7, 5),
  ('Medicine & Surgery', 8, 1), ('Nursing Science', 8, 2),
  ('Medical Laboratory Science', 8, 3), ('Public Health', 8, 4),
  ('Physiotherapy', 8, 5), ('Radiography', 8, 6), ('Human Anatomy', 8, 7),
  ('Human Physiology', 8, 8), ('Pharmacy', 8, 9), ('Dentistry', 8, 10),
  ('Nutrition & Dietetics', 8, 11),
  ('Agricultural Economics', 9, 1), ('Agricultural Extension', 9, 2),
  ('Animal Science', 9, 3), ('Crop Science', 9, 4), ('Soil Science', 9, 5),
  ('Fisheries & Aquaculture', 9, 6), ('Forestry & Wildlife Management', 9, 7),
  ('Agricultural Science', 9, 8),
  ('Architecture', 10, 1), ('Quantity Surveying', 10, 2),
  ('Estate Management', 10, 3), ('Urban & Regional Planning', 10, 4),
  ('Building Technology', 10, 5), ('Surveying & Geoinformatics', 10, 6),
  ('Environmental Management', 10, 7),
  ('Mass Communication', 11, 1), ('Journalism', 11, 2),
  ('Public Relations', 11, 3), ('Advertising', 11, 4),
  ('Broadcasting', 11, 5), ('Film & Multimedia Studies', 11, 6),
  ('Digital Media', 11, 7),
  ('Computer Science', 12, 1), ('Information Technology', 12, 2),
  ('Software Engineering', 12, 3), ('Cybersecurity', 12, 4),
  ('Data Science', 12, 5), ('Artificial Intelligence', 12, 6),
  ('Information Systems', 12, 7), ('Computer Engineering', 12, 8)
ON DUPLICATE KEY UPDATE faculty_id = VALUES(faculty_id), sort_order = VALUES(sort_order);

-- -----------------------------------------------------------------------------
-- Clearance units (workflow order; the HOD unit maps to a department)
-- -----------------------------------------------------------------------------
INSERT INTO clearance_units (unit_code, unit_name, sort_order) VALUES
  ('HOD', 'Head of Department', 1),
  ('LIBRARY', 'University Library', 2),
  ('BURSARY', 'Bursary & Finance', 3),
  ('STUDENT_AFFAIRS', 'Student Affairs Division', 4),
  ('REGISTRY', 'Registry / Senate', 5)
ON DUPLICATE KEY UPDATE unit_name = VALUES(unit_name);

-- -----------------------------------------------------------------------------
-- Staff accounts.
-- NOTE: real production seeding is done by backend/src/scripts/seedOfficers.js
-- (bcryptjs 10 rounds). Hashes below mirror that seeder.
--   Admin123    -> $2a$10$Xr88q2c093eZxZMVOUO7MumQVj97QHzRUMk5M0v4JuDUGv8/rsDGu
--   Officer123! -> $2a$10$nnnQhEwTcOrMaQFOnUeelumfMmjZ/.H5XRiwEs5JbE.g81sUnXihC
--   Hod123!     -> $2a$10$vHHc7eniJZmDJ/Ew4WuTUu.O.1rvXKgk2PXxI9Og3E07mXiIe1nnC
-- ADMIN (password: Admin123)
INSERT INTO users (role, email, full_name, password_hash, department_id)
VALUES ('ADMIN', 'admin@tasuv.edu.ng', 'System Administrator',
        '$2a$10$Xr88q2c093eZxZMVOUO7MumQVj97QHzRUMk5M0v4JuDUGv8/rsDGu',
        NULL)
ON DUPLICATE KEY UPDATE role = 'ADMIN';