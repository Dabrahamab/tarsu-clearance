'use strict';
/* Sprint 3/4 E2E: self-only verification, uploads, clearance stamps, search. */
const { boot, close, send } = require('./sprint2_e2e_e2e_helpers');

const results = [];
function check(name, ok, extra) {
  results.push({ name, ok: !!ok, extra });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  => ' + JSON.stringify(extra) : ''}`);
}

(async () => {
  const base = await boot();

  // register a fresh student with a unique matric
  const matric = `2026/${Math.floor(10000 + Math.random() * 89999)}/SP`;
  const email = `stu${Date.now()}@tarsu.edu.ng`;
  const reg = await send('POST', '/api/auth/register', {
    matricNo: matric, fullName: 'AISHA BAKO', email,
    departmentId: 1, password: 'Student123!', level: '400',
  });
  check('register student', reg.status === 201, { matric, status: reg.status });
  const studentToken = reg.json.token;

  // 1) verify own result — candidate name must equal the registered full name
  const examNumber = `42${Date.now().toString().slice(-6)}XA`;
  const verify = await send('POST', '/api/olevel/verify', {
    examBody: 'WAEC', examNumber, examYear: 2019, cardPinSerial: 'PIN-1234-5678',
  }, studentToken);
  check('verify returns VERIFIED', verify.status === 201 && verify.json.status === 'VERIFIED');
  check(
    'verify returns OWN name (AISHA BAKO)',
    verify.json.candidateName === 'AISHA BAKO',
    { candidateName: verify.json.candidateName }
  );

  const dup = await send('POST', '/api/olevel/verify', {
    examBody: 'WAEC', examNumber, examYear: 2019, cardPinSerial: 'PIN-1234-5678',
  }, studentToken);
  check('duplicate verify => 409', dup.status === 409, { status: dup.status });

  // 2) upload an O'Level document (multipart via global FormData/Blob)
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
  check('list own documents', docs.status === 200 && docs.json.documents.length === 1, {
    count: docs.json.documents.length,
  });

  // 3) clearance apply (auto-creates approval rows for all departments)
  const apply = await send('POST', '/api/clearance/apply', null, studentToken);
  check('apply clearance (STUDENT)', apply.status === 200, {
    overall_status: apply.json.clearance.overall_status,
    approvals: (apply.json.approvals || []).length,
  });
  const clearanceId = apply.json.clearance.clearance_id;
  const deptIds = (apply.json.approvals || []).map((a) => a.dept_id);
  check('approvals pre-created for all departments', deptIds.length >= 5, { deptCount: deptIds.length });

  const my = await send('GET', '/api/clearance/my', null, studentToken);
  check('my progress returns clearance', my.status === 200 && my.json.clearance.clearance_id === clearanceId, {
    status: my.json.clearance.overall_status,
  });

  // 4) officer login via seed account
  const offLogin = await send('POST', '/api/auth/login', { identifier: 'officer@tarsu.edu.ng', password: 'Officer123!' });
  check('officer login', offLogin.status === 200, { role: offLogin.json.user.role });
  const officerToken = offLogin.json.token;

  // 5) stamp every approval APPROVED → overall must become APPROVED
  let overallAfter = null;
  for (const deptId of deptIds) {
    const stamp = await send('PATCH', `/api/clearance/${clearanceId}/approvals/${deptId}`, {
      status: 'APPROVED', remarks: 'Docs verified OK',
    }, officerToken);
    overallAfter = stamp.json.clearance.overall_status;
  }
  check('all approved => clearance APPROVED', overallAfter === 'APPROVED', { overallAfter });

  // stamp one REJECTED on a new clearance to test REJECTED path
  const stu2 = await send('POST', '/api/auth/register', {
    matricNo: `2026/${Math.floor(10000 + Math.random() * 89999)}/CS`, fullName: 'ABDUL SALAM', email: `as${Date.now()}@tarsu.edu.ng`,
    departmentId: 1, password: 'Student123!', level: '300',
  });
  const apply2 = await send('POST', '/api/clearance/apply', null, stu2.json.token);
  const cid2 = apply2.json.clearance.clearance_id;
  const dept2 = apply2.json.approvals[0].dept_id;
  const reject = await send('PATCH', `/api/clearance/${cid2}/approvals/${dept2}`, { status: 'REJECTED', remarks: 'Missing document' }, officerToken);
  check('one rejected => overall not APPROVED', reject.json.clearance.overall_status !== 'APPROVED', {
    overall: reject.json.clearance.overall_status,
  });

  // 6) officer dashboard: all clearances + matric search
  const all = await send('GET', '/api/clearance/all', null, officerToken);
  check('officer list all clearances', all.status === 200 && all.json.clearances.length >= 2, { count: all.json.clearances.length });

  const search = await send('GET', `/api/admin/students/search?q=${encodeURIComponent(matric)}`, null, officerToken);
  check('matric search finds student', search.status === 200 && search.json.students.length === 1, {
    found: search.json.students.length,
    matric: search.json.students[0] && search.json.students[0].matric_no,
  });

  // 7) RBAC: student cannot touch officer endpoints
  const blockAll = await send('GET', '/api/clearance/all', null, studentToken);
  const blockSearch = await send('GET', '/api/admin/students/search?q=x', null, studentToken);
  check('student blocked from /clearance/all => 403', blockAll.status === 403, { status: blockAll.status });
  check('student blocked from /admin search => 403', blockSearch.status === 403, { status: blockSearch.status });

  await close();
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n== ${passed}/${results.length} passed ==`);
  process.exit(passed === results.length ? 0 : 1);
})().catch((err) => {
  console.error('E2E ERROR:', err.message);
  process.exit(1);
});