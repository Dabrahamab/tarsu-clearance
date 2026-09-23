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
import com.tsunu.clearance.network.models.Faculty
import com.tsunu.clearance.network.models.RegisterRequest
import com.google.gson.Gson
import kotlinx.coroutines.launch

class RegisterActivity : AppCompatActivity() {

    private lateinit var binding: ActivityRegisterBinding
    private val faculties = mutableListOf<Faculty>()
    private val allDepartments = mutableListOf<Department>()
    private var selectedFacultyId: Int? = null

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
        loadCatalog()
    }

    private fun loadCatalog() {
        lifecycleScope.launch {
            try {
                val response = ApiClient.api.faculties()
                if (response.isSuccessful && response.body() != null) {
                    val body = response.body()!!
                    faculties.clear()
                    faculties.addAll(body.faculties)
                    allDepartments.clear()
                    allDepartments.addAll(body.departments)

                    binding.spinnerFaculty.adapter = ArrayAdapter(
                        this@RegisterActivity,
                        android.R.layout.simple_spinner_item,
                        faculties.map { it.facultyName },
                    ).apply {
                        setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
                    }
                    binding.spinnerFaculty.onItemSelectedListener = object : android.widget.AdapterView.OnItemSelectedListener {
                        override fun onItemSelected(
                            parent: android.widget.AdapterView<*>?,
                            view: android.view.View?,
                            position: Int,
                            id: Long,
                        ) {
                            selectedFacultyId = faculties.getOrNull(position)?.facultyId
                            rebindDepartments()
                        }

                        override fun onNothingSelected(parent: android.widget.AdapterView<*>?) = Unit
                    }
                } else {
                    Toast.makeText(this@RegisterActivity, R.string.faculty_departments_not_loaded, Toast.LENGTH_LONG).show()
                }
            } catch (_: Exception) {
                Toast.makeText(this@RegisterActivity, R.string.faculty_departments_not_loaded, Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun rebindDepartments() {
        val facultyId = selectedFacultyId
        val departments = if (facultyId == null) {
            emptyList<Department>()
        } else {
            allDepartments.filter { it.facultyId == facultyId }
        }
        binding.spinnerDepartment.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_item,
            departments.map { it.deptName },
        ).apply {
            setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        }
        selectedDepartmentId = departments.getOrNull(0)?.deptId
        boundDepartments = departments
    }

    private var boundDepartments: List<Department> = emptyList()
    private var selectedDepartmentId: Int? = null

    private fun attemptRegister() {
        val fullName = binding.etFullName.text?.toString()?.trim().orEmpty()
        val matricNo = binding.etMatric.text?.toString()?.trim().orEmpty()
        val email = binding.etEmail.text?.toString()?.trim().orEmpty()
        val password = binding.etPassword.text?.toString()
        val confirm = binding.etConfirmPassword.text?.toString()
        val facultyId = selectedFacultyId
        val deptId = if (binding.spinnerDepartment.adapter != null && binding.spinnerDepartment.adapter!!.count > 0) {
            boundDepartments.getOrNull(binding.spinnerDepartment.selectedItemPosition)?.deptId
                ?: selectedDepartmentId
        } else {
            null
        }

        if (fullName.isEmpty() || matricNo.isEmpty() || email.isEmpty() || facultyId == null || deptId == null) {
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

        binding.btnRegister.isEnabled = false
        lifecycleScope.launch {
            try {
                val response = ApiClient.api.register(
                    RegisterRequest(
                        matricNo = matricNo,
                        fullName = fullName,
                        email = email,
                        facultyId = facultyId,
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