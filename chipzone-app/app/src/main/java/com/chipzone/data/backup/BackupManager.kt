package com.chipzone.data.backup

import android.content.Context
import android.util.Log
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.security.SecureRandom
import java.text.SimpleDateFormat
import java.util.*
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import java.util.zip.ZipInputStream
import javax.crypto.Cipher
import javax.crypto.CipherInputStream
import javax.crypto.CipherOutputStream
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable

@Serializable
data class BackupInfo(
    val fileName: String,
    val size: Long,
    val date: String,
    val encrypted: Boolean
)

class BackupManager(private val context: Context) {
    
    companion object {
        private const val TAG = "BackupManager"
        private const val ALGORITHM = "AES/GCM/NoPadding"
        private const val KEY_ALGORITHM = "AES"
        private const val KEY_SIZE = 256 // bits
        private const val IV_LENGTH = 12 // 96 bits for GCM
        private const val TAG_LENGTH = 128 // bits
        private const val KEY_FILE_NAME = ".encryption_key"
        
        // Generate encryption key
        private fun generateEncryptionKey(): ByteArray {
            val key = ByteArray(KEY_SIZE / 8) // 32 bytes for AES-256
            SecureRandom().nextBytes(key)
            return key
        }
        
        // Get or create encryption key
        private fun getOrCreateEncryptionKey(keyFile: File): ByteArray {
            return try {
                if (keyFile.exists()) {
                    val keyBytes = keyFile.readBytes()
                    if (keyBytes.size == KEY_SIZE / 8) {
                        keyBytes
                    } else {
                        // Invalid key, generate new one
                        val newKey = generateEncryptionKey()
                        keyFile.writeBytes(newKey)
                        newKey
                    }
                } else {
                    // Generate new key
                    val newKey = generateEncryptionKey()
                    keyFile.parentFile?.mkdirs()
                    keyFile.writeBytes(newKey)
                    newKey
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error getting encryption key", e)
                throw RuntimeException("Failed to get encryption key", e)
            }
        }
    }
    
    private val backupsDir: File
        get() {
            val externalDir = context.getExternalFilesDir(null)
            if (externalDir == null) {
                // Fallback to internal files directory if external is not available
                Log.w(TAG, "External files directory is null, using internal files directory")
                return File(context.filesDir, "backups").apply {
                    if (!exists()) mkdirs()
                }
            }
            return File(externalDir, "backups").apply {
                if (!exists()) mkdirs()
            }
        }
    
    private val keyFile: File
        get() = File(context.filesDir, KEY_FILE_NAME)
    
    /**
     * Create a backup of the database with encryption and compression
     */
    suspend fun createBackup(customName: String? = null): BackupInfo = withContext(Dispatchers.IO) {
        try {
            val dbFile = context.getDatabasePath("service_center.db")
            if (!dbFile.exists()) {
                throw RuntimeException("Database file not found")
            }
            
            // Generate backup filename
            val timestamp = SimpleDateFormat("yyyy-MM-dd_HH-mm-ss", Locale.getDefault()).format(Date())
            val baseName = customName ?: "backup_$timestamp"
            val backupFileName = "$baseName.encrypted.zip"
            val backupFile = File(backupsDir, backupFileName)
            
            // Get encryption key
            val encryptionKey = getOrCreateEncryptionKey(keyFile)
            val keySpec = SecretKeySpec(encryptionKey, KEY_ALGORITHM)
            
            // Step 1: Compress database file
            val tempZipFile = File(context.cacheDir, "temp_backup_${System.currentTimeMillis()}.zip")
            try {
                FileOutputStream(tempZipFile).use { fos ->
                    ZipOutputStream(fos).use { zos ->
                        val entry = ZipEntry("service_center.db")
                        zos.putNextEntry(entry)
                        FileInputStream(dbFile).use { fis ->
                            fis.copyTo(zos)
                        }
                        zos.closeEntry()
                    }
                }
                
                // Step 2: Encrypt compressed file
                val iv = ByteArray(IV_LENGTH)
                SecureRandom().nextBytes(iv)
                
                val cipher = Cipher.getInstance(ALGORITHM)
                val parameterSpec = GCMParameterSpec(TAG_LENGTH, iv)
                cipher.init(Cipher.ENCRYPT_MODE, keySpec, parameterSpec)
                
                FileOutputStream(backupFile).use { fos ->
                    // Write IV first
                    fos.write(iv)
                    
                    // Encrypt and write compressed data
                    CipherOutputStream(fos, cipher).use { cos ->
                        FileInputStream(tempZipFile).use { fis ->
                            fis.copyTo(cos)
                        }
                    }
                }
                
                // Get backup info
                val stats = java.io.File(backupFile.absolutePath)
                BackupInfo(
                    fileName = backupFileName,
                    size = stats.length(),
                    date = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).format(Date(stats.lastModified())),
                    encrypted = true
                )
            } finally {
                // Clean up temp file
                if (tempZipFile.exists()) {
                    tempZipFile.delete()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create backup", e)
            throw RuntimeException("Failed to create backup: ${e.message}", e)
        }
    }
    
    /**
     * Restore database from backup
     */
    suspend fun restoreBackup(backupFileName: String): Unit = withContext(Dispatchers.IO) {
        try {
            val backupFile = File(backupsDir, backupFileName)
            if (!backupFile.exists()) {
                throw RuntimeException("Backup file not found: $backupFileName")
            }
            
            // Get encryption key
            val encryptionKey = getOrCreateEncryptionKey(keyFile)
            val keySpec = SecretKeySpec(encryptionKey, KEY_ALGORITHM)
            
            // Step 1: Decrypt backup file
            val tempZipFile = File(context.cacheDir, "temp_restore_${System.currentTimeMillis()}.zip")
            try {
                FileInputStream(backupFile).use { fis ->
                    // Read IV
                    val iv = ByteArray(IV_LENGTH)
                    fis.read(iv)
                    
                    // Decrypt
                    val cipher = Cipher.getInstance(ALGORITHM)
                    val parameterSpec = GCMParameterSpec(TAG_LENGTH, iv)
                    cipher.init(Cipher.DECRYPT_MODE, keySpec, parameterSpec)
                    
                    FileOutputStream(tempZipFile).use { fos ->
                        CipherInputStream(fis, cipher).use { cis ->
                            cis.copyTo(fos)
                        }
                    }
                }
                
                // Step 2: Extract database from zip
                val dbFile = context.getDatabasePath("service_center.db")
                dbFile.parentFile?.mkdirs()
                
                FileInputStream(tempZipFile).use { fis ->
                    ZipInputStream(fis).use { zis ->
                        var entry: ZipEntry? = zis.nextEntry
                        while (entry != null) {
                            if (entry.name == "service_center.db") {
                                FileOutputStream(dbFile).use { fos ->
                                    zis.copyTo(fos)
                                }
                                break
                            }
                            entry = zis.nextEntry
                        }
                    }
                }
                
                Log.d(TAG, "Backup restored successfully")
            } finally {
                // Clean up temp file
                if (tempZipFile.exists()) {
                    tempZipFile.delete()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to restore backup", e)
            throw RuntimeException("Failed to restore backup: ${e.message}", e)
        }
    }
    
    /**
     * List all available backups
     */
    suspend fun listBackups(): List<BackupInfo> = withContext(Dispatchers.IO) {
        try {
            val dir = backupsDir
            if (!dir.exists()) {
                Log.d(TAG, "Backups directory does not exist: ${dir.absolutePath}")
                return@withContext listOf<BackupInfo>()
            }
            
            if (!dir.isDirectory) {
                Log.e(TAG, "Backups path is not a directory: ${dir.absolutePath}")
                return@withContext listOf<BackupInfo>()
            }
            
            val files = dir.listFiles()
            if (files == null) {
                Log.e(TAG, "Failed to list files in backups directory: ${dir.absolutePath}")
                return@withContext listOf<BackupInfo>()
            }
            
            val backups = files
                .filter { it.isFile && it.name.endsWith(".encrypted.zip") }
                .map { file ->
                    BackupInfo(
                        fileName = file.name,
                        size = file.length(),
                        date = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).format(Date(file.lastModified())),
                        encrypted = true
                    )
                }
                .sortedByDescending { it.date }
            
            Log.d(TAG, "Found ${backups.size} backups in ${dir.absolutePath}")
            return@withContext backups
        } catch (e: Exception) {
            Log.e(TAG, "Failed to list backups", e)
            throw RuntimeException("Failed to list backups: ${e.message}", e)
        }
    }
    
    /**
     * Delete a backup file
     */
    suspend fun deleteBackup(backupFileName: String): Unit = withContext(Dispatchers.IO) {
        try {
            val backupFile = File(backupsDir, backupFileName)
            if (backupFile.exists()) {
                backupFile.delete()
                Log.d(TAG, "Backup deleted: $backupFileName")
            } else {
                throw RuntimeException("Backup file not found: $backupFileName")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to delete backup", e)
            throw RuntimeException("Failed to delete backup: ${e.message}", e)
        }
    }
    
    /**
     * Get backup file for download
     */
    fun getBackupFile(backupFileName: String): File {
        val backupFile = File(backupsDir, backupFileName)
        if (!backupFile.exists()) {
            throw RuntimeException("Backup file not found: $backupFileName")
        }
        return backupFile
    }
    
    /**
     * Rename a backup file
     */
    suspend fun renameBackup(oldFileName: String, newFileName: String): BackupInfo = withContext(Dispatchers.IO) {
        try {
            val oldFile = File(backupsDir, oldFileName)
            if (!oldFile.exists()) {
                throw RuntimeException("Backup file not found: $oldFileName")
            }
            
            // Validate new file name
            if (newFileName.isBlank()) {
                throw RuntimeException("New file name cannot be empty")
            }
            
            // Ensure new file name has .encrypted.zip extension
            val finalNewFileName = if (newFileName.endsWith(".encrypted.zip")) {
                newFileName
            } else {
                "$newFileName.encrypted.zip"
            }
            
            val newFile = File(backupsDir, finalNewFileName)
            
            // Check if new file name already exists
            if (newFile.exists() && newFile.absolutePath != oldFile.absolutePath) {
                throw RuntimeException("Backup file with name '$finalNewFileName' already exists")
            }
            
            // Rename the file
            val success = oldFile.renameTo(newFile)
            if (!success) {
                throw RuntimeException("Failed to rename backup file")
            }
            
            Log.d(TAG, "Backup renamed from $oldFileName to $finalNewFileName")
            
            // Return updated backup info
            BackupInfo(
                fileName = finalNewFileName,
                size = newFile.length(),
                date = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).format(Date(newFile.lastModified())),
                encrypted = true
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to rename backup", e)
            throw RuntimeException("Failed to rename backup: ${e.message}", e)
        }
    }
}

