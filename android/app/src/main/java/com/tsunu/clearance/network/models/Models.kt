package com.tsunu.clearance.network.models

import com.google.gson.annotations.SerializedName

data class RegisterRequest(
    @SerializedName("matricNo") val matricNo: String? = null,
    @SerializedName("fullName") val fullName: String? = null,
    @SerializedName("email") val email: String? = null,
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

data class Department(
    @SerializedName("dept_id") val deptId: Int,
    @SerializedName("dept_name") val deptName: String,
    @SerializedName("dept_type") val deptType: String,
    @SerializedName("sort_order") val sortOrder: Int,
)

data class DepartmentsResponse(
    @SerializedName("departments") val departments: List<Department>,
)

data class ApiError(
    @SerializedName("error") val error: String,
)

data class OlevelVerifyRequest(
    @SerializedName("examBody") val examBody: String,
    @SerializedName("examNumber") val examNumber: String,
    @SerializedName("examYear") val examYear: Int,
    @SerializedName("cardPinSerial") val cardPinSerial: String,
)

data class OlevelSubject(
    @SerializedName("subject") val subject: String,
    @SerializedName("grade") val grade: String,
)

data class OlevelVerifyResponse(
    @SerializedName("verifyId") val verifyId: Long? = null,
    @SerializedName("status") val status: String,
    @SerializedName("candidateName") val candidateName: String? = null,
    @SerializedName("examBody") val examBody: String? = null,
    @SerializedName("examNumber") val examNumber: String? = null,
    @SerializedName("examYear") val examYear: Int? = null,
    @SerializedName("message") val message: String? = null,
    @SerializedName("nameMatch") val nameMatch: String? = null,
    @SerializedName("subjects") val subjects: List<OlevelSubject>? = null,
)

data class OlevelVerificationItem(
    @SerializedName("verify_id") val verifyId: Long? = null,
    @SerializedName("student_id") val studentId: Long? = null,
    @SerializedName("exam_body") val examBody: String? = null,
    @SerializedName("exam_number") val examNumber: String? = null,
    @SerializedName("exam_year") val examYear: Int? = null,
    @SerializedName("card_pin_serial") val cardPinSerial: String? = null,
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
    @SerializedName("overall_status") val overallStatus: String? = null,
    @SerializedName("submitted_at") val submittedAt: String? = null,
    @SerializedName("completed_at") val completedAt: String? = null,
    @SerializedName("clearance_ref") val clearanceRef: String? = null,
)

data class ApprovalItem(
    @SerializedName("approval_id") val approvalId: Long? = null,
    @SerializedName("clearance_id") val clearanceId: Long? = null,
    @SerializedName("dept_id") val deptId: Long? = null,
    @SerializedName("status") val status: String? = null,
    @SerializedName("remarks") val remarks: String? = null,
    @SerializedName("approved_by_user_id") val approvedByUserId: Long? = null,
    @SerializedName("updated_at") val updatedAt: String? = null,
    @SerializedName("dept_name") val deptName: String? = null,
    @SerializedName("dept_type") val deptType: String? = null,
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