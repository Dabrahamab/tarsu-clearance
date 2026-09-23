const { queries: q } = require('../config/db');

/**
 * Sprint 3/4 — Clearance workflow (blueprint §4-C, §4-D).
 *
 * A student's clearance is a row in clearance_requests plus one approval row
 * per clearance unit (HOD → Library → Bursary → Student Affairs → Registry).
 * Units are seeded in db.js; every new clearance pre-creates PENDING approval
 * rows for ALL units. Officers/admins stamp each unit; the HOD stamps only the
 * HOD unit for their own department. Overall flips to APPROVED when every unit
 * is APPROVED.
 */

const STAFF_ROLES = ['OFFICER', 'HOD', 'ADMIN'];
const NON_APPROVED = ['PENDING', 'REJECTED', 'ACTION_REQUIRED', 'BOOK_OVERDUE'];

// ---------------------------------------------------------------------------
// POST /api/clearance/apply          (STUDENT — start/enter clearance)
// GET  /api/clearance/my             (STUDENT — own progress incl. approvals)
// ---------------------------------------------------------------------------
async function ensureClearanceFor(studentId) {
  let clearance = await q.findClearanceByStudent(studentId);
  if (!clearance) {
    const ref = `TSU-CLR-${String(studentId).padStart(5, '0')}`;
    const submittedAt = new Date().toISOString().slice(0, 10);
    const student = await q.findStudentByIdWithDept(studentId);
    const inserted = await q.createClearanceRequest({
      studentId,
      departmentId: student ? student.department_id : null,
      submittedAt,
      clearanceRef: ref,
    });
    clearance = await q.findClearanceByStudent(studentId);
    clearance = clearance || { clearance_id: inserted.insertId, clearance_ref: ref };
  }
  const units = await q.listClearanceUnits();
  await q.ensureApprovalRows(clearance.clearance_id, units.map((u) => u.unit_id));
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
// GET /api/clearance/all             (OFFICER/HOD/ADMIN — dashboard list)
// ---------------------------------------------------------------------------
async function listAllClearances(req, res, next) {
  try {
    let rows;
    if (req.user.role === 'HOD') {
      // HOD sees only students in their own department (HOD unit rows).
      const approvals = await q.listApprovalsForHOD(req.user.department_id);
      const clearanceIds = [...new Set(approvals.map((a) => a.clearance_id))];
      const list = await q.listClearances();
      rows = list.filter((c) => clearanceIds.includes(c.clearance_id));
    } else {
      rows = await q.listClearances();
    }
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
// GET /api/clearance/:clearanceId    (staff — detail incl approvals)
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
// PATCH /api/clearance/:clearanceId/approvals/:unitId  (staff — stamp)
// HOD may only stamp the HOD unit of their own department.
// ---------------------------------------------------------------------------
async function stampApproval(req, res, next) {
  try {
    const clearanceId = req.params.clearanceId;
    const unitId = Number(req.params.unitId);
    const { status, remarks } = req.body || {};
    const allowedStatuses = ['APPROVED', 'REJECTED', 'ACTION_REQUIRED', 'BOOK_OVERDUE'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: 'status must be one of APPROVED, REJECTED, ACTION_REQUIRED, BOOK_OVERDUE.',
      });
    }
    const clearance = await q.findClearanceById(clearanceId);
    if (!clearance) return res.status(404).json({ error: 'Clearance not found.' });

    const units = await q.listClearanceUnits();
    const unit = units.find((u) => u.unit_id === unitId);
    if (!unit) return res.status(404).json({ error: 'Clearance unit not found.' });

    // HOD restriction: own department + HOD unit only.
    if (req.user.role === 'HOD') {
      if (unit.unit_code !== 'HOD') {
        return res.status(403).json({ error: 'HOD may only stamp the departmental (HOD) clearance.' });
      }
      if (Number(clearance.department_id) !== Number(req.user.department_id)) {
        return res.status(403).json({ error: 'You may only process students in your own department.' });
      }
    }

    await q.updateApprovalStatus(clearanceId, unitId, {
      status,
      remarks: remarks || null,
      approvedByUserId: req.user.user_id,
    });

    // Recompute overall status.
    const approvals = await q.listApprovalsByClearance(clearanceId);
    const notApproved = approvals.some((a) => NON_APPROVED.includes(a.status));
    const rejected = approvals.some((a) => a.status === 'REJECTED');
    let overall = notApproved ? (rejected ? 'REJECTED' : 'IN_PROGRESS') : 'APPROVED';
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
// GET /api/admin/students?q=...      (OFFICER/HOD/ADMIN — matric / name search)
// ---------------------------------------------------------------------------
async function searchStudents(req, res, next) {
  try {
    const term = String(req.query.q || '').trim();
    if (!term) return res.json({ students: [] });
    let rows;
    if (req.user.role === 'HOD') {
      rows = (await q.searchStudentsByMatric(term)).filter(
        (s) => Number(s.department_id) === Number(req.user.department_id)
      );
    } else {
      rows = await q.searchStudentsByMatric(term);
    }
    res.json({ students: rows });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Admin: register a new clearance unit, faculty or department.
// ---------------------------------------------------------------------------
async function createAdminCatalog(req, res, next) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only the admin may manage the department catalog.' });
    }
    const { kind } = req.body || {};
    let created;
    if (kind === 'faculty') {
      const name = String((req.body.facultyName || '').trim());
      if (!name) return res.status(400).json({ error: 'facultyName is required.' });
      created = await q.createFaculty(name);
      return res.status(201).json({ facultyId: created.insertId, facultyName: name });
    }
    if (kind === 'department') {
      const facultyId = Number(req.body.facultyId);
      const name = String((req.body.departmentName || '').trim());
      if (!facultyId || !name) {
        return res.status(400).json({ error: 'facultyId and departmentName are required.' });
      }
      const faculty = await q.findFacultyById(facultyId);
      if (!faculty) return res.status(400).json({ error: 'Invalid facultyId.' });
      created = await q.createDepartment(facultyId, name);
      return res.status(201).json({ departmentId: created.insertId, departmentName: name, facultyId });
    }
    if (kind === 'unit') {
      const code = String((req.body.unitCode || '').trim()).toUpperCase();
      const name = String((req.body.unitName || '').trim());
      const sort = Number(req.body.sortOrder || 0);
      if (!code || !name) return res.status(400).json({ error: 'unitCode and unitName are required.' });
      created = await q.createClearanceUnit(code, name, sort);
      return res.status(201).json({ unitId: created.insertId, unitCode: code, unitName: name });
    }
    return res.status(400).json({ error: 'kind must be faculty, department or unit.' });
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
  createAdminCatalog,
  ensureClearanceFor,
};