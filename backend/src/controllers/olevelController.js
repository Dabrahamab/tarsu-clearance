const { queries: q } = require('../config/db');
const {
  EXAM_BODIES,
  validateCredential,
} = require('../services/olevelVerifier');

const GRADES = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'];

/**
 * Manual O'Level entry (blueprint §4-B, manual mode).
 *
 * STUDENT types their result: exam body (WAEC/NECO/NABTEB), series
 * (FIRST/SECOND), exam number, exam year, card PIN, card serial and the
 * subjects with grades (min 6, max 9). A preview payload is built and
 * stored with the record. Only ADMIN may edit or delete a submitted record;
 * a REJECTED record can be re-uploaded by the student (status resets to
 * PENDING).
 */

function validateSubjects(subjects) {
  if (!Array.isArray(subjects)) {
    return { error: 'subjects must be an array of { subject, grade }.' };
  }
  if (subjects.length < 6 || subjects.length > 9) {
    return { error: 'A result must have between 6 and 9 subjects.' };
  }
  for (const s of subjects) {
    const name = String(s.subject || '').trim();
    const grade = String(s.grade || '').trim().toUpperCase();
    if (!name || name.length < 2) {
      return { error: 'Every subject needs a name.' };
    }
    if (!GRADES.includes(grade)) {
      return { error: `Invalid grade "${grade}". Must be A1-B9.` };
    }
  }
  return { normalized: subjects.map((s) => ({
    subject: String(s.subject).trim(),
    grade: String(s.grade).trim().toUpperCase(),
  })) };
}

function buildPreviewPayload({ examBody, examSeries, examNumber, examYear, cardPin, cardSerial, candidateName, subjects }) {
  const credits = subjects.filter((s) => GRADES.slice(0, 6).includes(s.grade)).length;
  return {
    examBody,
    examSeries,
    examNumber,
    examYear,
    cardPin,
    cardSerial,
    candidateName,
    subjects,
    totalSubjects: subjects.length,
    credits,
    provider: 'MANUAL_ENTRY',
    message: 'Result entered manually and awaiting confirmation.',
  };
}

