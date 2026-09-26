package com.tsunu.clearance.network

import com.tsunu.clearance.BuildConfig
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    /**
     * Default build points at 10.0.2.2 (emulator -> host loopback).
     * Physical-device builds override this via:  -PapiBaseUrl=http://<lan-ip>:5000/
     */
    private val BASE_URL: String = BuildConfig.API_BASE_URL

    private val logging = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BASIC
    }

    private val client: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(60, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .addInterceptor(logging)
            .build()
    }

    val api: ClearanceApi by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ClearanceApi::class.java)
    }
}