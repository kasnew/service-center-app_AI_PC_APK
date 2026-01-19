package com.chipzone.security

import android.content.Context
import android.content.SharedPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PinManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val keystoreManager: KeystoreManager
) {
    
    private val prefs: SharedPreferences = keystoreManager.getEncryptedPreferences("pin_prefs")
    private val PIN_KEY = "pin_hash"
    private val PIN_SET_KEY = "pin_set"
    private val PROTECTION_ENABLED_KEY = "protection_enabled"
    
    /**
     * Check if protection is enabled
     */
    fun isProtectionEnabled(): Boolean {
        return prefs.getBoolean(PROTECTION_ENABLED_KEY, false) // Default: disabled
    }
    
    /**
     * Enable or disable protection
     */
    fun setProtectionEnabled(enabled: Boolean) {
        prefs.edit()
            .putBoolean(PROTECTION_ENABLED_KEY, enabled)
            .apply()
    }
    
    /**
     * Check if PIN is set
     */
    fun isPinSet(): Boolean {
        return prefs.getBoolean(PIN_SET_KEY, false)
    }
    
    /**
     * Set PIN (stores hash)
     */
    fun setPin(pin: String): Boolean {
        return try {
            val hash = hashPin(pin)
            prefs.edit()
                .putString(PIN_KEY, hash)
                .putBoolean(PIN_SET_KEY, true)
                .apply()
            true
        } catch (e: Exception) {
            false
        }
    }
    
    /**
     * Verify PIN
     */
    fun verifyPin(pin: String): Boolean {
        val storedHash = prefs.getString(PIN_KEY, null) ?: return false
        val inputHash = hashPin(pin)
        return storedHash == inputHash
    }
    
    /**
     * Change PIN
     */
    fun changePin(oldPin: String, newPin: String): Boolean {
        if (!verifyPin(oldPin)) {
            return false
        }
        return setPin(newPin)
    }
    
    /**
     * Simple hash function (in production, use proper hashing like bcrypt)
     */
    private fun hashPin(pin: String): String {
        // Simple hash - in production use proper hashing
        return pin.hashCode().toString()
    }
}

