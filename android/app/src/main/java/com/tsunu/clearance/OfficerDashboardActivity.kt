package com.tsunu.clearance

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.tsunu.clearance.databinding.ActivityOfficerDashboardBinding
import com.tsunu.clearance.network.ApiClient
import com.tsunu.clearance.network.models.ApiError
import com.tsunu.clearance.network.models.ApprovalItem
import com.tsunu.clearance.network.models.ClearanceDetailResponse
import com.tsunu.clearance.network.models.ClearanceListResponse
import com.tsunu.clearance.network.models.ClearanceSummary
import com.tsunu.clearance.network.models.StudentsResponse
import com.google.gson.Gson
import kotlinx.coroutines.launch
import retrofit2.HttpException

class OfficerDashboardActivity : AppCompatActivity() {

    private lateinit var binding: ActivityOfficerDashboardBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityOfficerDashboardBinding.inflate(layoutInflater)
        setContentView(binding.root)

        supportActionBar?.title = getString(R.string.dashboard_title)
        binding.btnSearch.setOnClickListener { searchStudents() }
        binding.btnLoadAll.setOnClickListener { loadAll() }
        binding.etSearch.setOnEditorActionListener { _, _, _ -> searchStudents(); true }
    }

    private fun token(): String? {
        val t = SessionManager.token(this)
        if (t == null) Toast.makeText(this, R.string.olevel_login_required, Toast.LENGTH_SHORT).show()
        return t
    }

    private fun searchStudents() {
        val q = binding.etSearch.text?.toString()?.trim().orEmpty()
        if (q.isEmpty()) {
            Toast.makeText(this, R.string.dashboard_search_required, Toast.LENGTH_SHORT).show()
            return
        }
        val token = token() ?: return
        binding.btnSearch.isEnabled = false
        lifecycleScope.launch {
            try {
                val r = ApiClient.api.searchStudents("Bearer $token", q)
                if (r.isSuccessful && r.body() != null) {
                    renderStudents(r.body()!!)
                } else {
                    Toast.makeText(this@OfficerDashboardActivity, parseError(r.code(), r.errorBody()?.string()), Toast.LENGTH_LONG).show()
                }
            } catch (e: HttpException) {
                Toast.makeText(this@OfficerDashboardActivity, parseError(e.code(), e.response()?.errorBody()?.string()), Toast.LENGTH_LONG).show()
            } catch (e: Exception) {
                Toast.makeText(this@OfficerDashboardActivity, e.message ?: getString(R.string.network_error), Toast.LENGTH_LONG).show()
            } finally {
                binding.btnSearch.isEnabled = true
            }
        }
    }

    private fun renderStudents(data: StudentsResponse) {
        binding.containerResults.removeAllViews()
        if (data.students.isEmpty()) {
            addText(getString(R.string.dashboard_no_students))
            return
        }
        data.students.forEach { s ->
            val card = clearanceCard()
            addTitle(card, "${s.fullName}\n(${s.matricNo})  —  ${s.deptName ?: "-"} · ${s.level ?: "-"}")
            addText(card, "", "student #${s.studentId}")
            val view = card.root
            view.setOnClickListener { openStudentClearance(s.studentId ?: -1L, s.fullName ?: "Student") }
            binding.containerResults.addView(view)
        }
    }

    private fun openStudentClearance(studentId: Long, name: String) {
        val token = token() ?: return
        lifecycleScope.launch {
            try {
                val r = ApiClient.api.allClearances("Bearer $token")
                if (r.isSuccessful && r.body() != null) {
                    val match = r.body()!!.clearances.firstOrNull { it.studentId == studentId }
                    binding.containerResults.removeAllViews()
                    if (match == null) {
                        addText(getString(R.string.dashboard_no_clearance_for, name))
                    } else {
                        addClearanceCard(match)
                    }
                } else {
                    Toast.makeText(this@OfficerDashboardActivity, parseError(r.code(), r.errorBody()?.string()), Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@OfficerDashboardActivity, e.message ?: getString(R.string.network_error), Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun loadAll() {
        val token = token() ?: return
        binding.btnLoadAll.isEnabled = false
        lifecycleScope.launch {
            try {
                val r = ApiClient.api.allClearances("Bearer $token")
                if (r.isSuccessful && r.body() != null) {
                    renderClearances(r.body()!!)
                } else {
                    Toast.makeText(this@OfficerDashboardActivity, parseError(r.code(), r.errorBody()?.string()), Toast.LENGTH_LONG).show()
                }
            } catch (e: HttpException) {
                Toast.makeText(this@OfficerDashboardActivity, parseError(e.code(), e.response()?.errorBody()?.string()), Toast.LENGTH_LONG).show()
            } catch (e: Exception) {
                Toast.makeText(this@OfficerDashboardActivity, e.message ?: getString(R.string.network_error), Toast.LENGTH_LONG).show()
            } finally {
                binding.btnLoadAll.isEnabled = true
            }
        }
    }

    private fun renderClearances(data: ClearanceListResponse) {
        binding.containerResults.removeAllViews()
        if (data.clearances.isEmpty()) {
            addText(getString(R.string.dashboard_clearances_empty))
            return
        }
        data.clearances.forEach { c -> addClearanceCard(c) }
    }

    private fun addClearanceCard(c: ClearanceSummary) {
        val card = clearanceCard()
        addTitle(card, "${c.studentName ?: "Student ${c.studentId}"}  (${c.matricNo ?: "-"})\n" +
            "${c.departmentName ?: "-"} · status: ${c.overallStatus ?: "?"}")
        addText(card, "", "Ref ${c.clearanceRef ?: ""}, submitted ${c.submittedAt ?: ""}")
        (c.approvals ?: emptyList()).forEach { a ->
            addApprovalRow(card, c.clearanceId ?: 0, a)
        }
        binding.containerResults.addView(card.root)
    }

    private fun addApprovalRow(card: ClearanceCard, clearanceId: Long, a: ApprovalItem) {
        val line = "${a.deptName ?: "Dept ${a.deptId}"}  —  ${a.status ?: "PENDING"}" +
            (if (!a.remarks.isNullOrBlank()) "  (${a.remarks})" else "")
        addText(card, line, "")
        if (a.status == "PENDING" && (a.deptId != null)) {
            val ok = Button(this).apply { text = getString(R.string.dashboard_approve) }
            val no = Button(this).apply { text = getString(R.string.dashboard_reject) }
            ok.setOnClickListener { stamp(clearanceId, a.deptId, "APPROVED", null) }
            no.setOnClickListener { stamp(clearanceId, a.deptId, "REJECTED", getString(R.string.dashboard_default_reject_note)) }
            card.container.addView(ok)
            card.container.addView(no)
        }
    }

    private fun stamp(clearanceId: Long, deptId: Long, status: String, remarks: String?) {
        val token = token() ?: return
        lifecycleScope.launch {
            try {
                val r = ApiClient.api.stampApproval("Bearer $token", clearanceId, deptId, com.tsunu.clearance.network.models.StampRequest(status, remarks))
                if (r.isSuccessful) {
                    Toast.makeText(this@OfficerDashboardActivity, getString(R.string.dashboard_stamped, status), Toast.LENGTH_SHORT).show()
                    loadAll()
                } else {
                    Toast.makeText(this@OfficerDashboardActivity, parseError(r.code(), r.errorBody()?.string()), Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@OfficerDashboardActivity, e.message ?: getString(R.string.network_error), Toast.LENGTH_LONG).show()
            }
        }
    }

    // --- small helper card builder -------------------------------------------------
    private class ClearanceCard(val root: LinearLayout, val main: TextView, val container: LinearLayout)

    private fun clearanceCard(): ClearanceCard {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(4), dp(12), dp(4), dp(12))
        }
        val divider = View(this).apply { minimumHeight = dp(1); setBackgroundColor(resources.getColor(R.color.secondary_text, null)) }
        val main = TextView(this)
        val container = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(main)
        root.addView(container)
        root.addView(divider)
        return ClearanceCard(root, main, container)
    }

    private fun addTitle(card: ClearanceCard, text: String) {
        card.main.text = text
        card.main.setTextColor(resources.getColor(R.color.primary_text, null))
        card.main.textSize = 15f
        card.main.setTypeface(card.main.typeface, android.graphics.Typeface.BOLD)
        card.main.setPadding(0, 0, 0, dp(6))
    }

    private fun addText(card: ClearanceCard, text: String, sub: String = "") {
        val tv = TextView(this)
        tv.text = if (sub.isEmpty()) text else "$text  $sub"
        tv.setTextColor(resources.getColor(R.color.secondary_text, null))
        tv.textSize = 13f
        tv.setPadding(0, dp(2), 0, dp(2))
        card.container.addView(tv)
    }

    private fun addText(text: String) {
        val tv = TextView(this)
        tv.text = text
        tv.setTextColor(resources.getColor(R.color.secondary_text, null))
        tv.textSize = 14f
        binding.containerResults.addView(tv)
    }

    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()

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