// ---------------------------------------------------------------------------
// POST /api/olevel/verify        (STUDENT — manual entry upload)
// ---------------------------------------------------------------------------
async function submitVerification(req, res, next) {
  try {
    const studentId = req.user.user_id;
    const {
      examBody,
      examSeries,
      examNumber,
      examYear,
      cardPin,
      cardSerial,
      subjects,
    } = req.body || {};

    const check = validateCredential({
      examBody,
      examNumber,
      examYear,
    });
    if (!check.ok) return res.status(400).json({ error: check.error });

    const series = String(examSeries || 'FIRST').trim().toUpperCase();
    if (!['FIRST', 'SECOND'].includes(series)) {
      return res.status(400).json({ error: 'examSeries must be FIRST or SECOND.' });
    }

    const subjectCheck = validateSubjects(subjects);
    if (subjectCheck.error) return res.status(400).json({ error: subjectCheck.error });

    const pin = String(cardPin || '').replace(/\s+/g, '').toUpperCase();
    const serial = String(cardSerial || '').replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z0-9-]{6,20}$/.test(pin)) {
      return res.status(400).json({ error: 'cardPin must be a 6–20 character PIN.' });
    }
    if (!/^[A-Z0-9-]{6,20}$/.test(serial)) {
      return res.status(400).json({ error: 'cardSerial must be a 6–20 character serial.' });
    }

    const normalizedSubjects = subjectCheck.normalized;
    const candidateName = String(req.user.full_name || '').trim().toUpperCase();
    const payload = buildPreviewPayload({
      examBody: check.normalized.examBody,
      examSeries: series,
      examNumber: check.normalized.examNumber,
      examYear,
      cardPin: pin,
      cardSerial: serial,
      candidateName,
      subjects: normalizedSubjects,
    });

    // Re-upload rule: an existing REJECTED record with the same credential is
    // overwritten (student needs to re-upload). PENDING/VERIFIED blocks a new
    // submission — only the admin may edit those.
    const existing = await q.findOlevelByComposite({
      examBody: check.normalized.examBody,
      examNumber: check.normalized.examNumber,
      examYear,
      examSeries: series,
    });

    let verifyId;
    if (existing && existing.verification_status === 'REJECTED') {
      verifyId = existing.verify_id;
      await q.updateOlevelRecord(verifyId, {
        examBody: check.normalized.examBody,
        examSeries: series,
        examNumber: check.normalized.examNumber,
        examYear,
        cardPin: pin,
        cardSerial: serial,
        candidateName,
        status: 'PENDING',
        resultPayload: JSON.stringify(payload),
      });
    } else if (existing) {
      return res.status(409).json({
        error: 'This result has already been submitted. Only the admin can edit or delete it.',
        verification: { verifyId: existing.verify_id, status: existing.verification_status },
      });
    } else {
      const inserted = await q.createOlevelVerification({
        studentId,
        examBody: check.normalized.examBody,
        examSeries: series,
        examNumber: check.normalized.examNumber,
        examYear,
        cardPin: pin,
        cardSerial: serial,
        candidateName,
        status: 'PENDING',
        resultPayload: JSON.stringify(payload),
      });
      verifyId = inserted.insertId;
    }

    res.status(201).json({
      verifyId,
      status: 'PENDING',
      candidateName,
      examBody: check.normalized.examBody,
      examSeries: series,
      examNumber: check.normalized.examNumber,
      examYear,
      message: 'Result entered. Awaiting confirmation by the admin.',
      preview: payload,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/olevel/my             (STUDENT — own records)
// ---------------------------------------------------------------------------
async function listMyVerifications(req, res, next) {
  try {
    const rows = await q.listOlevelByStudent(req.user.user_id);
    res.json({ verifications: rows });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/olevel/verifications  (OFFICER / ADMIN — all students)
// ---------------------------------------------------------------------------
async function listStudentVerifications(req, res, next) {
  try {
    const rows = await q.listAllOlevel();
    res.json({ verifications: rows });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/olevel/verifications/:verifyId  (owner, or OFFICER/ADMIN)
// ---------------------------------------------------------------------------
async function getVerification(req, res, next) {
  try {
    const row = await q.findOlevelById(req.params.verifyId);
    if (!row) return res.status(404).json({ error: 'Verification record not found.' });

    const isOwner = row.student_id === req.user.user_id;
    const isStaff = ['OFFICER', 'ADMIN'].includes(req.user.role);
    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: 'You can only view your own verification records.' });
    }
    res.json({ verification: row });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/olevel/verifications/:verifyId   (ADMIN — edit any record)
// ---------------------------------------------------------------------------
async function editVerification(req, res, next) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only the admin may edit a verification record.' });
    }
    const row = await q.findOlevelById(req.params.verifyId);
    if (!row) return res.status(404).json({ error: 'Verification record not found.' });

    const current = JSON.parse(row.result_payload || '{}');
    const examBody = req.body.examBody || row.exam_body;
    const examSeries = String(req.body.examSeries || row.exam_series).toUpperCase();
    const examNumber = String(req.body.examNumber || row.exam_number).trim();
    const examYear = Number(req.body.examYear || row.exam_year);
    const cardPin = String(req.body.cardPin || row.card_pin).toUpperCase();
    const cardSerial = String(req.body.cardSerial || row.card_serial).toUpperCase();
    const status = ['PENDING', 'VERIFIED', 'REJECTED'].includes(req.body.status)
      ? req.body.status
      : row.verification_status;
    const subjects = req.body.subjects || current.subjects || [];

    const subjectCheck = validateSubjects(subjects);
    if (subjectCheck.error) return res.status(400).json({ error: subjectCheck.error });

    const payload = buildPreviewPayload({
      examBody,
      examSeries,
      examNumber,
      examYear,
      cardPin,
      cardSerial,
      candidateName: req.body.candidateName || current.candidateName || row.candidate_name,
      subjects: subjectCheck.normalized,
    });

    await q.updateOlevelRecord(row.verify_id, {
      examBody,
      examSeries,
      examNumber,
      examYear,
      cardPin,
      cardSerial,
      candidateName: payload.candidateName,
      status,
      resultPayload: JSON.stringify(payload),
    });
    const updated = await q.findOlevelById(row.verify_id);
    res.json({ verification: updated });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/olevel/verifications/:verifyId   (ADMIN — delete any record)
// ---------------------------------------------------------------------------
async function deleteVerification(req, res, next) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only the admin may delete a verification record.' });
    }
    const row = await q.findOlevelById(req.params.verifyId);
    if (!row) return res.status(404).json({ error: 'Verification record not found.' });
    await q.deleteOlevelRecord(row.verify_id);
    res.json({ deleted: true, verifyId: Number(req.params.verifyId) });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/olevel/upload                (STUDENT — document upload)
// GET  /api/olevel/documents             (STUDENT — own uploaded documents)
// ---------------------------------------------------------------------------
async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document file was provided.' });
    }
    const studentId = req.user.user_id;
    const docType = (req.body && req.body.docType) || 'OLEVEL';
    const inserted = await q.createDocument({
      studentId,
      docType,
      filePath: req.file.filename,
      mimeType: req.file.mimetype,
    });
    res.status(201).json({
      docId: inserted.insertId,
      docType,
      fileName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      message: 'Document uploaded successfully.',
    });
  } catch (err) {
    next(err);
  }
}

async function listMyDocuments(req, res, next) {
  try {
    const rows = await q.listDocumentsByStudent(req.user.user_id);
    res.json({ documents: rows });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/olevel/verifications/:verifyId/confirm  (OFFICER/ADMIN)
// ---------------------------------------------------------------------------
async function confirmVerification(req, res, next) {
  try {
    if (!['OFFICER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only clearance officers or admins may confirm verifications.' });
    }
    const row = await q.findOlevelById(req.params.verifyId);
    if (!row) return res.status(404).json({ error: 'Verification record not found.' });

    const { status, resultPayload } = req.body || {};
    const newStatus = ['VERIFIED', 'REJECTED'].includes(status) ? status : row.verification_status;

    await q.updateOlevelStatus(req.params.verifyId, {
      status: newStatus,
      resultPayload: resultPayload || row.result_payload,
    });
    const updated = await q.findOlevelById(req.params.verifyId);
    res.json({ verification: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitVerification,
  listMyVerifications,
  listStudentVerifications,
  getVerification,
  confirmVerification,
  editVerification,
  deleteVerification,
  uploadDocument,
  listMyDocuments,
};