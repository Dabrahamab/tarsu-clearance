/**
 * Seed an OFFICER and an ADMIN account for demo/verification.
 * Usage:  node src/scripts/seedOfficers.js
 * Logins:
 *   officer@tarsu.edu.ng  / Officer123!   (OFFICER)
 *   admin@tarsu.edu.ng    / Admin123!     (ADMIN)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const bcrypt = require('bcryptjs');
const { initDatabase, queries } = require('../config/db');

async function upsertUser({ role, email, fullName, password }) {
  const existing = await queries.findUserByEmail(email);
  const passwordHash = await bcrypt.hash(password, 10);
  if (existing) {
    await queries.run(
      `UPDATE users SET role = ?, full_name = ?, password_hash = ? WHERE user_id = ?`,
      [role, fullName, passwordHash, existing.user_id]
    );
    console.log(`[seed] updated ${role}: ${email}`);
    return;
  }
  const inserted = await queries.createUser({ role, email, fullName, passwordHash, departmentId: null });
  console.log(`[seed] created ${role}: ${email} (user_id ${inserted.insertId})`);
}

initDatabase()
  .then(async () => {
    await upsertUser({ role: 'OFFICER', email: 'officer@tarsu.edu.ng', fullName: 'Clearance Officer', password: 'Officer123!' });
    await upsertUser({ role: 'ADMIN', email: 'admin@tarsu.edu.ng', fullName: 'System Administrator', password: 'Admin123!' });
    console.log('[seed] done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[seed] failed:', err.message);
    process.exit(1);
  });