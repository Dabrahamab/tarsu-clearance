package com.tsunu.clearance.network

import com.tsunu.clearance.network.models.AuthResponse
import com.tsunu.clearance.network.models.DepartmentsResponse
import com.tsunu.clearance.network.models.LoginRequest
import com.tsunu.clearance.network.models.RegisterRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface ClearanceApi {

    @POST("api/auth/register")
    suspend fun register(@Body body: RegisterRequest): Response<AuthResponse>

    @POST("api/auth/login")
    suspend fun login(@Body body: LoginRequest): Response<AuthResponse>

    @GET("api/departments")
    suspend fun departments(): Response<DepartmentsResponse>
}