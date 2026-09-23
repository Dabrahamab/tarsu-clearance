package com.tsunu.clearance

import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.tsunu.clearance.databinding.ActivityOlevelBinding
import com.tsunu.clearance.network.ApiClient
import com.tsunu.clearance.network.models.ApiError
import com.tsunu.clearance.network.models.OlevelSubject
import com.tsunu.clearance.network.models.OlevelVerificationItem
import com.tsunu.clearance.network.models.OlevelVerifyRequest
import com.google.gson.Gson
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.HttpException
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream

class OlevelActivity : AppCompatActivity() {

    private lateinit var binding: ActivityOlevelBinding
    private val examBodies = arrayOf("WAEC", "NECO", "NABTEB")
    private val seriesOptions = arrayOf("FIRST", "SECOND")
    private val grades = arrayOf("A1", "B2", "B3", "C4", "C5", "C6", "D7", "E8", "F9")
    private val MIN_SUBJECTS = 6
    private val MAX_SUBJECTS = 9
    private var selectedFile: File? = null

    private val pickFile = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
        uri?.let { copyToCache("olevel_${System.currentTimeMillis()}.pdf", it) }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityOlevelBinding.inflate(layoutInflater)
        setContentView(binding.root)

        supportActionBar?.title = getString(R.string.olevel_title)
        binding.spinnerExamBody.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, examBodies)
            .apply { setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item) }
        binding.spinnerSeries.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_item,
            arrayOf(getString(R.string.olevel_series_first), getString(R.string.olevel_series_second)),
        ).apply { setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item) }

        repeat(MIN_SUBJECTS) { addSubjectRow() }

        binding.btnVerify.setOnClickListener { showPreview() }
        binding.btnAddSubject.setOnClickListener { if (subjectRowCount() < MAX_SUBJECTS) addSubjectRow() else toast(R.string.olevel_too_few_subjects) }
        binding.btnSubmit.setOnClickListener { submitEntry() }
        binding.btnBackToEdit.setOnClickListener {
            binding.cardPreview.visibility = View.GONE
            binding.cardResult.visibility = View.GONE
        }
        binding.btnUpload.setOnClickListener {
            if (selectedFile == null) {
                pickFile.launch(arrayOf("application/pdf", "image/*"))
            } else {
                uploadSelected()
            }
        }

        loadMyEntries()
    }

    private fun subjectRowCount(): Int = binding.containerSubjects.childCount

    private fun addSubjectRow() {
        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        val index = subjectRowCount()

        val nameInput = EditText(this).apply {
            hint = getString(R.string.olevel_subject_name_hint, index + 1)
            setSingleLine(true)
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        }
        val gradeSpinner = Spinner(this).apply {
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        }
        gradeSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, grades)
            .apply { setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item) }

        row.addView(nameInput)
        row.addView(gradeSpinner)
        binding.containerSubjects.addView(row)
        refreshSubjectLabel()
    }

    private fun refreshSubjectLabel() {
        binding.tvSubjectCount.text = getString(R.string.olevel_subjects_label, subjectRowCount(), MAX_SUBJECTS)
    }

    private fun toast(resId: Int) {
        Toast.makeText(this, getString(resId), Toast.LENGTH_SHORT).show()
    }

    private fun collectSubjects(): List<OlevelSubject>? {
        val out = mutableListOf<OlevelSubject>()
        for (i in 0 until subjectRowCount()) {
            val row = binding.containerSubjects.getChildAt(i) as LinearLayout
            val name = (row.getChildAt(0) as EditText).text?.toString()?.trim().orEmpty()
            val grade = (row.getChildAt(1) as Spinner).selectedItem?.toString() ?: ""
            if (name.isEmpty() || grade.isEmpty()) return null
            out.add(OlevelSubject(subject = name, grade = grade))
        }
        return out
    }

    private fun showPreview() {
        val subjects = collectSubjects() ?: run {
            toast(R.string.olevel_empty_subject)
            return
        }
        if (subjects.size < MIN_SUBJECTS) { toast(R.string.olevel_too_few_subjects); return }

        val body = binding.spinnerExamBody.selectedItem?.toString() ?: ""
        val number = binding.etExamNumber.text?.toString()?.trim().orEmpty()
        val yearText = binding.etExamYear.text?.toString()?.trim().orEmpty()
        val pin = binding.etCardPin.text?.toString()?.trim().orEmpty()
        val serial = binding.etCardSerial.text?.toString()?.trim().orEmpty()
        val series = (binding.spinnerSeries.selectedItemPosition.takeIf { it == 1 } ?: 0).let { if (it == 1) "SECOND" else "FIRST" }

        if (body.isEmpty() || number.isEmpty() || yearText.isEmpty() || pin.isEmpty() || serial.isEmpty()) {
            toast(R.string.field_required); return
        }
        val year = yearText.toIntOrNull()
        if (year == null || year < 1980 || year > 2026) { toast(R.string.invalid_exam_year); return }

        val sb = StringBuilder()
        sb.appendLine(getString(R.string.olevel_preview_series, body, year ?: 0))
        sb.appendLine(number)
        sb.appendLine(getString(R.string.olevel_preview_pin_serial, pin, serial))
        sb.appendLine(getString(R.string.olevel_series_label, series))
        sb.appendLine()
        sb.appendLine(getString(R.string.result_subjects_heading))
        subjects.forEachIndexed { i, s -> sb.appendLine("${i + 1}. ${s.subject}  —  ${s.grade}") }
        sb.appendLine()
        sb.appendLine("Total: ${subjects.size}")
        binding.tvPreviewText.text = sb.toString().trimEnd()
        binding.tvPreviewMessage.text = getString(R.string.olevel_back_to_edit)
        binding.cardPreview.visibility = View.VISIBLE
        binding.cardResult.visibility = View.GONE
    }

    private fun submitEntry() {
        val token = SessionManager.token(this)
        if (token == null) { toast(R.string.olevel_login_required); return }
        val subjects = collectSubjects() ?: return
        if (subjects.size < MIN_SUBJECTS) { toast(R.string.olevel_too_few_subjects); return }

        val body = binding.spinnerExamBody.selectedItem?.toString() ?: ""
        val number = binding.etExamNumber.text?.toString()?.trim().orEmpty()
        val yearText = binding.etExamYear.text?.toString()?.trim().orEmpty()
        val pin = binding.etCardPin.text?.toString()?.trim().orEmpty()
        val serial = binding.etCardSerial.text?.toString()?.trim().orEmpty()
        val series = if (binding.spinnerSeries.selectedItemPosition == 1) "SECOND" else "FIRST"
        val year = yearText.toIntOrNull() ?: return

        binding.btnSubmit.isEnabled = false
        lifecycleScope.launch {
            try {
                val response = ApiClient.api.verifyOlevel(
                    "Bearer $token",
                    OlevelVerifyRequest(
                        examBody = body,
                        examSeries = series,
                        examNumber = number,
                        examYear = year,
                        cardPin = pin,
                        cardSerial = serial,
                        subjects = subjects,
                    ),
                )
                if (response.isSuccessful && response.body() != null) {
                    val data = response.body()!!
                    binding.cardPreview.visibility = View.GONE
                    val statusText = friendlyStatus(data.status)
                    binding.tvResultStatus.text = getString(R.string.olevel_result_status, statusText)
                    binding.tvResultStatus.setTextColor(statusColor(data.status))
                    binding.tvResultCandidate.text = getString(R.string.result_candidate, data.candidateName ?: "-")
                    binding.tvResultMessage.text = data.message ?: ""
                    binding.tvSubjects.text = formatPreview(data.preview?.subjects ?: emptyList(), data.preview?.totalSubjects)
                    binding.cardResult.visibility = View.VISIBLE
                    loadMyEntries()
                } else {
                    val err = parseError(response.code(), response.errorBody()?.string())
                    Toast.makeText(this@OlevelActivity, err, Toast.LENGTH_LONG).show()
                }
            } catch (e: HttpException) {
                Toast.makeText(this@OlevelActivity, parseError(e.code(), e.response()?.errorBody()?.string()), Toast.LENGTH_LONG).show()
            } catch (e: Exception) {
                Toast.makeText(this@OlevelActivity, e.message ?: getString(R.string.network_error), Toast.LENGTH_LONG).show()
            } finally {
                binding.btnSubmit.isEnabled = true
            }
        }
    }

    private fun friendlyStatus(status: String?): String = when (status) {
        "VERIFIED" -> getString(R.string.olevel_status_verified)
        "REJECTED" -> getString(R.string.olevel_status_rejected)
        else -> getString(R.string.olevel_status_pending_upload)
    }

    private fun statusColor(status: String?): Int = when (status) {
        "VERIFIED" -> resources.getColor(R.color.status_completed, null)
        "REJECTED" -> resources.getColor(R.color.status_failed, null)
        else -> resources.getColor(R.color.status_pending, null)
    }

    private fun formatPreview(subjects: List<OlevelSubject>, total: Int?): String {
        if (subjects.isEmpty()) return ""
        return buildString {
            appendLine(getString(R.string.result_subjects_heading))
            subjects.forEach { s ->
                append(s.subject); append("  —  "); appendLine(s.grade)
            }
            appendLine("Total: ${total ?: subjects.size}")
        }.trimEnd()
    }

    private fun loadMyEntries() {
        val token = SessionManager.token(this) ?: return
        lifecycleScope.launch {
            try {
                val response = ApiClient.api.myOlevel("Bearer $token")
                if (response.isSuccessful && response.body() != null) {
                    val items = response.body()!!.verifications
                    renderEntries(items)
                }
            } catch (_: Exception) { }
        }
    }

    private fun renderEntries(items: List<OlevelVerificationItem>) {
        binding.containerEntries.removeAllViews()
        if (items.isEmpty()) {
            val tv = TextView(this)
            tv.text = getString(R.string.olevel_no_entries)
            tv.setTextColor(resources.getColor(R.color.secondary_text, null))
            tv.textSize = 13f
            binding.containerEntries.addView(tv)
            return
        }
        items.forEach { item ->
            val tv = TextView(this)
            val status = item.verificationStatus ?: "PENDING"
            val label = "${item.examBody ?: ""} ${item.examNumber ?: ""} (${item.examYear ?: ""})"
            tv.text = "${label}  —  ${friendlyStatus(status)}\n" +
                "${item.candidateName ?: ""} · ${item.createdAt ?: ""}"
            tv.setTextColor(statusColor(status))
            tv.textSize = 14f
            tv.setPadding(0, dp(2), 0, dp(2))
            binding.containerEntries.addView(tv)
        }
    }

    private fun copyToCache(displayName: String, uri: Uri) {
        try {
            val file = File(cacheDir, displayName)
            val input: InputStream? = contentResolver.openInputStream(uri)
            input?.use { ins ->
                FileOutputStream(file).use { outs -> ins.copyTo(outs) }
            }
            selectedFile = file
            binding.tvUploadState.text = getString(R.string.olevel_file_ready, displayName)
            binding.btnUpload.text = getString(R.string.olevel_upload_now)
        } catch (e: Exception) {
            Toast.makeText(this, e.message ?: getString(R.string.olevel_upload_failed), Toast.LENGTH_LONG).show()
        }
    }

    private fun uploadSelected() {
        val file = selectedFile ?: run {
            toast(R.string.olevel_no_file)
            return
        }
        val token = SessionManager.token(this)
        if (token == null) {
            toast(R.string.olevel_login_required)
            return
        }

        binding.btnUpload.isEnabled = false
        binding.tvUploadState.text = getString(R.string.olevel_uploading)
        val mime = "application/pdf".toMediaType()
        val part = MultipartBody.Part.createFormData("file", file.name, file.asRequestBody(mime))
        val docType = "OLEVEL".toRequestBody("text/plain".toMediaType())

        lifecycleScope.launch {
            try {
                val response = ApiClient.api.uploadDocument("Bearer $token", part, docType)
                if (response.isSuccessful && response.body() != null) {
                    binding.tvUploadState.text = getString(R.string.olevel_upload_done)
                    Toast.makeText(this@OlevelActivity, R.string.olevel_upload_done, Toast.LENGTH_SHORT).show()
                } else {
                    val err = parseError(response.code(), response.errorBody()?.string())
                    binding.tvUploadState.text = err
                }
            } catch (e: Exception) {
                binding.tvUploadState.text = e.message ?: getString(R.string.network_error)
            } finally {
                binding.btnUpload.isEnabled = true
            }
        }
    }

    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()

    private fun parseError(code: Int, body: String?): String {
        body?.let {
            return try {
                Gson().fromJson(it, ApiError::class.java).error
            } catch (_: Exception) {
                getString(R.string.olevel_verify_failed)
            }
        }
        return if (code == 409) getString(R.string.olevel_duplicate) else getString(R.string.olevel_verify_failed)
    }
}