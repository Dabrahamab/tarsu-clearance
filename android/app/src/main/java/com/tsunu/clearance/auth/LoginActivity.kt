package com.tsunu.clearance.auth

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.tsunu.clearance.MainActivity
import com.tsunu.clearance.R
import com.tsunu.clearance.SessionManager
import com.tsunu.clearance.databinding.ActivityLoginBinding
import com.tsunu.clearance.network.ApiClient
import com.tsunu.clearance.network.models.ApiError
import com.tsunu.clearance.network.models.LoginRequest
import com.google.gson.Gson
import kotlinx.coroutines.launch
import retrofit2.HttpException

class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        supportActionBar?.title = getString(R.string.login_title)
        binding.btnLogin.setOnClickListener { attemptLogin() }
        binding.tvGotoRegister.setOnClickListener {
            startActivity(Intent(this, RegisterActivity::class.java))
        }
    }

    private fun attemptLogin() {
        val identifier = binding.etIdentifier.text?.toString()?.trim().orEmpty()
        val password = binding.etPassword.text?.toString().orEmpty()

        if (identifier.isEmpty() || password.isEmpty()) {
            binding.layoutIdentifier.error = getString(R.string.field_required)
            return
        }

        binding.btnLogin.isEnabled = false
        lifecycleScope.launch {
            try {
                val response = ApiClient.api.login(LoginRequest(identifier = identifier, password = password))
                if (response.isSuccessful && response.body() != null) {
                    val body = response.body()!!
                    SessionManager.save(
                        this@LoginActivity,
                        body.token,
                        body.user.fullName,
                        body.user.role,
                        body.user.email,
                    )
                    Toast.makeText(this@LoginActivity, R.string.login_success, Toast.LENGTH_SHORT).show()
                    startActivity(Intent(this@LoginActivity, MainActivity::class.java))
                    finish()
                } else {
                    val err = parseError(response.code(), response.errorBody()?.string())
                    Toast.makeText(this@LoginActivity, err, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@LoginActivity, e.message ?: getString(R.string.network_error), Toast.LENGTH_LONG).show()
            } finally {
                binding.btnLogin.isEnabled = true
            }
        }
    }

    private fun parseError(code: Int, body: String?): String {
        body?.let {
            return try {
                Gson().fromJson(it, ApiError::class.java).error
            } catch (_: Exception) {
                getString(R.string.login_failed)
            }
        }
        return getString(R.string.login_failed)
    }
}