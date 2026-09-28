package com.tsunu.clearance

import android.os.Bundle
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.tsunu.clearance.databinding.ActivityAdminDashboardBinding
import com.tsunu.clearance.network.ApiClient
import com.tsunu.clearance.network.models.ApiError
import com.tsunu.clearance.network.models.CatalogCreateRequest
import com.tsunu.clearance.network.models.CreateStaffRequest
import com.tsunu.clearance.network.models.Department
import com.tsunu.clearance.network.models.Faculty
import com.tsunu.clearance.network.models.OlevelStatusUpdateRequest
import com.tsunu.clearance.network.models.OlevelVerificationItem
import com.tsunu.clearance.network.models.ResetPasswordRequest
import com.tsunu.clearance.network.models.StaffMember
import com.tsunu.clearance.network.models.StudentProfile
import com.google.gson.Gson
import kotlinx.coroutines.launch
import retrofit2.HttpException

class AdminDashboardActivity : AppCompatActivity() {

    private lateinit var binding: ActivityAdminDashboardBinding
    private val faculties = mutableListOf<Faculty>()
    private val departments = mutableListOf<Department>()
    private val staffList = mutableListOf<StaffMember>()
    private val students = mutableListOf<StudentProfile>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAdminDashboardBinding.inflate(layoutInflater)
        setContentView(binding.root)

        supportActionBar?.title = getString(R.string.admin_title)
        binding.btnCreateDept.setOnClickListener { createDepartment() }
        binding.btnCreateUnit.setOnClickListener { createUnit() }
        binding.btnLoadRecords.setOnClickListener { loadRecords() }
        binding.btnCreateHod.setOnClickListener { createStaff() }
        binding.btnResetStaffPassword.setOnClickListener { resetStaffPassword() }
        binding.btnSearchStudents.setOnClickListener { searchStudents() }
        binding.btnResetStudentPassword.setOnClickListener { resetStudentPassword() }
        binding.btnLoadStudents.setOnClickListener { loadAllStudents() }

