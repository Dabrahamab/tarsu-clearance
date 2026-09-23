/**
 * Seed an OFFICER, an ADMIN and a sample HOD account for demo/verification.
 * Usage:  node src/scripts/seedOfficers.js
 * Logins:
 *   officer@tarsu.edu.ng  / Officer123!   (OFFICER)
 *   admin@tarsu.edu.ng    / Admin123      (ADMIN)
 *   hod@tarsu.edu.ng      / Hod123!       (HOD — Computer Science dept)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const bcrypt = require('bcryptjs');
const { initDatabase, run, runSingle, queries } = require('../config/db');

async function upsertUser({ role, email, fullName, password, departmentId }) {
  const existing = await queries.findUserByEmail(email);
  const passwordHash = await bcrypt.hash(password, 10);
  if (existing) {
    await run(
      `UPDATE users SET role = ?, full_name = ?, password_hash = ?, department_id = ? WHERE user_id = ?`,
      [role, fullName, passwordHash, departmentId || null, existing.user_id]
    );
    console.log(`[seed] updated ${role}: ${email}`);
    return;
  }
  const inserted = await queries.createUser({ role, email, fullName, passwordHash, departmentId: departmentId || null });
  console.log(`[seed] created ${role}: ${email} (user_id ${inserted.insertId})`);
}

initDatabase()
  .then(async () => {
    await upsertUser({ role: 'OFFICER', email: 'officer@tarsu.edu.ng', fullName: 'Clearance Officer', password: 'Officer123!', departmentId: null });
    await upsertUser({ role: 'ADMIN', email: 'admin@tarsu.edu.ng', fullName: 'System Administrator', password: 'Admin123', departmentId: null });
    // HOD linked to Computer Science (Faculty of Computing and Artificial Intelligence)
    // so they see their own dept.
    const cs = await runSingle('SELECT * FROM departments WHERE LOWER(dept_name) = ?', ['computer science']);
    if (!cs) {
      console.log('[seed] WARNING: no department id 1 for HOD (depts are auto-seeded by faculty catalog).');
    }
    await upsertUser({
      role: 'HOD',
      email: 'hod@tarsu.edu.ng',
      fullName: 'Head of Department',
      password: 'Hod123!',
      departmentId: cs ? cs.dept_id : null,
    });
    console.log('[seed] done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[seed] failed:', err.message);
    process.exit(1);
  });