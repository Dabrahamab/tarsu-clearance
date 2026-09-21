'use strict';
const { boot, close, send } = require('./sprint2_e2e_e2e_helpers');
const bcrypt = require('./backend/node_modules/bcryptjs');
const { queries } = require('./backend/src/config/db');

async function createOfficer(email) {
  const existing = await queries.findUserByEmail(email);
  if (existing) return existing.user_id;
  const userId = await queries.createUser({
    role: 'OFFICER',
    email,
    fullName: 'Test Officer',
    passwordHash: await bcrypt.hash('Passw0rd123!', 10),
    departmentId: 2,
  });
  return userId.insertId || userId;
}

(async () => {
  await boot();
  const suf = Date.now().toString().slice(-6);
  const email = 'stu' + suf + '@u.edu.ng';

  const health = await send('GET', '/api/health');
  console.log('health:', health.status);

  const r1 = await send('POST', '/api/auth/register', {
    fullName: 'Test Student', matricNo: 'STU/' + suf, email,
    departmentId: 1, password: 'Passw0rd123!', level: '300',
  });
  console.log('register:', r1.status);

  const login = await send('POST', '/api/auth/login', {
    identifier: email, password: 'Passw0rd123!',
  });
  const token = login.json.token;
  console.log('login:', login.status, 'token?', !!token);

  const v = await send('POST', '/api/olevel/verify', {
    examBody: 'WAEC', examNumber: '4' + suf + '01', examYear: 2019,
    cardPinSerial: '1234-5678-9012',
  }, token);
  console.log('verify:', v.status);
  console.log('  status:', v.json.status, '| candidate:', v.json.candidateName);
  console.log('  subjects:', Array.isArray(v.json.subjects) ? v.json.subjects.length : 'n/a');

  const vid = v.json.verifyId;
  console.log('  verifyId:', vid);

  const my = await send('GET', '/api/olevel/my', null, token);
  console.log('my:', my.status, 'rows:', my.json.verifications ? my.json.verifications.length : 'n/a');

  // ---- officer path via direct OFFICER row ----
  const oemail = 'off' + suf + '@u.edu.ng';
  await createOfficer(oemail);
  const ologin = await send('POST', '/api/auth/login', { identifier: oemail, password: 'Passw0rd123!' });
  const otoken = ologin.json.token;
  console.log('officer login:', ologin.status, 'token?', !!otoken);

  const confirm = await send('PATCH', '/api/olevel/verifications/' + vid + '/confirm', { status: 'VERIFIED' }, otoken);
  console.log('officer confirm:', confirm.status, JSON.stringify(confirm.json).slice(0, 120));

  const allV = await send('GET', '/api/olevel/verifications', null, otoken);
  console.log('officer list-all:', allV.status, 'rows:', allV.json.verifications ? allV.json.verifications.length : 'n/a');

  const rbac = await send('GET', '/api/olevel/verifications', null, token);
  console.log('student lists-all (expect 403):', rbac.status);

  const stuConfirm = await send('PATCH', '/api/olevel/verifications/' + vid + '/confirm', { status: 'REJECTED' }, token);
  console.log('student confirm (expect 403):', stuConfirm.status);

  await close();
  process.exit(0);
})().catch((e) => { console.error('E2E ERROR:', e); process.exit(1); });