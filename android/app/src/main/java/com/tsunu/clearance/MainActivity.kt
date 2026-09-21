package com.tsunu.clearance

import android.content.Intent
import android.os.Bundle
import android.widget.TextView
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

        // Sprint 3: replace placeholder with the live clearance status tracker,
        // O'Level verification status, and document uploads.
        val statusHint = findViewById<TextView>(R.id.tvStatusPlaceholder)
        statusHint.text = getString(R.string.status_placeholder)
    }
}