package com.tsunu.clearance.network.models

import com.google.gson.annotations.SerializedName

data class RegisterRequest(
    @SerializedName("matricNo") val matricNo: String? = null,
    @SerializedName("fullName") val fullName: String? = null,
    @SerializedName("email") val email: String? = null,
    @SerializedName("facultyId") val facultyId: Int? = null,
    @SerializedName("departmentId") val departmentId: Int? = null,
    @SerializedName("password") val password: String? = null,
    @SerializedName("level") val level: String? = null,
)

data class LoginRequest(
    @SerializedName("identifier") val identifier: String? = null,
    @SerializedName("password") val password: String? = null,
)

data class User(
    @SerializedName("user_id") val userId: Long,
    @SerializedName("role") val role: String,
    @SerializedName("email") val email: String,
    @SerializedName("full_name") val fullName: String,
    @SerializedName("department_id") val departmentId: Int? = null,
)

data class AuthResponse(
    @SerializedName("token") val token: String,
    @SerializedName("user") val user: User,
)

data class Faculty(
    @SerializedName("faculty_id") val facultyId: Int,
    @SerializedName("faculty_name") val facultyName: String,
    @SerializedName("sort_order") val sortOrder: Int? = null,
)

data class Department(
    @SerializedName("dept_id") val deptId: Int,
    @SerializedName("dept_name") val deptName: String,
    @SerializedName("faculty_id") val facultyId: Int? = null,
)

data class FacultiesResponse(
    @SerializedName("faculties") val faculties: List<Faculty> = emptyList(),
    @SerializedName("departments") val departments: List<Department> = emptyList(),
)

data class ApiError(
    @SerializedName("error") val error: String,
)

data class OlevelVerifyRequest(
    @SerializedName("examBody") val examBody: String,
    @SerializedName("examSeries") val examSeries: String,
    @SerializedName("examNumber") val examNumber: String,
    @SerializedName("examYear") val examYear: Int,
    @SerializedName("cardPin") val cardPin: String,
    @SerializedName("cardSerial") val cardSerial: String,
    @SerializedName("subjects") val subjects: List<OlevelSubject>,
)

data class OlevelSubject(
    @SerializedName("subject") val subject: String,
    @SerializedName("grade") val grade: String,
)

data class OlevelPreview(
    @SerializedName("examBody") val examBody: String? = null,
    @SerializedName("examSeries") val examSeries: String? = null,
    @SerializedName("examNumber") val examNumber: String? = null,
    @SerializedName("examYear") val examYear: Int? = null,
    @SerializedName("cardPin") val cardPin: String? = null,
    @SerializedName("cardSerial") val cardSerial: String? = null,
    @SerializedName("candidateName") val candidateName: String? = null,
    @SerializedName("subjects") val subjects: List<OlevelSubject>? = null,
    @SerializedName("totalSubjects") val totalSubjects: Int? = null,
    @SerializedName("credits") val credits: Int? = null,
    @SerializedName("provider") val provider: String? = null,
    @SerializedName("message") val message: String? = null,
)

data class OlevelVerifyResponse(
    @SerializedName("verifyId") val verifyId: Long? = null,
    @SerializedName("status") val status: String,
    @SerializedName("candidateName") val candidateName: String? = null,
    @SerializedName("examBody") val examBody: String? = null,
    @SerializedName("examSeries") val examSeries: String? = null,
    @SerializedName("examNumber") val examNumber: String? = null,
    @SerializedName("examYear") val examYear: Int? = null,
    @SerializedName("message") val message: String? = null,
    @SerializedName("preview") val preview: OlevelPreview? = null,
)

data class OlevelVerificationItem(
    @SerializedName("verify_id") val verifyId: Long? = null,
    @SerializedName("student_id") val studentId: Long? = null,
    @SerializedName("exam_body") val examBody: String? = null,
    @SerializedName("exam_series") val examSeries: String? = null,
    @SerializedName("exam_number") val examNumber: String? = null,
    @SerializedName("exam_year") val examYear: Int? = null,
    @SerializedName("card_pin") val cardPin: String? = null,
    @SerializedName("card_serial") val cardSerial: String? = null,
    @SerializedName("candidate_name") val candidateName: String? = null,
    @SerializedName("verification_status") val verificationStatus: String? = null,
    @SerializedName("result_payload") val resultPayload: String? = null,
    @SerializedName("verified_at") val verifiedAt: String? = null,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("student_name") val studentName: String? = null,
    @SerializedName("matric_no") val matricNo: String? = null,
)

data class OlevelVerificationsResponse(
    @SerializedName("verifications") val verifications: List<OlevelVerificationItem>,
)

data class OlevelStatusUpdateRequest(
    @SerializedName("status") val status: String,
)

data class OlevelUpdateResponse(
    @SerializedName("verification") val verification: OlevelVerificationItem? = null,
    @SerializedName("error") val error: String? = null,
)

data class OlevelDeleteResponse(
    @SerializedName("deleted") val deleted: Boolean? = null,
    @SerializedName("error") val error: String? = null,
)

