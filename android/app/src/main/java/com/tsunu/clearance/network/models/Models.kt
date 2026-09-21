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