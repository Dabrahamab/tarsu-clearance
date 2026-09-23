package com.tsunu.clearance

import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.tsunu.clearance.databinding.ActivityOlevelBinding
import com.tsunu.clearance.network.ApiClient
import com.tsunu.clearance.network.models.ApiError
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
    private var selectedFile: File? = null

    private val pickFile = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
        uri?.let { copyToCache("olevel_${System.currentTimeMillis()}.pdf", it) }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityOlevelBinding.inflate(layoutInflater)
        setContentView(binding.root)

        supportActionBar?.title = getString(R.string.olevel_title)
        binding.spinnerExamBody.adapter =
            ArrayAdapter(this, android.R.layout.simple_spinner_item, examBodies)
                .apply { setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item) }

        binding.btnVerify.setOnClickListener { attemptVerify() }
        binding.btnUpload.setOnClickListener {
            if (selectedFile == null) {
                pickFile.launch(arrayOf("application/pdf", "image/*"))
            } else {
                uploadSelected()
            }
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
            Toast.makeText(this, R.string.olevel_no_file, Toast.LENGTH_SHORT).show()
            return
        }
        val token = SessionManager.token(this)
        if (token == null) {
            Toast.makeText(this, R.string.olevel_login_required, Toast.LENGTH_SHORT).show()
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

    private fun attemptVerify() {
        val body = binding.spinnerExamBody.selectedItem?.toString() ?: ""
        val number = binding.etExamNumber.text?.toString()?.trim().orEmpty()
        val yearText = binding.etExamYear.text?.toString()?.trim().orEmpty()
        val pin = binding.etCardPin.text?.toString()?.trim().orEmpty()
        val token = SessionManager.token(this)

        if (body.isEmpty() || number.isEmpty() || yearText.isEmpty() || pin.isEmpty()) {
            Toast.makeText(this, R.string.field_required, Toast.LENGTH_SHORT).show()
            return
        }
        val year = yearText.toIntOrNull()
        if (year == null || year < 1980 || year > 2026) {
            Toast.makeText(this, R.string.invalid_exam_year, Toast.LENGTH_SHORT).show()
            return
        }
        if (token == null) {
            Toast.makeText(this, R.string.olevel_login_required, Toast.LENGTH_SHORT).show()
            return
        }

        binding.btnVerify.isEnabled = false
        lifecycleScope.launch {
            try {
                val response = ApiClient.api.verifyOlevel(
                    "Bearer $token",
                    OlevelVerifyRequest(
                        examBody = body,
                        examNumber = number,
                        examYear = year,
                        cardPinSerial = pin,
                    ),
                )
                if (response.isSuccessful && response.body() != null) {
                    val data = response.body()!!
                    binding.cardResult.visibility = View.VISIBLE
                    val ok = data.status == "VERIFIED"
                    binding.tvResultStatus.text = data.status
                    binding.tvResultStatus.setTextColor(
                        resources.getColor(
                            if (ok) R.color.success else R.color.error,
                            null,
                        ),
                    )
                    binding.tvResultCandidate.text =
                        getString(R.string.result_candidate, data.candidateName ?: "-")
                    binding.tvResultMessage.text = data.message ?: ""
                    binding.tvSubjects.text = formatSubjects(data)
                } else {
                    val err = parseError(response.code(), response.errorBody()?.string())
                    Toast.makeText(this@OlevelActivity, err, Toast.LENGTH_LONG).show()
                }
            } catch (e: HttpException) {
                Toast.makeText(this@OlevelActivity, parseError(e.code(), e.response()?.errorBody()?.string()), Toast.LENGTH_LONG).show()
            } catch (e: Exception) {
                Toast.makeText(this@OlevelActivity, e.message ?: getString(R.string.network_error), Toast.LENGTH_LONG).show()
            } finally {
                binding.btnVerify.isEnabled = true
            }
        }
    }

    private fun formatSubjects(data: com.tsunu.clearance.network.models.OlevelVerifyResponse): String {
        val subjects = data.subjects
        if (subjects.isNullOrEmpty()) return ""
        return buildString {
            appendLine(getString(R.string.result_subjects_heading))
            subjects.forEach { s ->
                append(s.subject)
                append("  —  ")
                appendLine(s.grade)
            }
        }.trimEnd()
    }

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