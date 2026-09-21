package com.tsunu.clearance.auth

import android.content.Intent
import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.tsunu.clearance.MainActivity
import com.tsunu.clearance.R
import com.tsunu.clearance.SessionManager
import com.tsunu.clearance.databinding.ActivityRegisterBinding
import com.tsunu.clearance.network.ApiClient
import com.tsunu.clearance.network.models.ApiError
import com.tsunu.clearance.network.models.Department
import com.tsunu.clearance.network.models.RegisterRequest
import com.google.gson.Gson
import kotlinx.coroutines.launch

class RegisterActivity : AppCompatActivity() {

    private lateinit var binding: ActivityRegisterBinding
    private val departments = mutableListOf<Department>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityRegisterBinding.inflate(layoutInflater)
        setContentView(binding.root)

        supportActionBar?.title = getString(R.string.register_title)
        binding.btnRegister.setOnClickListener { attemptRegister() }
        binding.tvGotoLogin.setOnClickListener {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }
        loadDepartments()
    }

    private fun loadDepartments() {
        lifecycleScope.launch {
            try {
                val response = ApiClient.api.departments()
                if (response.isSuccessful && response.body() != null) {
                    departments.clear()
                    departments.addAll(response.body()!!.departments)
                    val names = departments.map { it.deptName }
                    binding.spinnerDepartment.adapter =
                        ArrayAdapter(this@RegisterActivity, android.R.layout.simple_spinner_item, names)
                            .apply { setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item) }
                }
            } catch (_: Exception) {
                // Departments remain empty; validation will catch it on submit.
            }
        }
    }

    private fun attemptRegister() {
        val fullName = binding.etFullName.text?.toString()?.trim().orEmpty()
        val matricNo = binding.etMatric.text?.toString()?.trim().orEmpty()
        val email = binding.etEmail.text?.toString()?.trim().orEmpty()
        val password = binding.etPassword.text?.toString()
        val confirm = binding.etConfirmPassword.text?.toString()
        val deptIndex = binding.spinnerDepartment.selectedItemPosition

        if (fullName.isEmpty() || matricNo.isEmpty() || email.isEmpty()) {
            Toast.makeText(this, R.string.field_required, Toast.LENGTH_SHORT).show()
            return
        }
        if (password == null || password.length < 8) {
            Toast.makeText(this, R.string.password_too_short, Toast.LENGTH_SHORT).show()
            return
        }
        if (password != confirm) {
            Toast.makeText(this, R.string.password_mismatch, Toast.LENGTH_SHORT).show()
            return
        }
        if (departments.isEmpty() || deptIndex < 0) {
            Toast.makeText(this, R.string.departments_not_loaded, Toast.LENGTH_SHORT).show()
            return
        }

        binding.btnRegister.isEnabled = false
        val deptId = departments[deptIndex].deptId
        lifecycleScope.launch {
            try {
                val response = ApiClient.api.register(
                    RegisterRequest(
                        matricNo = matricNo,
                        fullName = fullName,
                        email = email,
                        departmentId = deptId,
                        password = password,
                        level = null,
                    )
                )
                if (response.isSuccessful && response.body() != null) {
                    val body = response.body()!!
                    SessionManager.save(
                        this@RegisterActivity,
                        body.token,
                        body.user.fullName,
                        body.user.role,
                        body.user.email,
                    )
                    Toast.makeText(this@RegisterActivity, R.string.register_success, Toast.LENGTH_SHORT).show()
                    startActivity(Intent(this@RegisterActivity, MainActivity::class.java))
                    finish()
                } else {
                    val err = response.errorBody()?.string()?.let {
                        try {
                            Gson().fromJson(it, ApiError::class.java).error
                        } catch (_: Exception) {
                            null
                        }
                    } ?: getString(R.string.register_failed)
                    Toast.makeText(this@RegisterActivity, err, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@RegisterActivity, e.message ?: getString(R.string.network_error), Toast.LENGTH_LONG).show()
            } finally {
                binding.btnRegister.isEnabled = true
            }
        }
    }
}