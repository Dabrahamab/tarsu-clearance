package com.tsunu.clearance

import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.tsunu.clearance.databinding.ActivityProgressBinding
import com.tsunu.clearance.network.ApiClient
import com.tsunu.clearance.network.models.ApiError
import com.tsunu.clearance.network.models.ApprovalItem
import com.tsunu.clearance.network.models.MyProgressResponse
import com.google.gson.Gson
import kotlinx.coroutines.launch
import retrofit2.HttpException

class ProgressActivity : AppCompatActivity() {

    private lateinit var binding: ActivityProgressBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityProgressBinding.inflate(layoutInflater)
        setContentView(binding.root)

        supportActionBar?.title = getString(R.string.progress_title)
        binding.btnStartClearance.setOnClickListener { loadProgress(apply = true) }
        binding.btnRefresh.setOnClickListener { loadProgress(apply = false) }
        loadProgress(apply = false)
    }

    private fun loadProgress(apply: Boolean) {
        val token = SessionManager.token(this)
        if (token == null) {
            Toast.makeText(this, R.string.olevel_login_required, Toast.LENGTH_SHORT).show()
            return
        }
        binding.btnRefresh.isEnabled = false
        binding.btnStartClearance.isEnabled = false
        lifecycleScope.launch {
            try {
                val response = if (apply) {
                    ApiClient.api.applyClearance("Bearer $token")
                } else {
                    ApiClient.api.myProgress("Bearer $token")
                }
                if (response.isSuccessful && response.body() != null) {
                    render(response.body()!!)
                } else if (response.code() == 404) {
                    binding.btnStartClearance.visibility = View.VISIBLE
                    binding.containerLog.removeAllViews()
                    addRow(getString(R.string.progress_not_started))
                } else {
                    val err = parseError(response.code(), response.errorBody()?.string())
                    Toast.makeText(this@ProgressActivity, err, Toast.LENGTH_LONG).show()
                }
            } catch (e: HttpException) {
                Toast.makeText(this@ProgressActivity, parseError(e.code(), e.response()?.errorBody()?.string()), Toast.LENGTH_LONG).show()
            } catch (e: Exception) {
                Toast.makeText(this@ProgressActivity, e.message ?: getString(R.string.network_error), Toast.LENGTH_LONG).show()
            } finally {
                binding.btnRefresh.isEnabled = true
                binding.btnStartClearance.isEnabled = true
            }
        }
    }

    private fun render(data: MyProgressResponse) {
        binding.btnStartClearance.visibility = View.GONE

        val hasClearance = data.clearance != null
        binding.tvRef.text = if (hasClearance) {
            getString(R.string.progress_ref, data.clearance?.clearanceRef ?: "-")
        } else {
            getString(R.string.progress_not_started)
        }

        binding.containerLog.removeAllViews()
        data.approvals.forEach { addApprovalRow(it) }
        if (data.approvals.isEmpty()) addRow(getString(R.string.progress_no_approvals))

        binding.containerOlevel.removeAllViews()
        if (data.olevel.isEmpty()) {
            addOlevelRow(getString(R.string.olevel_no_entries), resources.getColor(R.color.secondary_text, null))
        } else {
            data.olevel.forEach { v ->
                val status = v.verificationStatus ?: "PENDING"
                val label = when (status) {
                    "VERIFIED" -> getString(R.string.olevel_status_verified)
                    "REJECTED" -> getString(R.string.olevel_status_rejected)
                    else -> getString(R.string.olevel_status_pending_upload)
                }
                val text = "${v.examBody ?: ""} ${v.examNumber ?: ""} (${v.examYear ?: ""})  —  $label"
                addOlevelRow(text, statusColor(status))
            }
        }

        val docs = data.documents
        binding.tvDocuments.text = if (docs.isEmpty()) {
            getString(R.string.progress_no_documents)
        } else {
            docs.mapIndexed { i, d -> "${i + 1}. ${d.filePath ?: d.docType ?: "-"} (${d.uploadedAt ?: ""})" }
                .joinToString("\n")
        }
    }

    private fun addApprovalRow(a: ApprovalItem) {
        val status = a.status ?: "PENDING"
        val unit = when {
            !a.unitName.isNullOrBlank() -> a.unitName
            !a.unitCode.isNullOrBlank() -> a.unitCode
            else -> "Unit ${a.unitId}"
        }
        val line = "$unit  —  ${statusLabel(status)}" +
            (if (!a.remarks.isNullOrBlank()) "\n    ${a.remarks}" else "")
        val tv = addRow(line)
        tv.setTextColor(approvalColor(status))
    }

    private fun statusLabel(status: String): String = when (status) {
        "APPROVED" -> getString(R.string.olevel_status_verified)
        "REJECTED" -> getString(R.string.olevel_status_failed)
        "ACTION_REQUIRED" -> getString(R.string.dashboard_action_required)
        "BOOK_OVERDUE" -> getString(R.string.dashboard_book_overdue)
        else -> getString(R.string.olevel_status_pending_upload)
    }

    private fun approvalColor(status: String): Int = when (status) {
        "APPROVED" -> resources.getColor(R.color.status_approved, null)
        "REJECTED" -> resources.getColor(R.color.status_rejected, null)
        "ACTION_REQUIRED" -> resources.getColor(R.color.status_action_required, null)
        "BOOK_OVERDUE" -> resources.getColor(R.color.status_book_overdue, null)
        else -> resources.getColor(R.color.status_pending, null)
    }

    private fun statusColor(status: String): Int = when (status) {
        "VERIFIED" -> resources.getColor(R.color.status_approved, null)
        "REJECTED" -> resources.getColor(R.color.status_rejected, null)
        else -> resources.getColor(R.color.status_pending, null)
    }

    private fun addRow(text: String): TextView {
        val tv = TextView(this)
        tv.text = text
        tv.setTextColor(resources.getColor(R.color.secondary_text, null))
        tv.textSize = 14f
        val lp = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT,
        )
        lp.setMargins(0, 0, 0, 8)
        tv.layoutParams = lp
        binding.containerLog.addView(tv)
        return tv
    }

    private fun addOlevelRow(text: String, color: Int): TextView {
        val tv = TextView(this)
        tv.text = text
        tv.setTextColor(color)
        tv.textSize = 14f
        val lp = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT,
        )
        lp.setMargins(0, 0, 0, 6)
        tv.layoutParams = lp
        binding.containerOlevel.addView(tv)
        return tv
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