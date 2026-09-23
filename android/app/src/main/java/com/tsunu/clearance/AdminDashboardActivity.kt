package com.tsunu.clearance

import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.tsunu.clearance.databinding.ActivityAdminDashboardBinding
import com.tsunu.clearance.network.ApiClient
import com.tsunu.clearance.network.models.ApiError
import com.tsunu.clearance.network.models.CatalogCreateRequest
import com.tsunu.clearance.network.models.Faculty
import com.tsunu.clearance.network.models.OlevelStatusUpdateRequest
import com.tsunu.clearance.network.models.OlevelVerificationItem
import com.google.gson.Gson
import kotlinx.coroutines.launch
import retrofit2.HttpException

class AdminDashboardActivity : AppCompatActivity() {

    private lateinit var binding: ActivityAdminDashboardBinding
    private val faculties = mutableListOf<Faculty>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAdminDashboardBinding.inflate(layoutInflater)
        setContentView(binding.root)

        supportActionBar?.title = getString(R.string.admin_title)
        binding.btnCreateDept.setOnClickListener { createDepartment() }
        binding.btnCreateUnit.setOnClickListener { createUnit() }
        binding.btnLoadRecords.setOnClickListener { loadRecords() }

        loadFaculties()
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