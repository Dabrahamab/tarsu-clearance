/**
 * Seed / sync the faculty + department catalog from the canonical source
 * (backend/src/config/faculties.js) into the current database.
 *
 * Idempotent: faculties are created if missing; each department is (re)assigned
 * to its canonical faculty by name. Departments are never silently dropped.
 *
 * Usage:  npm run seed   (or: node src/scripts/seedDepartments.js)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { FACULTIES, CLEARANCE_UNITS } = require('../config/faculties');
const { initDatabase, run, runSingle } = require('../config/db');

async function syncCatalog() {
  let faculties = 0;
  let created = 0;
  let reassigned = 0;

  for (const f of FACULTIES) {
    let fac = await runSingle('SELECT faculty_id FROM faculties WHERE faculty_name = ?', [f.name]);
    if (!fac) {
      await run('INSERT INTO faculties (faculty_name) VALUES (?)', [f.name]);
      fac = await runSingle('SELECT faculty_id FROM faculties WHERE faculty_name = ?', [f.name]);
      faculties += 1;
    }
    for (const dept of f.departments) {
      const row = await runSingle('SELECT dept_id, faculty_id FROM departments WHERE dept_name = ?', [dept]);
      if (row) {
        if (Number(row.faculty_id) !== Number(fac.faculty_id)) {
          await run('UPDATE departments SET faculty_id = ? WHERE dept_name = ?', [fac.faculty_id, dept]);
          reassigned += 1;
        }
      } else {
        await run('INSERT INTO departments (faculty_id, dept_name) VALUES (?, ?)', [fac.faculty_id, dept]);
        created += 1;
      }
    }
  }

  for (const u of CLEARANCE_UNITS) {
    const exists = await runSingle('SELECT unit_id FROM clearance_units WHERE unit_code = ?', [u.code]);
    if (exists) {
      await run('UPDATE clearance_units SET unit_name = ?, sort_order = ? WHERE unit_code = ?', [u.name, u.sort, u.code]);
    } else {
      await run('INSERT INTO clearance_units (unit_code, unit_name, sort_order) VALUES (?, ?, ?)', [u.code, u.name, u.sort]);
    }
  }

  console.log(`[seed] faculties ensured: ${FACULTIES.length} (created ${faculties})`);
  console.log(`[seed] departments ensured: ${created} created, ${reassigned} reassigned, total ${FACULTIES.reduce((n, f) => n + f.departments.length, 0)}`);
  console.log(`[seed] clearance units ensured: ${CLEARANCE_UNITS.length}`);
}

initDatabase()
  .then(syncCatalog)
  .then(() => {
    console.log('[seed] done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[seed] failed:', err.message);
    process.exit(1);
  });