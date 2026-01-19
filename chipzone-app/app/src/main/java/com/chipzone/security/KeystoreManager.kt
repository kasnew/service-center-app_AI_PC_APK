package com.chipzone.security

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import java.security.SecureRandom
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

class KeystoreManager(private val context: Context) {
    
    private val prefsKey = "db_encryption_key"
    private val prefsFileName = "chipzone_keystore"
    
    /**
     * Get or create encryption key for SQLCipher database
     * The key is stored in EncryptedSharedPreferences
     */
    fun getDatabaseKey(): ByteArray {
        val prefs = getEncryptedPreferences(prefsFileName)
        
        val existingKey = prefs.getString(prefsKey, null)
        if (existingKey != null) {
            // Convert hex string back to ByteArray
            return hexStringToByteArray(existingKey)
        }
        
        // Generate new 256-bit key for SQLCipher
        val keyGenerator = KeyGenerator.getInstance("AES")
        keyGenerator.init(256, SecureRandom())
        val secretKey: SecretKey = keyGenerator.generateKey()
        val keyBytes = secretKey.encoded
        
        // Store as hex string in EncryptedSharedPreferences
        prefs.edit()
            .putString(prefsKey, byteArrayToHexString(keyBytes))
            .apply()
        
        return keyBytes
    }
    
    /**
     * Get MasterKey for EncryptedSharedPreferences
     */
    fun getMasterKey(): MasterKey {
        return MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
    }
    
    /**
     * Get EncryptedSharedPreferences for storing sensitive data
     */
    fun getEncryptedPreferences(fileName: String) = EncryptedSharedPreferences.create(
        context,
        fileName,
        getMasterKey(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
    
    private fun byteArrayToHexString(bytes: ByteArray): String {
        return bytes.joinToString("") { "%02x".format(it) }
    }
    
    private fun hexStringToByteArray(hex: String): ByteArray {
        return hex.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
    }
}

