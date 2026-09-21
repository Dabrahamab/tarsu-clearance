'use strict';
const crypto = require('crypto');

/*
 * Sprint 2 — O'Level verification engine (blueprint §4-B).
 *
 * Layered so the real provider gateway can be swapped into fetchResult without
 * touching controllers:
 *   validateCredential — local format/plausibility checks
 *   fetchResult        — provider gateway call (dev fallback = deterministic mock)
 *   parseResult        — normalise provider payload into the stored result rows
 */

const EXAM_BODIES = ['WAEC', 'NECO', 'NABTEB'];

const SUBJECT_SET = {
  WAEC: ['ENGLISH LANGUAGE', 'MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY',
    'ECONOMICS', 'GEOGRAPHY', 'FURTHER MATHEMATICS', 'AGRICULTURAL SCIENCE',
    'HISTORY', 'CIVIC EDUCATION', 'COMPUTER STUDIES', 'LITERATURE IN ENGLISH',
    'FINANCIAL ACCOUNTING', 'COMMERCE', 'GOVERNMENT', 'ISLAMIC STUDIES'],
  NECO: ['ENGLISH LANGUAGE', 'MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY',
    'ECONOMICS', 'GEOGRAPHY', 'AGRICULTURAL SCIENCE', 'COMPUTER STUDIES',
    'CIVIC EDUCATION', 'FINANCIAL ACCOUNTING', 'COMMERCE', 'GOVERNMENT',
    'LITERATURE IN ENGLISH', 'GENERAL MATHEMATICS'],
  NABTEB: ['ENGLISH LANGUAGE', 'MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY',
    'TECHNICAL DRAWING', 'BASIC ELECTRICITY', 'COMPUTER STUDIES',
    'ENGINEERING SCIENCE', 'ECONOMICS', 'BUSINESS STUDIES'],
};

const GRADES = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'];
const CREDIT_GRADES = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6'];

const SAMPLE_CANDIDATES = [
  'ALIYU MUSA', 'AMINA IBRAHIM', 'CHUKWUEMEKA OKAFOR', 'FATIMA BELLO',
  'IBRAHIM DANLADI', 'GRACE ADAMU', 'SANI LAWAL', 'MARY JAMES',
  'USMAN ALIYU', 'TRUST ISAAC', 'DEBORAH PAUL', 'HABIBA MOHAMMED',
];

/**
 * Deterministic PRNG from the credential (xorshift32) so the same PIN/serial +
 * exam details always resolve to the same mock result — stable, reproducible
 * dev behaviour per blueprint ("dev fallback = mock provider seeded from a
 * sample result database").
 */
function seedFrom(examBody, examNumber, examYear, pinSerial) {
  const h = crypto.createHash('sha256').update(
    [examBody, examNumber, examYear, pinSerial].join('|')).digest();
  let a = h.readUInt32LE(0) || 1;
  return () => {
    a ^= (a << 13) >>> 0;
    a ^= a >>> 17;
    a ^= (a << 5) >>> 0;
    return (a >>> 0) / 4294967296;
  };
}

function validateCredential({ examBody, examNumber, examYear, cardPinSerial }) {
  if (!EXAM_BODIES.includes(examBody)) {
    return { ok: false, error: 'examBody must be one of WAEC, NECO or NABTEB.' };
  }
  const number = String(examNumber || '').trim().toUpperCase();
  if (!/^[A-Z0-9/]{6,20}$/.test(number)) {
    return { ok: false, error: 'examNumber must be 6–20 alphanumeric characters.' };
  }
  const year = Number(examYear);
  if (!Number.isInteger(year) || year < 1980 || year > new Date().getFullYear()) {
    return { ok: false, error: 'examYear must be a year between 1980 and the current year.' };
  }
  const pin = String(cardPinSerial || '').replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z0-9-]{10,20}$/.test(pin)) {
    return { ok: false, error: 'cardPinSerial must be a 10–20 character PIN/serial.' };
  }
  return { ok: true, normalized: { examBody, examNumber: number, examYear: year, cardPinSerial: pin } };
}

/**
 * Provider gateway call. In dev the MOCK_GATEWAY returns a deterministic
 * sample result seeded from the credential, including a curated set of pins
 * that always reject (to exercise the REJECTED + name-mismatch flag paths).
 */
function fetchResult({ examBody, examNumber, examYear, cardPinSerial }, opts = {}) {
  const gateway = opts.gateway || process.env.OLEVEL_GATEWAY || 'mock';
  const random = seedFrom(examBody, examNumber, examYear, cardPinSerial);

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (gateway === 'mock') {
        const pin = String(cardPinSerial || '');
        const alwaysReject = /^(0000|REJECT|BAD)/.test(pin.toUpperCase());
        const rollGrade = random();
        const careerGrade = rollGrade < 0.06 ? 'F9' : GRADES[Math.min(8, Math.floor(random() * 9))];

        const candidates = SAMPLE_CANDIDATES.slice();
        const candidateName = opts.expectedName
          ? String(opts.expectedName).trim().toUpperCase()
          : candidates[Math.floor(random() * candidates.length)];
        const providerName = candidates[Math.floor(random() * candidates.length)];
        const nameMatched = candidateName === providerName;

        const pass = !alwaysReject && random() > 0.04;
        const verdict = pass ? 'VERIFIED' : 'REJECTED';

        const subjNames = SUBJECT_SET[examBody] || SUBJECT_SET.WAEC;
        const subjects = subjNames.slice(0, 6 + Math.floor(random() * 3)).map((subject) => {
          const g = random();
          return { subject, grade: g < 0.06 ? 'F9' : GRADES[Math.min(8, Math.floor(g * 9))] };
        });

        return resolve({
          status: verdict,
          candidateName: providerName,
          nameMatched,
          examBody,
          examNumber,
          examYear,
          cardPinSerial: pin,
          subjects,
          provider: 'MOCK_GATEWAY',
          message:
            verdict === 'VERIFIED'
              ? "Result retrieved and matched the submitted details."
              : 'The result could not be confirmed. Check your PIN/serial or examination details.',
        });
      }
      return reject(new Error(`O'Level gateway "${gateway}" is not configured yet.`));
    }, 250);
  });
}

/** Normalise the raw provider payload into the compact DB/API shape. */
function parseResult(raw) {
  return {
    candidateName: raw.candidateName,
    examBody: raw.examBody,
    examNumber: raw.examNumber,
    examYear: raw.examYear,
    nameMatch: raw.status === 'VERIFIED' ? (raw.nameMatched === false ? 'MISMATCH' : 'MATCH') : null,
    subjects: raw.subjects.map((s) => ({ subject: s.subject, grade: s.grade })),
    totalSubjects: raw.subjects.length,
    credits: raw.subjects.filter((s) => CREDIT_GRADES.includes(s.grade)).length,
    provider: raw.provider,
    cardPinSerial: raw.cardPinSerial || '',
    nameMatched: raw.nameMatched,
  };
}

module.exports = {
  EXAM_BODIES,
  validateCredential,
  fetchResult,
  parseResult,
};
