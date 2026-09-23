package com.tsunu.clearance

import android.content.Context

object SessionManager {
    private const val PREFS_NAME = "clearance_session"
    private const val KEY_TOKEN = "jwt_token"
    private const val KEY_NAME = "full_name"
    private const val KEY_ROLE = "role"
    private const val KEY_EMAIL = "email"

    fun save(context: Context, token: String, fullName: String, role: String, email: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_TOKEN, token)
            .putString(KEY_NAME, fullName)
            .putString(KEY_ROLE, role)
            .putString(KEY_EMAIL, email)
            .apply()
    }

    fun token(context: Context): String? =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(KEY_TOKEN, null)

    fun fullName(context: Context): String? =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(KEY_NAME, null)

    fun role(context: Context): String? =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(KEY_ROLE, null)

    fun clear(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply()
    }
}