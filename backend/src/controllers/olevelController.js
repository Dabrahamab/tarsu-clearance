const { queries: q } = require('../config/db');
const {
  EXAM_BODIES,
  validateCredential,
  fetchResult,
  parseResult,
} = require('../services/olevelVerifier');

/**
 * Sprint 2 — O'Level verification (blueprint §4-B).
 *
 * STUDENT submits their examination credential (body / number / year + the
 * scratch-card PIN or serial); the engine validates the credential format,
 * calls the result provider (mock gateway in dev), parses the raw payload into
 * normalised subject/grade rows/flags, and stores the outcome. The composite
 * (exam_body + number + year) is unique so re-verifying the same result just
 * re-confirms the stored row — no duplicate rows (matches blueprint “check
 * duplicates via composite key”).
 */

// ---------------------------------------------------------------------------
// POST /api/olevel/verify        (STUDENT)
// ---------------------------------------------------------------------------
async function submitVerification(req, res, next) {
  try {
    const studentId = req.user.user_id; // students.student_id === users.user_id
    const { examBody, examNumber, examYear, cardPinSerial } = req.body || {};

    const check = validateCredential({ examBody, examNumber, examYear, cardPinSerial });
    if (!check.ok) return res.status(400).json({ error: check.error });

    // Duplicate guard — the composite primary key should already prevent this,
    // but we do an explicit read to give a clean 409 (blueprint §4-B).
    const existing = await q.findOlevelByComposite({
      examBody: check.normalized.examBody,
      examNumber: check.normalized.examNumber,
      examYear,
    });
    if (existing) {
      return res.status(409).json({
        error: 'This result has already been submitted for verification.',
        verification: {
          verifyId: existing.verify_id,
          status: existing.verification_status,
        },
      });
    }

    // Call the (mock) provider gateway. The result is keyed to the account
    // owner's own name so a student can only ever verify their own result.
    const raw = await fetchResult(
      {
        examBody: check.normalized.examBody,
        examNumber: check.normalized.examNumber,
        examYear,
        cardPinSerial: check.normalized.cardPinSerial,
      },
      { expectedName: req.user.full_name }
    );

    // Normalise into the JSON payload that is stored + returned to the client.
    const normalized = parseResult(raw);

    // Persist a PENDING row first so it's visible while the result is stored.
    const inserted = await q.createOlevelVerification({
      studentId,
      examBody: raw.examBody,
      examNumber: raw.examNumber,
      examYear,
      cardPinSerial: normalized.cardPinSerial,
      candidateName: normalized.candidateName,
      status: raw.status === 'VERIFIED' ? 'VERIFIED' : 'REJECTED',
      resultPayload: JSON.stringify(normalized),
    });
    const verifyId = inserted.insertId;

    res.status(201).json({
      verifyId,
      status: raw.status === 'VERIFIED' ? 'VERIFIED' : 'REJECTED',
      candidateName: normalized.candidateName,
      examBody: raw.examBody,
      examNumber: raw.examNumber,
      examYear,
      message: raw.message,
      subjects: normalized.subjects,
      nameMatch: normalized.nameMatch,
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
    const isOfficer = ['OFFICER', 'ADMIN'].includes(req.user.role);
    if (!isOwner && !isOfficer) {
      return res.status(403).json({ error: 'You can only view your own verification records.' });
    }
    res.json({ verification: row });
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
    const studentId = req.user.user_id; // students.student_id === users.user_id
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
  uploadDocument,
  listMyDocuments,
};
