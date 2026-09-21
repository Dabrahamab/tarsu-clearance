package com.tsunu.clearance

import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.tsunu.clearance.databinding.ActivityOlevelBinding
import com.tsunu.clearance.network.ApiClient
import com.tsunu.clearance.network.models.ApiError
import com.tsunu.clearance.network.models.OlevelVerifyRequest
import com.google.gson.Gson
import kotlinx.coroutines.launch
import retrofit2.HttpException

class OlevelActivity : AppCompatActivity() {

    private lateinit var binding: ActivityOlevelBinding
    private val examBodies = arrayOf("WAEC", "NECO", "NABTEB")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityOlevelBinding.inflate(layoutInflater)
        setContentView(binding.root)

        supportActionBar?.title = getString(R.string.olevel_title)
        binding.spinnerExamBody.adapter =
            ArrayAdapter(this, android.R.layout.simple_spinner_item, examBodies)
                .apply { setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item) }

        binding.btnVerify.setOnClickListener { attemptVerify() }
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