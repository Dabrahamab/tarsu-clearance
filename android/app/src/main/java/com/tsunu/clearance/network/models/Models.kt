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