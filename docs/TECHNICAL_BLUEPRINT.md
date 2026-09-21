# Technical Blueprint: Android-Based Student Clearance System with O'Level Verification

Original project proposal from Taraba State University (Department of Computer Science).
This file is the authoritative spec for implementation.

## 1. System Overview & Core Scope

Automates the multi-departmental clearance process for graduating/clearing students while
authenticating foundational academic credentials (WAEC, NECO, NABTEB).

- **Target Environment:** Android mobile app (students) + responsive admin web portal
  (department officers).
- **Core Functionality:** Multi-stage departmental clearance workflows, automated O'Level
  verification logic, push notifications, electronic approval tracking.
- **System Boundaries:** Online cloud/server APIs, with simulated external verification
  fallbacks when direct WAEC/NECO live API access is restricted.

## 2. Recommended Tech Stack (three-tier Client-Server)

- **Client Layer:** Android (Kotlin/Java, XML/Jetpack) + Admin web dashboard
  (React.js / HTML5+Bootstrap).
- **Application Layer:** Node.js (Express) or PHP (Laravel); API docs via Postman/Swagger.
- **Data Layer:** Relational MySQL/PostgreSQL; real-time/media via Firebase Cloud Storage.

> Implementation decision: Node.js + Express, MySQL production schema with SQLite local
> dev fallback (see README).

## 3. Database Schema (Handled in database/schema.sql)

Primary entities: `departments`, `users`, `students`, `olevel_verifications`,
`clearance_requests`, `clearance_department_approvals`, `documents`.

Reference fields:
- `olevel_verifications`: exam_body (WAEC/NECO/NABTEB), exam_number, exam_year,
  card_pin_serial, verification_status (PENDING/VERIFIED/REJECTED).
- `clearance_requests`: overall_status (IN_PROGRESS/APPROVED/REJECTED).
- `clearance_department_approvals`: status (PENDING/APPROVED/REJECTED), remarks,
  approved_by_officer_id.

## 4. Module Specifications

### A. Authentication & User Profile
- Student onboarding via Matriculation Number + verified email.
- RBAC: Students, Departmental Clearance Officers (Library, Bursary, Faculty, Registry),
  System Administrators.

### B. O'Level Verification Module
- Inputs: Exam Body, Exam Number, Exam Year, Scratch Card credentials.
- Verification Engine: production gateway API; dev fallback = mock service based on sample
  result DB.
- Result Matching: flag mismatched candidate names / invalid grades.

### C. Departmental Clearance Workflow
- Tracking order: (1) Department/Academic Unit, (2) Library, (3) Bursary/Finance,
  (4) Student Affairs, (5) Registry/Senate.
- Document uploads (PDF/Images): fee receipts, library slips, identity documents.

### D. Notifications & Status Tracking
- Real-time step-by-step progress tracker (approved/pending/rejected).
- Push notifications on status update.
- Digital clearance slip with QR code on full completion.

## 5. System Execution Workflow

```
[Student App]                [Backend API]                [Verification Gateway / Admin]
1. Submit credentials &      -> 2. Call verification service -> gateway
   O'Level data                  3. Return status (valid/invalid)
4. Display result status     <-
   (valid => unlock clearance)
5. Submit multi-dept         -> 6. Push notification to admin ->
   clearance request                  7. Dept approval / reject
8. Real-time status update   <-
   & clearance certificate
```

## 6. Implementation Roadmap (Agile - 5 Sprints)

- **Sprint 1:** Android Studio setup + repo, DB schema, JWT auth APIs.  [DONE]
- **Sprint 2:** O'Level verification UI, backend verification logic, result parser + engine.
- **Sprint 3:** Clearance workflow UI + document submission, admin dashboard
  (review/accept/reject with comments), file storage.
- **Sprint 4:** FCM push notifications, automated digital clearance slip + QR code.
- **Sprint 5:** Unit/integration testing (Postman E2E), usability testing per Davis's TAM
  (Perceived Usefulness / Ease of Use), final documentation.