data class CatalogCreateRequest(
    @SerializedName("kind") val kind: String,
    @SerializedName("facultyId") val facultyId: Int? = null,
    @SerializedName("facultyName") val facultyName: String? = null,
    @SerializedName("departmentName") val departmentName: String? = null,
    @SerializedName("unitCode") val unitCode: String? = null,
    @SerializedName("unitName") val unitName: String? = null,
    @SerializedName("sortOrder") val sortOrder: Int? = null,
)

data class CatalogCreateResponse(
    @SerializedName("facultyId") val facultyId: Long? = null,
    @SerializedName("facultyName") val facultyName: String? = null,
    @SerializedName("departmentId") val departmentId: Long? = null,
    @SerializedName("departmentName") val departmentName: String? = null,
    @SerializedName("unitId") val unitId: Long? = null,
    @SerializedName("unitCode") val unitCode: String? = null,
    @SerializedName("unitName") val unitName: String? = null,
)

data class DocumentItem(
    @SerializedName("doc_id") val docId: Long? = null,
    @SerializedName("student_id") val studentId: Long? = null,
    @SerializedName("doc_type") val docType: String? = null,
    @SerializedName("file_path") val filePath: String? = null,
    @SerializedName("mime_type") val mimeType: String? = null,
    @SerializedName("uploaded_at") val uploadedAt: String? = null,
)

data class DocumentsResponse(
    @SerializedName("documents") val documents: List<DocumentItem>,
)

data class UploadDocumentResponse(
    @SerializedName("docId") val docId: Long? = null,
    @SerializedName("docType") val docType: String? = null,
    @SerializedName("fileName") val fileName: String? = null,
    @SerializedName("mimeType") val mimeType: String? = null,
    @SerializedName("size") val size: Long? = null,
    @SerializedName("message") val message: String? = null,
)

data class Clearance(
    @SerializedName("clearance_id") val clearanceId: Long? = null,
    @SerializedName("student_id") val studentId: Long? = null,
    @SerializedName("department_id") val departmentId: Long? = null,
    @SerializedName("overall_status") val overallStatus: String? = null,
    @SerializedName("submitted_at") val submittedAt: String? = null,
    @SerializedName("completed_at") val completedAt: String? = null,
    @SerializedName("clearance_ref") val clearanceRef: String? = null,
)

data class ApprovalItem(
    @SerializedName("approval_id") val approvalId: Long? = null,
    @SerializedName("clearance_id") val clearanceId: Long? = null,
    @SerializedName("unit_id") val unitId: Long? = null,
    @SerializedName("status") val status: String? = null,
    @SerializedName("remarks") val remarks: String? = null,
    @SerializedName("approved_by_user_id") val approvedByUserId: Long? = null,
    @SerializedName("updated_at") val updatedAt: String? = null,
    @SerializedName("unit_code") val unitCode: String? = null,
    @SerializedName("unit_name") val unitName: String? = null,
)

data class StudentProfile(
    @SerializedName("student_id") val studentId: Long? = null,
    @SerializedName("matric_no") val matricNo: String? = null,
    @SerializedName("full_name") val fullName: String? = null,
    @SerializedName("email") val email: String? = null,
    @SerializedName("department_id") val departmentId: Long? = null,
    @SerializedName("level") val level: String? = null,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("dept_name") val deptName: String? = null,
)

data class ClearanceSummary(
    @SerializedName("clearance_id") val clearanceId: Long? = null,
    @SerializedName("student_id") val studentId: Long? = null,
    @SerializedName("department_id") val departmentId: Long? = null,
    @SerializedName("overall_status") val overallStatus: String? = null,
    @SerializedName("submitted_at") val submittedAt: String? = null,
    @SerializedName("completed_at") val completedAt: String? = null,
    @SerializedName("clearance_ref") val clearanceRef: String? = null,
    @SerializedName("matric_no") val matricNo: String? = null,
    @SerializedName("student_name") val studentName: String? = null,
    @SerializedName("student_email") val studentEmail: String? = null,
    @SerializedName("department_name") val departmentName: String? = null,
    @SerializedName("approvals") val approvals: List<ApprovalItem>? = null,
)

data class MyProgressResponse(
    @SerializedName("clearance") val clearance: Clearance? = null,
    @SerializedName("approvals") val approvals: List<ApprovalItem> = emptyList(),
    @SerializedName("olevel") val olevel: List<OlevelVerificationItem> = emptyList(),
    @SerializedName("documents") val documents: List<DocumentItem> = emptyList(),
    @SerializedName("student") val student: StudentProfile? = null,
)

data class ClearanceListResponse(
    @SerializedName("clearances") val clearances: List<ClearanceSummary>,
)

data class ClearanceDetailResponse(
    @SerializedName("clearance") val clearance: ClearanceSummary? = null,
    @SerializedName("olevel") val olevel: List<OlevelVerificationItem> = emptyList(),
    @SerializedName("documents") val documents: List<DocumentItem> = emptyList(),
)

data class StudentsResponse(
    @SerializedName("students") val students: List<StudentProfile>,
)

data class StampRequest(
    @SerializedName("status") val status: String,
    @SerializedName("remarks") val remarks: String? = null,
)