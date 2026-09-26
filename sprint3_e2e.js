'use strict';
/* Sprint 3/4 E2E (redesigned): faculty+dept registration, manual O'Level entry,
 * unit-based clearance stamps, HOD scoping, admin catalog + O'Level admin CRUD. */
const path = require('path');
const os = require('os');
const bcrypt = require(path.resolve(__dirname, 'backend', 'node_modules', 'bcryptjs'));

// Run against an isolated throwaway DB so repeated runs never pollute dev data.
const DB_FILE = path.join(os.tmpdir(), `tsun-clearance-e2e-${process.pid}.sqlite`);
process.env.DB_FILE = DB_FILE;

const { boot, close, send } = require('./sprint2_e2e_e2e_helpers');

const results = [];
function check(name, ok, extra) {
  results.push({ name, ok: !!ok, extra });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  => ' + JSON.stringify(extra) : ''}`);
}

const SUBJECTS = [
  { subject: 'English Language', grade: 'A1' },
  { subject: 'Mathematics', grade: 'B2' },
  { subject: 'Physics', grade: 'C4' },
  { subject: 'Chemistry', grade: 'B3' },
  { subject: 'Biology', grade: 'C5' },
  { subject: 'Geography', grade: 'C6' },
];

async function seedStaff() {
  const { run, runSingle } = require(path.resolve(__dirname, 'backend', 'src', 'config', 'db'));
  const mk = (role, email, fullName, password, departmentId) => run(
    `INSERT OR IGNORE INTO users (role, email, full_name, password_hash, department_id)
     VALUES (?, ?, ?, ?, ?)`,
    [role, email, fullName, bcrypt.hashSync(password, 10), departmentId || null]
  );
  const cs = await runSingle(
    'SELECT * FROM departments WHERE LOWER(dept_name) = ?', ['computer science']
  );
  await mk('OFFICER', 'officer@tarsu.edu.ng', 'Clearance Officer', 'Officer123!', null);
  await mk('ADMIN', 'admin@tarsu.edu.ng', 'System Administrator', 'Admin123', null);
  await mk('HOD', 'hod@tarsu.edu.ng', 'Head of Department', 'Hod123!', cs ? cs.dept_id : null);
}

