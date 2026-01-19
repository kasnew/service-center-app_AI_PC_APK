package com.chipzone.ui.viewmodels

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chipzone.api.server.HttpServer
import com.chipzone.security.PinManager
import com.chipzone.data.backup.BackupManager
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val httpServer: HttpServer,
    private val pinManager: PinManager,
    private val backupManager: BackupManager
) : ViewModel() {
    
    private val _serverRunning = MutableStateFlow(false)
    val serverRunning: StateFlow<Boolean> = _serverRunning.asStateFlow()
    
    private val _serverInfo = MutableStateFlow<Pair<String, Int>?>(null)
    val serverInfo: StateFlow<Pair<String, Int>?> = _serverInfo.asStateFlow()
    
    private val _isProtectionEnabled = MutableStateFlow(pinManager.isProtectionEnabled())
    val isProtectionEnabled: StateFlow<Boolean> = _isProtectionEnabled.asStateFlow()
    
    private val _bearerToken = MutableStateFlow<String?>(null)
    val bearerToken: StateFlow<String?> = _bearerToken.asStateFlow()
    
    init {
        // Check server state on initialization
        viewModelScope.launch(Dispatchers.IO) {
            checkServerState()
        }
    }
    
    private suspend fun checkServerState() {
        val isRunning = httpServer.isRunning()
        val serverInfo = httpServer.getServerInfo()
        val token = if (isRunning) httpServer.getBearerToken() else ""
        
        withContext(Dispatchers.Main) {
            _serverRunning.value = isRunning
            _serverInfo.value = serverInfo
            _bearerToken.value = if (token.isNotEmpty()) token else null
            Log.d("SettingsViewModel", "Server state checked: running=$isRunning, info=$serverInfo, token=${if (token.isNotEmpty()) "${token.take(10)}..." else "null"}")
        }
    }
    
    fun refreshServerState() {
        viewModelScope.launch(Dispatchers.IO) {
            checkServerState()
        }
    }
    
    fun setProtectionEnabled(enabled: Boolean) {
        pinManager.setProtectionEnabled(enabled)
        _isProtectionEnabled.value = enabled
    }
    
    private var currentToken: String = ""
    
    fun startServer() {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                Log.d("SettingsViewModel", "startServer() called on IO dispatcher")
            // Generate bearer token (64 characters)
                currentToken = generateBearerToken()
                Log.d("SettingsViewModel", "Token generated: ${currentToken.take(10)}...")
                
                Log.d("SettingsViewModel", "Calling httpServer.startServer()...")
                val result = httpServer.startServer(port = 8080, token = currentToken)
                Log.d("SettingsViewModel", "startServer returned: ${result.isSuccess}")
                
            result.onSuccess {
                    withContext(Dispatchers.Main) {
                _serverRunning.value = true
                _serverInfo.value = httpServer.getServerInfo()
                        _bearerToken.value = httpServer.getBearerToken()
                    }
                    Log.d("SettingsViewModel", "Server started: $it, Token: ${currentToken.take(10)}...")
                }.onFailure { error ->
                    Log.e("SettingsViewModel", "Failed to start server: ${error.message}", error)
                    error.printStackTrace()
            }
            } catch (e: Exception) {
                Log.e("SettingsViewModel", "Exception in startServer: ${e.message}", e)
                e.printStackTrace()
            }
        }
    }
    
    fun getBearerToken(): String {
        return currentToken
    }
    
    fun stopServer() {
        Log.d("SettingsViewModel", "stopServer() called")
        viewModelScope.launch(Dispatchers.IO) {
            try {
            httpServer.stopServer()
                // Wait a bit for server to stop
                kotlinx.coroutines.delay(500)
                withContext(Dispatchers.Main) {
            _serverRunning.value = false
            _serverInfo.value = null
                    _bearerToken.value = null
                }
                Log.d("SettingsViewModel", "Server stopped, state updated")
            } catch (e: Exception) {
                Log.e("SettingsViewModel", "Error stopping server: ${e.message}", e)
            }
        }
    }
    
    fun createBackup(customName: String? = null) {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val backupInfo = backupManager.createBackup(customName)
                Log.d("SettingsViewModel", "Backup created: ${backupInfo.fileName}, size: ${backupInfo.size}")
            } catch (e: Exception) {
                Log.e("SettingsViewModel", "Failed to create backup", e)
            }
        }
    }
    
    private fun generateBearerToken(): String {
        val chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        return (1..64)
            .map { chars.random() }
            .joinToString("")
    }
}