        binding.spinnerHodRole.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_item,
            listOf("HOD", "OFFICER"),
        ).apply { setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item) }

        binding.spinnerAdminFaculty.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                refreshHodDeptSpinner(faculties.getOrNull(position)?.facultyId)
            }

            override fun onNothingSelected(parent: AdapterView<*>?) {
                refreshHodDeptSpinner(null)
            }
        }

        loadFaculties()
        loadStaff()
    }

    private fun token(): String? {
        val t = SessionManager.token(this)
        if (t == null) Toast.makeText(this, R.string.olevel_login_required, Toast.LENGTH_SHORT).show()
        return t
    }

    private fun loadFaculties() {
        lifecycleScope.launch {
            try {
                val r = ApiClient.api.faculties()
                if (r.isSuccessful && r.body() != null) {
                    departments.clear()
                    departments.addAll(r.body()!!.departments)
                    faculties.clear()
                    faculties.addAll(r.body()!!.faculties)
                    binding.spinnerAdminFaculty.adapter = ArrayAdapter(
                        this@AdminDashboardActivity,
                        android.R.layout.simple_spinner_item,
                        faculties.map { it.facultyName },
                    ).apply { setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item) }
                }
            } catch (_: Exception) {
                Toast.makeText(this@AdminDashboardActivity, R.string.faculty_departments_not_loaded, Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun refreshHodDeptSpinner(facultyId: Int?) {
        val depts = departments.filter { it.facultyId == facultyId }
        binding.spinnerHodDept.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_item,
            listOf(getString(R.string.admin_staff_dept_hint)) + depts.map { it.deptName },
        ).apply { setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item) }
    }

    private fun selectedDeptId(): Long? {
        if (spinnerAtHint(binding.spinnerHodDept)) return null
        val facultyId = faculties.getOrNull(binding.spinnerAdminFaculty.selectedItemPosition)?.facultyId
        val name = binding.spinnerHodDept.selectedItem?.toString()
        return departments.firstOrNull { it.facultyId == facultyId && it.deptName == name }?.deptId?.toLong()
    }

    private fun spinnerAtHint(spinner: Spinner): Boolean {
        val first = spinner.adapter?.getItem(0)?.toString()
        return spinner.selectedItem != null && spinner.selectedItem.toString() == first
    }

    private fun createDepartment() {
        val token = token() ?: return
        val name = binding.etDeptName.text?.toString()?.trim().orEmpty()
        val facultyId = faculties.getOrNull(binding.spinnerAdminFaculty.selectedItemPosition)?.facultyId
        if (name.isEmpty() || facultyId == null) {
            Toast.makeText(this, R.string.admin_required, Toast.LENGTH_SHORT).show()
            return
        }
        binding.btnCreateDept.isEnabled = false
        lifecycleScope.launch {
            try {
                val r = ApiClient.api.createCatalog(
                    "Bearer $token",
                    CatalogCreateRequest(
                        kind = "department",
                        facultyId = facultyId,
                        departmentName = name,
                    ),
                )
                if (r.isSuccessful && r.body() != null) {
                    Toast.makeText(this@AdminDashboardActivity, getString(R.string.admin_dept_created, r.body()!!.departmentName ?: name), Toast.LENGTH_SHORT).show()
                    binding.etDeptName.text?.clear()
                } else {
                    Toast.makeText(this@AdminDashboardActivity, parseError(r.code(), r.errorBody()?.string()), Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@AdminDashboardActivity, e.message ?: getString(R.string.network_error), Toast.LENGTH_LONG).show()
            } finally {
                binding.btnCreateDept.isEnabled = true
            }
        }
    }

    private fun createUnit() {
        val token = token() ?: return
        val code = binding.etUnitCode.text?.toString()?.trim().orEmpty()
        val name = binding.etUnitName.text?.toString()?.trim().orEmpty()
        if (code.isEmpty() || name.isEmpty()) {
            Toast.makeText(this, R.string.admin_required, Toast.LENGTH_SHORT).show()
            return
        }
        binding.btnCreateUnit.isEnabled = false
        lifecycleScope.launch {
            try {
                val r = ApiClient.api.createCatalog(
                    "Bearer $token",
                    CatalogCreateRequest(
                        kind = "unit",
                        unitCode = code,
                        unitName = name,
                    ),
                )
                if (r.isSuccessful && r.body() != null) {
                    Toast.makeText(this@AdminDashboardActivity, getString(R.string.admin_unit_created, r.body()!!.unitName ?: name), Toast.LENGTH_SHORT).show()
                    binding.etUnitCode.text?.clear()
                    binding.etUnitName.text?.clear()
                } else {
                    Toast.makeText(this@AdminDashboardActivity, parseError(r.code(), r.errorBody()?.string()), Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@AdminDashboardActivity, e.message ?: getString(R.string.network_error), Toast.LENGTH_LONG).show()
            } finally {
                binding.btnCreateUnit.isEnabled = true
            }
        }
    }

    private fun createStaff() {
        val token = token() ?: return
        val role = binding.spinnerHodRole.selectedItem?.toString() ?: "HOD"
        val fullName = binding.etHodName.text?.toString()?.trim().orEmpty()
        val email = binding.etHodEmail.text?.toString()?.trim().orEmpty()
        val password = binding.etHodPassword.text?.toString().orEmpty()
        val departmentId = if (role == "HOD") selectedDeptId() else null
        if (fullName.isEmpty() || email.isEmpty() || password.length < 8 || (role == "HOD" && departmentId == null)) {
            Toast.makeText(this, R.string.admin_required, Toast.LENGTH_SHORT).show()
            return
        }
        binding.btnCreateHod.isEnabled = false
        lifecycleScope.launch {
            try {
                val r = ApiClient.api.createStaff(
                    "Bearer $token",
                    CreateStaffRequest(role = role, fullName = fullName, email = email, password = password, departmentId = departmentId),
                )
                if (r.isSuccessful && r.body() != null) {
                    Toast.makeText(
                        this@AdminDashboardActivity,
                        getString(R.string.admin_staff_created, r.body()!!.staff?.fullName ?: fullName, role),
                        Toast.LENGTH_SHORT,
                    ).show()
                    binding.etHodName.text?.clear()
                    binding.etHodEmail.text?.clear()
                    binding.etHodPassword.text?.clear()
                    loadStaff()
                } else {
                    Toast.makeText(this@AdminDashboardActivity, parseError(r.code(), r.errorBody()?.string()), Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@AdminDashboardActivity, e.message ?: getString(R.string.network_error), Toast.LENGTH_LONG).show()
            } finally {
                binding.btnCreateHod.isEnabled = true
            }
        }
    }

    private fun loadStaff() {
        val token = token() ?: return
        lifecycleScope.launch {
            try {
                val r = ApiClient.api.listStaff("Bearer $token")
                if (r.isSuccessful && r.body() != null) {
                    staffList.clear()
                    staffList.addAll(r.body()!!.staff)
                    val labels = staffList.map { s ->
                        "${s.fullName} (${s.role} — ${s.deptName ?: "No department"})"
                    }
                    binding.spinnerSelectStaff.adapter = ArrayAdapter(
                        this@AdminDashboardActivity,
                        android.R.layout.simple_spinner_item,
                        if (labels.isEmpty()) listOf(getString(R.string.admin_no_staff)) else labels,
                    ).apply { setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item) }
                } else {
                    Toast.makeText(this@AdminDashboardActivity, parseError(r.code(), r.errorBody()?.string()), Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@AdminDashboardActivity, e.message ?: getString(R.string.network_error), Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun resetStaffPassword() {
        val token = token() ?: return
        val position = binding.spinnerSelectStaff.selectedItemPosition
        val selected = staffList.getOrNull(position)
        val password = binding.etStaffNewPassword.text?.toString().orEmpty()
        if (selected == null || password.length < 8) {
            Toast.makeText(this, R.string.admin_required, Toast.LENGTH_SHORT).show()
            return
        }
        binding.btnResetStaffPassword.isEnabled = false
        lifecycleScope.launch {
            try {
                val r = ApiClient.api.resetStaffPassword("Bearer $token", selected.userId, ResetPasswordRequest(password))
                if (r.isSuccessful && r.body() != null) {
                    Toast.makeText(
                        this@AdminDashboardActivity,
                        getString(R.string.admin_password_reset, selected.fullName),
                        Toast.LENGTH_SHORT,
                    ).show()
                    binding.etStaffNewPassword.text?.clear()
                } else {
                    Toast.makeText(this@AdminDashboardActivity, parseError(r.code(), r.errorBody()?.string()), Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@AdminDashboardActivity, e.message ?: getString(R.string.network_error), Toast.LENGTH_LONG).show()
            } finally {
                binding.btnResetStaffPassword.isEnabled = true
            }
        }
    }

    private fun searchStudents() {
        val token = token() ?: return
        val q = binding.etStudentSearch.text?.toString()?.trim().orEmpty()
        if (q.length < 2) {
            Toast.makeText(this, R.string.admin_student_search_required, Toast.LENGTH_SHORT).show()
            return
        }
        binding.btnSearchStudents.isEnabled = false
        lifecycleScope.launch {
            try {
                val r = ApiClient.api.searchStudents("Bearer $token", q)
                if (r.isSuccessful && r.body() != null) {
                    students.clear()
                    students.addAll(r.body()!!.students)
                    val labels = students.map { s ->
                        "${s.fullName ?: ""} · ${s.matricNo ?: ""} (${s.deptName ?: "?"})"
                    }
                    binding.spinnerSelectStudent.adapter = ArrayAdapter(
                        this@AdminDashboardActivity,
                        android.R.layout.simple_spinner_item,
                        if (labels.isEmpty()) listOf(getString(R.string.admin_no_students)) else labels,
                    ).apply { setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item) }
                } else {
                    Toast.makeText(this@AdminDashboardActivity, parseError(r.code(), r.errorBody()?.string()), Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@AdminDashboardActivity, e.message ?: getString(R.string.network_error), Toast.LENGTH_LONG).show()
            } finally {
                binding.btnSearchStudents.isEnabled = true
            }
        }
    }

    private fun resetStudentPassword() {
        val token = token() ?: return
        val position = binding.spinnerSelectStudent.selectedItemPosition
        val selected = students.getOrNull(position)
        val password = binding.etStudentNewPassword.text?.toString().orEmpty()
        if (selected?.studentId == null || password.length < 8) {
            Toast.makeText(this, R.string.admin_required, Toast.LENGTH_SHORT).show()
            return
        }
        binding.btnResetStudentPassword.isEnabled = false
        lifecycleScope.launch {
            try {
                val r = ApiClient.api.resetStudentPassword("Bearer $token", selected.studentId, ResetPasswordRequest(password))
                if (r.isSuccessful && r.body() != null) {
                    Toast.makeText(
                        this@AdminDashboardActivity,
                        getString(R.string.admin_student_password_reset, selected.fullName ?: "", selected.matricNo ?: ""),
                        Toast.LENGTH_SHORT,
                    ).show()
                    binding.etStudentNewPassword.text?.clear()
                } else {
                    Toast.makeText(this@AdminDashboardActivity, parseError(r.code(), r.errorBody()?.string()), Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@AdminDashboardActivity, e.message ?: getString(R.string.network_error), Toast.LENGTH_LONG).show()
            } finally {
                binding.btnResetStudentPassword.isEnabled = true
            }
        }
    }

    private fun loadAllStudents() {
        val token = token() ?: return
        binding.btnLoadStudents.isEnabled = false
        lifecycleScope.launch {
            try {
                val r = ApiClient.api.students("Bearer $token")
                if (r.isSuccessful && r.body() != null) {
                    renderStudents(r.body()!!.students)
                } else {
                    Toast.makeText(this@AdminDashboardActivity, parseError(r.code(), r.errorBody()?.string()), Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@AdminDashboardActivity, e.message ?: getString(R.string.network_error), Toast.LENGTH_LONG).show()
            } finally {
                binding.btnLoadStudents.isEnabled = true
            }
        }
    }

    private fun renderStudents(items: List<StudentProfile>) {
        binding.containerStudents.removeAllViews()
        if (items.isEmpty()) {
            val tv = TextView(this)
            tv.text = getString(R.string.admin_no_students)
            tv.setTextColor(resources.getColor(R.color.secondary_text, null))
            tv.textSize = 14f
            binding.containerStudents.addView(tv)
            return
        }
        items.forEach { s ->
            val block = TextView(this)
            val pwLine = s.password?.let { getString(R.string.admin_student_pw, it) }
                ?: getString(R.string.admin_student_pw_missing)
            block.text = getString(
                R.string.admin_student_block,
                s.fullName.orEmpty(),
                s.matricNo.orEmpty(),
                s.email.orEmpty(),
                s.deptName ?: "-",
                s.facultyName ?: "-",
                s.level ?: "-",
                pwLine,
            )
            block.setTextColor(resources.getColor(R.color.primary_text, null))
            block.textSize = 14f
            binding.containerStudents.addView(block)
        }
    }

    private fun loadRecords() {
        val token = token() ?: return
        binding.btnLoadRecords.isEnabled = false
        lifecycleScope.launch {
            try {
                val r = ApiClient.api.listVerifications("Bearer $token")
                if (r.isSuccessful && r.body() != null) {
                    renderRecords(r.body()!!.verifications)
                } else {
                    Toast.makeText(this@AdminDashboardActivity, parseError(r.code(), r.errorBody()?.string()), Toast.LENGTH_LONG).show()
                }
            } catch (e: HttpException) {
                Toast.makeText(this@AdminDashboardActivity, parseError(e.code(), e.response()?.errorBody()?.string()), Toast.LENGTH_LONG).show()
            } catch (e: Exception) {
                Toast.makeText(this@AdminDashboardActivity, e.message ?: getString(R.string.network_error), Toast.LENGTH_LONG).show()
            } finally {
                binding.btnLoadRecords.isEnabled = true
            }
        }
    }

    private fun recordLabel(v: OlevelVerificationItem): String {
        val status = v.verificationStatus ?: "PENDING"
        val who = listOfNotNull(v.studentName, v.matricNo).joinToString(" · ")
        return "${v.examBody ?: ""} ${v.examNumber ?: ""} (${v.examYear ?: ""})  —  $status\n$who"
    }

    private fun renderRecords(items: List<OlevelVerificationItem>) {
        binding.containerRecords.removeAllViews()
        if (items.isEmpty()) {
            val tv = TextView(this)
            tv.text = getString(R.string.admin_no_records)
            tv.setTextColor(resources.getColor(R.color.secondary_text, null))
            tv.textSize = 14f
            binding.containerRecords.addView(tv)
            return
        }
        items.forEach { v ->
            val tv = TextView(this)
            tv.text = recordLabel(v)
            tv.setTextColor(
                resources.getColor(
                    when (v.verificationStatus) {
                        "VERIFIED" -> R.color.status_approved
                        "REJECTED" -> R.color.status_rejected
                        else -> R.color.status_pending
                    },
                    null,
                ),
            )
            tv.textSize = 14f
            binding.containerRecords.addView(tv)

            val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
            val markOk = Button(this).apply { text = getString(R.string.admin_mark_verified) }
            val markNo = Button(this).apply { text = getString(R.string.admin_mark_rejected) }
            val delete = Button(this).apply { text = getString(R.string.admin_delete) }
            val vid = v.verifyId
            if (vid == null) return@forEach
            markOk.setOnClickListener { updateRecord(vid, "VERIFIED") }
            markNo.setOnClickListener { updateRecord(vid, "REJECTED") }
            delete.setOnClickListener { deleteRecord(vid) }
            row.addView(markOk)
            row.addView(markNo)
            row.addView(delete)
            binding.containerRecords.addView(row)
        }
    }

    private fun updateRecord(verifyId: Long, status: String) {
        val token = token() ?: return
        lifecycleScope.launch {
            try {
                val r = ApiClient.api.updateVerification("Bearer $token", verifyId, OlevelStatusUpdateRequest(status))
                if (r.isSuccessful) {
                    Toast.makeText(this@AdminDashboardActivity, getString(R.string.admin_updated, status), Toast.LENGTH_SHORT).show()
                    loadRecords()
                } else {
                    Toast.makeText(this@AdminDashboardActivity, parseError(r.code(), r.errorBody()?.string()), Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@AdminDashboardActivity, e.message ?: getString(R.string.network_error), Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun deleteRecord(verifyId: Long) {
        val token = token() ?: return
        lifecycleScope.launch {
            try {
                val r = ApiClient.api.deleteVerification("Bearer $token", verifyId)
                if (r.isSuccessful) {
                    Toast.makeText(this@AdminDashboardActivity, R.string.admin_deleted, Toast.LENGTH_SHORT).show()
                    loadRecords()
                } else {
                    Toast.makeText(this@AdminDashboardActivity, parseError(r.code(), r.errorBody()?.string()), Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@AdminDashboardActivity, e.message ?: getString(R.string.network_error), Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun parseError(code: Int, body: String?): String {
        body?.let {
            return try {
                Gson().fromJson(it, ApiError::class.java).error
            } catch (_: Exception) {
                getString(R.string.network_error)
            }
        }
        return getString(R.string.network_error)
    }
}