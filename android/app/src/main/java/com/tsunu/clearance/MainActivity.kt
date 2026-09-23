package com.tsunu.clearance

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import com.tsunu.clearance.auth.LoginActivity
import com.tsunu.clearance.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        supportActionBar?.title = getString(R.string.app_name)
        val name = SessionManager.fullName(this) ?: getString(R.string.placeholder_name)
        binding.tvWelcome.text = getString(R.string.welcome_user, name)

        binding.btnLogout.setOnClickListener {
            SessionManager.clear(this)
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }

        binding.btnVerifyOlevel.setOnClickListener {
            startActivity(Intent(this, OlevelActivity::class.java))
        }

        binding.btnProgress.setOnClickListener {
            startActivity(Intent(this, ProgressActivity::class.java))
        }

        binding.btnOfficialDashboard.setOnClickListener {
            startActivity(Intent(this, OfficerDashboardActivity::class.java))
        }

        binding.btnAdminDashboard.setOnClickListener {
            startActivity(Intent(this, AdminDashboardActivity::class.java))
        }

        val role = SessionManager.role(this)
        val isStudent = role == "STUDENT"
        val isStaff = role == "OFFICER" || role == "HOD" || role == "ADMIN"
        val isAdmin = role == "ADMIN"

        binding.btnVerifyOlevel.visibility = if (isStudent) View.VISIBLE else View.GONE
        binding.btnProgress.visibility = if (isStudent) View.VISIBLE else View.GONE
        binding.btnOfficialDashboard.visibility = if (isStaff) View.VISIBLE else View.GONE
        binding.btnAdminDashboard.visibility = if (isAdmin) View.VISIBLE else View.GONE
    }
}