(async () => {
  const base = await boot();
  await seedStaff();

  // faculties endpoint exposes catalog
  const cats = await send('GET', '/api/faculties');
  check('faculties catalog 200', cats.status === 200, { f: cats.json.faculties?.length, d: cats.json.departments?.length });
  const cs = (cats.json.departments || []).find((d) => d.dept_name === 'Computer Science');
  check('Computer Science exists in catalog', !!cs, { cs });

  // register student in Computer Science (Faculty of Computing and Artificial Intelligence)
  const matric = `2026/${Math.floor(10000 + Math.random() * 89999)}/SP`;
  const email = `stu${Date.now()}@tarsu.edu.ng`;
  const reg = await send('POST', '/api/auth/register', {
    matricNo: matric, fullName: 'AISHA BAKO', email,
    facultyId: cs.faculty_id, departmentId: cs.dept_id, password: 'Student123!', level: '400',
  });
  check('register student (faculty+dept)', reg.status === 201, { matric, status: reg.status });
  const studentToken = reg.json.token;

  // 1) manual O'Level entry (6 subjects, series, PIN+serial)
  const examNumber = `42${Date.now().toString().slice(-6)}XA`;
  const verify = await send('POST', '/api/olevel/verify', {
    examBody: 'WAEC', examSeries: 'FIRST', examNumber, examYear: 2019,
    cardPin: 'PIN-1234-5678', cardSerial: 'SER-ABCD',
    subjects: SUBJECTS,
  }, studentToken);
  check('manual verify creates PENDING record', verify.status === 201 && verify.json.status === 'PENDING', {
    status: verify.json.status,
  });
  check('preview returns 6 subjects', (verify.json.preview?.subjects || []).length === 6, {
    n: verify.json.preview?.subjects?.length,
  });
  check('preview totals', verify.json.preview?.totalSubjects === 6 && verify.json.preview?.credits >= 5);

  // duplicate (same exam number) => 409
  const dup = await send('POST', '/api/olevel/verify', {
    examBody: 'WAEC', examSeries: 'FIRST', examNumber, examYear: 2019,
    cardPin: 'PIN-1234-5678', cardSerial: 'SER-ABCD', subjects: SUBJECTS,
  }, studentToken);
  check('duplicate verify => 409', dup.status === 409, { status: dup.status });

  // too few subjects => 400
  const tooFew = await send('POST', '/api/olevel/verify', {
    examBody: 'NECO', examSeries: 'SECOND', examNumber: `${examNumber}2`, examYear: 2019,
    cardPin: 'P', cardSerial: 'S', subjects: SUBJECTS.slice(0, 2),
  }, studentToken);
  check('too few subjects => 400', tooFew.status === 400, { status: tooFew.status, err: tooFew.json.error });

  // 2) upload an O'Level document
  const fd = new FormData();
  fd.append('file', new Blob(['mock o-level document bytes'], { type: 'application/pdf' }), 'olevel_waec.pdf');
  fd.append('docType', 'OLEVEL');
  const up = await fetch(`${base}/api/olevel/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: fd,
  });
  const upBody = await up.json();
  check('upload provides 201 + docId', up.status === 201 && upBody.docId > 0, upBody);
  const docs = await send('GET', '/api/olevel/documents', null, studentToken);
  check('list own documents', docs.status === 200 && docs.json.documents.length === 1);

  // 3) clearance apply (auto-creates 5 unit approval rows)
  const apply = await send('POST', '/api/clearance/apply', null, studentToken);
  check('apply clearance (STUDENT)', apply.status === 200, {
    overall_status: apply.json.clearance.overall_status,
    approvals: (apply.json.approvals || []).length,
  });
  const clearanceId = apply.json.clearance.clearance_id;
  const unitCodes = (apply.json.approvals || []).map((a) => a.unit_code);
  check('approvals pre-created for 5 units', unitCodes.length === 5, { unitCodes });
  check('unit order HOD → REGISTRY', ['HOD', 'LIBRARY', 'BURSARY', 'STUDENT_AFFAIRS', 'REGISTRY'].every((c, i) => unitCodes[i] === c), { unitCodes });

  const my = await send('GET', '/api/clearance/my', null, studentToken);
  check('my progress returns clearance', my.status === 200 && my.json.clearance.clearance_id === clearanceId);

  // 4) officer + HOD + admin logins (seed accounts)
  const offLogin = await send('POST', '/api/auth/login', { identifier: 'officer@tarsu.edu.ng', password: 'Officer123!' });
  check('officer login', offLogin.status === 200 && offLogin.json.user.role === 'OFFICER');
  const officerToken = offLogin.json.token;

  const hodLogin = await send('POST', '/api/auth/login', { identifier: 'hod@tarsu.edu.ng', password: 'Hod123!' });
  check('HOD login', hodLogin.status === 200 && hodLogin.json.user.role === 'HOD', { dept: hodLogin.json.user?.department_id });
  const hodToken = hodLogin.json.token;

  const adminLogin = await send('POST', '/api/auth/login', { identifier: 'admin@tarsu.edu.ng', password: 'Admin123' });
  check('admin login', adminLogin.status === 200 && adminLogin.json.user.role === 'ADMIN');
  const adminToken = adminLogin.json.token;

  const uid = (code) => (apply.json.approvals || []).find((a) => a.unit_code === code).unit_id;

  // 5) HOD scope: may stamp HOD unit of own dept; blocked for Library unit
  const hodBlock = await send('PATCH', `/api/clearance/${clearanceId}/approvals/${uid('LIBRARY')}`, { status: 'APPROVED' }, hodToken);
  check('HOD stamping Library => 403', hodBlock.status === 403, { status: hodBlock.status });
  const hodStamp = await send('PATCH', `/api/clearance/${clearanceId}/approvals/${uid('HOD')}`, { status: 'APPROVED' }, hodToken);
  check('HOD stamps own dept unit', hodStamp.status === 200 && hodStamp.json.clearance.approvals.find((a) => a.unit_code === 'HOD').status === 'APPROVED');

  // 6) officer stamps remaining units; BOOK_OVERDUE (library), then fix → APPROVED
  for (const code of ['LIBRARY', 'BURSARY', 'STUDENT_AFFAIRS', 'REGISTRY']) {
    await send('PATCH', `/api/clearance/${clearanceId}/approvals/${uid(code)}`, { status: 'APPROVED' }, officerToken);
  }
  const finalApproved = await send('GET', `/api/clearance/${clearanceId}`, null, officerToken);
  check('all units approved => clearance APPROVED', finalApproved.json.clearance.overall_status === 'APPROVED', {
    overall: finalApproved.json.clearance.overall_status,
  });

  // another clearance, mark Library BOOK_OVERDUE → not APPROVED until fixed
  const stu2 = await send('POST', '/api/auth/register', {
    matricNo: `2026/${Math.floor(10000 + Math.random() * 89999)}/CS`, fullName: 'ABDUL SALAM', email: `as${Date.now()}@tarsu.edu.ng`,
    facultyId: cs.faculty_id, departmentId: cs.dept_id, password: 'Student123!', level: '300',
  });
  const apply2 = await send('POST', '/api/clearance/apply', null, stu2.json.token);
  const cid2 = apply2.json.clearance.clearance_id;
  const u2 = (code) => apply2.json.approvals.find((a) => a.unit_code === code).unit_id;
  // pre-approve every unit except LIBRARY so the status tests isolate that unit
  for (const code of ['HOD', 'BURSARY', 'STUDENT_AFFAIRS', 'REGISTRY']) {
    await send('PATCH', `/api/clearance/${cid2}/approvals/${u2(code)}`, { status: 'APPROVED' }, officerToken);
  }
  const overdue = await send('PATCH', `/api/clearance/${cid2}/approvals/${u2('LIBRARY')}`, { status: 'BOOK_OVERDUE', remarks: 'Book overdue' }, officerToken);
  check('BOOK_OVERDUE accepted', overdue.status === 200 && overdue.json.clearance.overall_status !== 'APPROVED', {
    overall: overdue.json.clearance.overall_status,
  });
  const fixed = await send('PATCH', `/api/clearance/${cid2}/approvals/${u2('LIBRARY')}`, { status: 'APPROVED' }, officerToken);
  check('overall recomputed after fix', fixed.json.clearance.overall_status === 'APPROVED');

  // 7) admin can stamp too; REJECTED then resolved → APPROVED
  const reject = await send('PATCH', `/api/clearance/${cid2}/approvals/${u2('BURSARY')}`, { status: 'REJECTED', remarks: 'Missing document' }, adminToken);
  check('admin stamps BURSARY REJECTED', reject.status === 200 && reject.json.clearance.overall_status === 'REJECTED', {
    overall: reject.json.clearance.overall_status,
  });
  const rejectOverall = await send('PATCH', `/api/clearance/${cid2}/approvals/${u2('BURSARY')}`, { status: 'APPROVED', remarks: 'Resolved' }, adminToken);
  check('rejected clearance flips back to APPROVED', rejectOverall.json.clearance.overall_status === 'APPROVED', {
    overall: rejectOverall.json.clearance.overall_status,
  });

  // 8) officer/HOD dashboards
  const all = await send('GET', '/api/clearance/all', null, officerToken);
  check('officer list all clearances', all.status === 200 && all.json.clearances.length >= 2, { count: all.json.clearances.length });
  const allHod = await send('GET', '/api/clearance/all', null, hodToken);
  check('HOD list scoped to own dept', allHod.status === 200 && allHod.json.clearances.every((c) => Number(c.department_id) === Number(cs.dept_id)), {
    n: allHod.json.clearances.length,
  });

  const search = await send('GET', `/api/admin/students/search?q=${encodeURIComponent(matric)}`, null, officerToken);
  check('matric search finds student', search.status === 200 && search.json.students.length === 1);

  // 9) admin O'Level CRUD: reject then student re-uploads; student cannot edit
  const adminReject = await send('PATCH', `/api/olevel/verifications/${verify.json.verifyId}`, { status: 'REJECTED', remarks: 'name mismatch' }, adminToken);
  check('admin rejects verification', adminReject.status === 200 && adminReject.json.verification.verification_status === 'REJECTED', {
    status: adminReject.json.verification?.verification_status,
  });
  const stuCannotEdit = await send('PATCH', `/api/olevel/verifications/${verify.json.verifyId}`, { status: 'VERIFIED' }, studentToken);
  check('student cannot edit verification => 403', stuCannotEdit.status === 403, { status: stuCannotEdit.status });
  const reupload = await send('POST', '/api/olevel/verify', {
    examBody: 'WAEC', examSeries: 'FIRST', examNumber, examYear: 2019,
    cardPin: 'PIN-1234-5678', cardSerial: 'SER-ABCD', subjects: SUBJECTS,
  }, studentToken);
  check('re-upload after REJECTED becomes PENDING', reupload.status === 201 && reupload.json.status === 'PENDING', {
    status: reupload.json.status,
  });
  const adminDelete = await send('DELETE', `/api/olevel/verifications/${verify.json.verifyId}`, null, adminToken);
  check('admin deletes verification', adminDelete.status === 200 && adminDelete.json.deleted === true);
  const stuDelete = await send('DELETE', `/api/olevel/verifications/${verify.json.verifyId}`, null, studentToken);
  check('student cannot delete verifications => 403', stuDelete.status === 403, { status: stuDelete.status });

  // 10) admin catalog: register new department + clearance unit; student blocked
  const newDept = await send('POST', '/api/admin/catalog', { kind: 'department', facultyId: cs.faculty_id, departmentName: 'Cyber Security Lab' }, adminToken);
  check('admin registers new department', newDept.status === 201, { departmentId: newDept.json.departmentId });
  const newUnit = await send('POST', '/api/admin/catalog', { kind: 'unit', unitCode: 'SECURITY', unitName: 'Security Unit', sortOrder: 9 }, adminToken);
  check('admin registers new clearance unit', newUnit.status === 201, { unitId: newUnit.json.unitId });
  const stuBlock = await send('POST', '/api/admin/catalog', { kind: 'faculty', facultyName: 'X' }, studentToken);
  check('student blocked from admin catalog => 403', stuBlock.status === 403, { status: stuBlock.status });

  // 11) RBAC: student cannot touch staff endpoints
  const blockAll = await send('GET', '/api/clearance/all', null, studentToken);
  const blockSearch = await send('GET', '/api/admin/students/search?q=x', null, studentToken);
  check('student blocked from /clearance/all => 403', blockAll.status === 403, { status: blockAll.status });
  check('student blocked from /admin search => 403', blockSearch.status === 403, { status: blockSearch.status });

  // 12) admin manages HOD/officer accounts
  const staffList = await send('GET', '/api/admin/staff', null, adminToken);
  check('admin lists staff', staffList.status === 200 && staffList.json.staff.some((s) => s.role === 'OFFICER'), {
    n: staffList.json.staff?.length,
  });
  const staffEmail = `hod${Date.now()}@tarsu.edu.ng`;
  const mkStaff = await send('POST', '/api/admin/staff', {
    role: 'HOD', fullName: 'Occupied HOD', email: staffEmail, password: 'HodNew123!', departmentId: cs.dept_id,
  }, adminToken);
  check('admin creates new HOD', mkStaff.status === 201 && mkStaff.json.staff.role === 'HOD', {
    id: mkStaff.json.staff?.user_id,
  });
  const hodNoDept = await send('POST', '/api/admin/staff', {
    role: 'HOD', fullName: 'HOD No Dept', email: `nd${Date.now()}@tarsu.edu.ng`, password: 'HodNew123!',
  }, adminToken);
  check('HOD without department => 400', hodNoDept.status === 400, { status: hodNoDept.status });
  const newHodLogin = await send('POST', '/api/auth/login', { identifier: staffEmail, password: 'HodNew123!' });
  check('new HOD can log in', newHodLogin.status === 200 && newHodLogin.json.user.role === 'HOD', {
    dept: newHodLogin.json.user?.department_id,
  });
  const staffId = mkStaff.json.staff.user_id;
  const reset = await send('PATCH', `/api/admin/staff/${staffId}/password`, { password: 'Changed123!' }, adminToken);
  check('admin resets HOD password', reset.status === 200, { status: reset.status });
  const oldPw = await send('POST', '/api/auth/login', { identifier: staffEmail, password: 'HodNew123!' });
  const newPw = await send('POST', '/api/auth/login', { identifier: staffEmail, password: 'Changed123!' });
  check('old password rejected, new password accepted', oldPw.status === 401 && newPw.status === 200, {
    old: oldPw.status, new: newPw.status,
  });
  const officerBlocked = await send('POST', '/api/admin/staff', {
    role: 'HOD', fullName: 'X', email: `x${Date.now()}@tarsu.edu.ng`, password: 'HodNew123!',
  }, officerToken);
  check('officer blocked from staff admin => 403', officerBlocked.status === 403, { status: officerBlocked.status });
  const studentStaffBlock = await send('GET', '/api/admin/staff', null, studentToken);
  check('student blocked from /admin/staff => 403', studentStaffBlock.status === 403, { status: studentStaffBlock.status });

  // 13) admin resetting a student password
  const studentUserId = reg.json.user.user_id;
  const resetStu = await send('PATCH', `/api/admin/students/${studentUserId}/password`, { password: 'NewStu4567!' }, adminToken);
  check('admin resets student password', resetStu.status === 200 && resetStu.json.student?.student_id === studentUserId, {
    status: resetStu.status, sid: resetStu.json.student?.student_id,
  });
  const oldStu = await send('POST', '/api/auth/login', { identifier: matric, password: 'Student123!' });
  const newStu = await send('POST', '/api/auth/login', { identifier: matric, password: 'NewStu4567!' });
  check('student old pw rejected, new pw accepted', oldStu.status === 401 && newStu.status === 200, {
    old: oldStu.status, new: newStu.status,
  });
  const shortStu = await send('PATCH', `/api/admin/students/${studentUserId}/password`, { password: 'short' }, adminToken);
  check('student reset short password => 400', shortStu.status === 400, { status: shortStu.status });
  const officerStuReset = await send('PATCH', `/api/admin/students/${studentUserId}/password`, { password: 'NewStu4567!' }, officerToken);
  check('officer blocked from student reset => 403', officerStuReset.status === 403, { status: officerStuReset.status });
  const bogusStu = await send('PATCH', '/api/admin/students/999999999/password', { password: 'NewStu4567!' }, adminToken);
  check('student reset unknown id => 404', bogusStu.status === 404, { status: bogusStu.status });

  await close();
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n== ${passed}/${results.length} passed ==`);
  process.exit(passed === results.length ? 0 : 1);
})().catch((err) => {
  console.error('E2E ERROR:', err.message);
  process.exit(1);
});