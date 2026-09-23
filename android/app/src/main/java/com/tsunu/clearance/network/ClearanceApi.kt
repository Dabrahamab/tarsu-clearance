package com.tsunu.clearance.network

import com.tsunu.clearance.network.models.AuthResponse
import com.tsunu.clearance.network.models.CatalogCreateRequest
import com.tsunu.clearance.network.models.CatalogCreateResponse
import com.tsunu.clearance.network.models.ClearanceDetailResponse
import com.tsunu.clearance.network.models.ClearanceListResponse
import com.tsunu.clearance.network.models.DocumentsResponse
import com.tsunu.clearance.network.models.FacultiesResponse
import com.tsunu.clearance.network.models.LoginRequest
import com.tsunu.clearance.network.models.MyProgressResponse
import com.tsunu.clearance.network.models.OlevelStatusUpdateRequest
import com.tsunu.clearance.network.models.OlevelVerificationsResponse
import com.tsunu.clearance.network.models.OlevelVerifyRequest
import com.tsunu.clearance.network.models.OlevelVerifyResponse
import com.tsunu.clearance.network.models.RegisterRequest
import com.tsunu.clearance.network.models.StampRequest
import com.tsunu.clearance.network.models.StudentsResponse
import com.tsunu.clearance.network.models.UploadDocumentResponse
import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query

interface ClearanceApi {

    @POST("api/auth/register")
    suspend fun register(@Body body: RegisterRequest): Response<AuthResponse>

    @POST("api/auth/login")
    suspend fun login(@Body body: LoginRequest): Response<AuthResponse>

    @GET("api/faculties")
    suspend fun faculties(): Response<FacultiesResponse>

    @POST("api/olevel/verify")
    suspend fun verifyOlevel(
        @Header("Authorization") token: String,
        @Body body: OlevelVerifyRequest,
    ): Response<OlevelVerifyResponse>

    @GET("api/olevel/my")
    suspend fun myOlevel(@Header("Authorization") token: String): Response<OlevelVerificationsResponse>

    @GET("api/olevel/verifications")
    suspend fun listVerifications(@Header("Authorization") token: String): Response<OlevelVerificationsResponse>

    @PATCH("api/olevel/verifications/{verifyId}")
    suspend fun updateVerification(
        @Header("Authorization") token: String,
        @Path("verifyId") verifyId: Long,
        @Body body: OlevelStatusUpdateRequest,
    ): Response<com.tsunu.clearance.network.models.OlevelUpdateResponse>

    @DELETE("api/olevel/verifications/{verifyId}")
    suspend fun deleteVerification(
        @Header("Authorization") token: String,
        @Path("verifyId") verifyId: Long,
    ): Response<com.tsunu.clearance.network.models.OlevelDeleteResponse>

    @Multipart
    @POST("api/olevel/upload")
    suspend fun uploadDocument(
        @Header("Authorization") token: String,
        @Part file: MultipartBody.Part,
        @Part("docType") docType: okhttp3.RequestBody,
    ): Response<UploadDocumentResponse>

    @GET("api/olevel/documents")
    suspend fun myDocuments(@Header("Authorization") token: String): Response<DocumentsResponse>

    @POST("api/clearance/apply")
    suspend fun applyClearance(@Header("Authorization") token: String): Response<MyProgressResponse>

    @GET("api/clearance/my")
    suspend fun myProgress(@Header("Authorization") token: String): Response<MyProgressResponse>

    @GET("api/clearance/all")
    suspend fun allClearances(@Header("Authorization") token: String): Response<ClearanceListResponse>

    @GET("api/clearance/{clearanceId}")
    suspend fun clearanceDetail(
        @Header("Authorization") token: String,
        @Path("clearanceId") clearanceId: Long,
    ): Response<ClearanceDetailResponse>

    @PATCH("api/clearance/{clearanceId}/approvals/{unitId}")
    suspend fun stampApproval(
        @Header("Authorization") token: String,
        @Path("clearanceId") clearanceId: Long,
        @Path("unitId") unitId: Long,
        @Body body: StampRequest,
    ): Response<ClearanceDetailResponse>

    @GET("api/admin/students/search")
    suspend fun searchStudents(
        @Header("Authorization") token: String,
        @Query("q") q: String,
    ): Response<StudentsResponse>

    @POST("api/admin/catalog")
    suspend fun createCatalog(
        @Header("Authorization") token: String,
        @Body body: CatalogCreateRequest,
    ): Response<CatalogCreateResponse>
}