const { queries: q } = require('../config/db');

/**
 * Sprint 3/4 — Clearance workflow (blueprint §4-C, §4-D).
 *
 * A student's clearance is a row in clearance_requests plus one approval row
 * per department/office. Departments are seeded in app.js; every new clearance
 * pre-creates PENDING approval rows for ALL departments. Officers (or admins)
 * stamp each approval APPROVED/REJECTED with optional remarks; when every
 * approval is APPROVED the overall clearance flips to APPROVED.
 */

// ---------------------------------------------------------------------------
// POST /api/clearance/apply          (STUDENT — start/enter clearance)
// GET  /api/clearance/my             (STUDENT — own progress incl. approvals)
// ---------------------------------------------------------------------------
async function ensureClearanceFor(studentId) {
  let clearance = await q.findClearanceByStudent(studentId);
  if (!clearance) {
    const ref = `TSU-CLR-${String(studentId).padStart(5, '0')}`;
    const submittedAt = new Date().toISOString().slice(0, 10);
    const inserted = await q.createClearanceRequest({ studentId, submittedAt, clearanceRef: ref });
    clearance = await q.findClearanceByStudent(studentId);
    clearance = clearance || { clearance_id: inserted.insertId, clearance_ref: ref };
  }
  const depts = await q.listDepartments();
  await q.ensureApprovalRows(clearance.clearance_id, depts.map((d) => d.dept_id));
  return clearance;
}

async function applyClearance(req, res, next) {
  try {
    const clearance = await ensureClearanceFor(req.user.user_id);
    const approvals = await q.listApprovalsByClearance(clearance.clearance_id);
    const olevel = await q.listOlevelByStudent(req.user.user_id);
    const documents = await q.listDocumentsByStudent(req.user.user_id);
    const student = await q.findStudentByIdWithDept(req.user.user_id);
    res.json({
      clearance: { ...clearance, overall_status: clearance.overall_status || 'IN_PROGRESS' },
      approvals,
      olevel,
      documents,
      student,
    });
  } catch (err) {
    next(err);
  }
}

async function myProgress(req, res, next) {
  try {
    const clearance = await q.findClearanceByStudent(req.user.user_id);
    if (!clearance) {
      return res.status(404).json({ error: 'No clearance request found. Apply first.' });
    }
    const approvals = await q.listApprovalsByClearance(clearance.clearance_id);
    const olevel = await q.listOlevelByStudent(req.user.user_id);
    const documents = await q.listDocumentsByStudent(req.user.user_id);
    const student = await q.findStudentByIdWithDept(req.user.user_id);
    res.json({ clearance, approvals, olevel, documents, student });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/clearance/all             (OFFICER/ADMIN — dashboard list)
// ---------------------------------------------------------------------------
async function listAllClearances(req, res, next) {
  try {
    const rows = await q.listClearances();
    const result = [];
    for (const row of rows) {
      const approvals = await q.listApprovalsByClearance(row.clearance_id);
      result.push({ ...row, approvals });
    }
    res.json({ clearances: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/clearance/:clearanceId    (OFFICER/ADMIN — detail incl approvals)
// ---------------------------------------------------------------------------
async function getClearanceDetail(req, res, next) {
  try {
    const clearance = await q.findClearanceById(req.params.clearanceId);
    if (!clearance) return res.status(404).json({ error: 'Clearance not found.' });
    const approvals = await q.listApprovalsByClearance(clearance.clearance_id);
    const olevel = await q.listOlevelByStudent(clearance.student_id);
    const documents = await q.listDocumentsByStudent(clearance.student_id);
    res.json({ clearance: { ...clearance, approvals }, olevel, documents });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/clearance/:clearanceId/approvals/:deptId  (OFFICER/ADMIN — stamp)
// ---------------------------------------------------------------------------
async function stampApproval(req, res, next) {
  try {
    const clearanceId = req.params.clearanceId;
    const deptId = req.params.deptId;
    const { status, remarks } = req.body || {};
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'status must be APPROVED or REJECTED.' });
    }
    const clearance = await q.findClearanceById(clearanceId);
    if (!clearance) return res.status(404).json({ error: 'Clearance not found.' });

    await q.updateApprovalStatus(clearanceId, deptId, {
      status,
      remarks: remarks || null,
      approvedByUserId: req.user.user_id,
    });

    // Recompute overall status.
    const approvals = await q.listApprovalsByClearance(clearanceId);
    const pending = approvals.some((a) => a.status === 'PENDING');
    const rejected = approvals.some((a) => a.status === 'REJECTED');
    let overall = 'IN_PROGRESS';
    if (!pending) {
      overall = rejected ? 'REJECTED' : 'APPROVED';
    }
    const completedAt = overall === 'APPROVED' ? new Date().toISOString().slice(0, 10) : null;
    await q.updateClearanceStatus(clearanceId, { overallStatus: overall, completedAt });

    const updated = await q.findClearanceById(clearanceId);
    const updatedApprovals = await q.listApprovalsByClearance(clearanceId);
    res.json({ clearance: { ...updated, approvals: updatedApprovals } });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/admin/students?q=...      (OFFICER/ADMIN — matric / name search)
// ---------------------------------------------------------------------------
async function searchStudents(req, res, next) {
  try {
    const term = String(req.query.q || '').trim();
    if (!term) return res.json({ students: [] });
    const rows = await q.searchStudentsByMatric(term);
    res.json({ students: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  applyClearance,
  myProgress,
  listAllClearances,
  getClearanceDetail,
  stampApproval,
  searchStudents,
  ensureClearanceFor,
};