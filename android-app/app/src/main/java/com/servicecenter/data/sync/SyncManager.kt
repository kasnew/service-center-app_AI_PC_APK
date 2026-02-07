package com.servicecenter.data.sync

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.stringPreferencesKey
import com.servicecenter.data.local.PreferencesKeys
import com.servicecenter.data.repository.RepairRepository
import com.servicecenter.data.repository.TransactionRepository
import com.servicecenter.data.repository.WarehouseRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SyncManager @Inject constructor(
    private val context: Context,
    private val apiClient: com.servicecenter.data.api.ApiClient,
    private val repairRepository: RepairRepository,
    private val warehouseRepository: WarehouseRepository,
    private val transactionRepository: TransactionRepository,
    private val dataStore: DataStore<Preferences>
) {
    private val _isOfflineMode = MutableStateFlow(false)
    val isOfflineMode: StateFlow<Boolean> = _isOfflineMode.asStateFlow()
    
    private var networkFailures = 0
    private val FAILURE_THRESHOLD = 3
    
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var isSyncing = false
    private var lastSyncTime: Long = 0
    private val syncInterval = 5 * 60 * 1000L // 5 minutes
    private var isCreatingRepair = false // Block sync during repair creation
    
    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    
    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            android.util.Log.d("SyncManager", "Network available, checking if sync needed")
            scope.launch {
                performSyncIfNeeded()
            }
        }
        
        override fun onLost(network: Network) {
            android.util.Log.d("SyncManager", "Network lost")
        }
        
        override fun onCapabilitiesChanged(
            network: Network,
            networkCapabilities: NetworkCapabilities
        ) {
            val hasInternet = networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                    networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
            
            if (hasInternet) {
                android.util.Log.d("SyncManager", "Network capabilities changed, internet available")
                scope.launch {
                    performSyncIfNeeded()
                }
            }
        }
    }
    
    fun start() {
        android.util.Log.d("SyncManager", "Starting SyncManager")
        
        // Register network callback for any available data transport
        val networkRequest = NetworkRequest.Builder()
            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
            .addTransportType(NetworkCapabilities.TRANSPORT_CELLULAR)
            .addTransportType(NetworkCapabilities.TRANSPORT_ETHERNET)
            .build()
        
        connectivityManager.registerNetworkCallback(networkRequest, networkCallback)
        
        // Perform initial sync if network is available
        scope.launch {
            if (isNetworkAvailable()) {
                performSyncIfNeeded()
            }
        }
    }
    
    fun stop() {
        android.util.Log.d("SyncManager", "Stopping SyncManager")
        try {
            connectivityManager.unregisterNetworkCallback(networkCallback)
        } catch (e: Exception) {
            // Ignore if not registered
        }
    }
    
    fun syncNow() {
        scope.launch {
            performSync(force = true)
        }
    }
    
    fun setCreatingRepair(creating: Boolean) {
        isCreatingRepair = creating
        android.util.Log.d("SyncManager", "setCreatingRepair: $creating")
    }
    
    fun releaseLock(id: Int) {
        scope.launch {
            try {
                val serverUrl = getServerUrl()
                if (!serverUrl.isNullOrEmpty()) {
                    android.util.Log.d("SyncManager", "Releasing lock for repair $id via SyncManager global scope")
                    repairRepository.releaseLock(id, serverUrl)
                }
            } catch (e: Exception) {
                android.util.Log.e("SyncManager", "Failed to release lock for $id: ${e.message}")
            }
        }
    }
    
    private suspend fun performSyncIfNeeded() {
        if (_isOfflineMode.value) {
            android.util.Log.d("SyncManager", "Skipping sync: Offline Mode is active")
            return
        }
        
        val now = System.currentTimeMillis()
        if (now - lastSyncTime < syncInterval && !isSyncing) {
            android.util.Log.d("SyncManager", "Sync skipped, too soon since last sync")
            return
        }
        performSync(force = false)
    }
    
    fun setOfflineMode(enabled: Boolean) {
        android.util.Log.d("SyncManager", "Setting Offline Mode: $enabled")
        _isOfflineMode.value = enabled
        apiClient.isOffline = enabled
        if (!enabled) {
            networkFailures = 0
            syncNow()
        }
    }
    
    fun retryConnection() {
        android.util.Log.d("SyncManager", "Retrying connection manually...")
        setOfflineMode(false)
    }
    
    private suspend fun performSync(force: Boolean = false) {
        if (isSyncing && !force) {
            android.util.Log.d("SyncManager", "Sync already in progress, skipping")
            return
        }
        
        if (isCreatingRepair && !force) {
            android.util.Log.d("SyncManager", "Sync blocked: repair is being created")
            return
        }
        
        val serverUrl = getServerUrl()
        if (serverUrl.isNullOrEmpty()) {
            android.util.Log.d("SyncManager", "No server URL configured, skipping sync")
            return
        }
        
        if (!isNetworkAvailable()) {
            android.util.Log.d("SyncManager", "No network available, skipping sync")
            return
        }
        
        isSyncing = true
        lastSyncTime = System.currentTimeMillis()
        
        try {
            android.util.Log.d("SyncManager", "Starting sync with server: $serverUrl")
            
            // Sync repairs
            try {
                repairRepository.syncRepairs(serverUrl)
                repairRepository.syncUnsyncedRepairs(serverUrl)
                android.util.Log.d("SyncManager", "Repairs synced successfully")
            } catch (e: Exception) {
                android.util.Log.e("SyncManager", "Error syncing repairs: ${e.message}", e)
                throw e // Re-throw to count as failure
            }
            
            // Sync warehouse items
            try {
                warehouseRepository.syncWarehouseItems(serverUrl)
                android.util.Log.d("SyncManager", "Warehouse items synced successfully")
            } catch (e: Exception) {
                android.util.Log.e("SyncManager", "Error syncing warehouse items: ${e.message}", e)
                // Don't re-throw here to allow partial sync success
            }
            
            // Sync transactions
            try {
                transactionRepository.syncTransactions(serverUrl)
                android.util.Log.d("SyncManager", "Transactions synced successfully")
            } catch (e: Exception) {
                android.util.Log.e("SyncManager", "Error syncing transactions: ${e.message}", e)
                // Don't re-throw here
            }
            
            android.util.Log.d("SyncManager", "Sync completed successfully")
            networkFailures = 0 // Reset failures on success
        } catch (e: Exception) {
            android.util.Log.e("SyncManager", "Sync error: ${e.message}", e)
            networkFailures++
            if (networkFailures >= FAILURE_THRESHOLD) {
                android.util.Log.w("SyncManager", "Too many network failures ($networkFailures), entering Offline Mode")
                _isOfflineMode.value = true
                apiClient.isOffline = true
            }
        } finally {
            isSyncing = false
        }
    }
    
    private suspend fun getServerUrl(): String? {
        return dataStore.data.map { preferences ->
            preferences[PreferencesKeys.SERVER_URL]
        }.first()
    }
    
    private fun isNetworkAvailable(): Boolean {
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        
        // For local server sync, we don't strictly need NET_CAPABILITY_INTERNET
        // because the server might be on a local offline WiFi network.
        // We just need some form of connectivity (Wifi, Ethernet, or even Cellular if server is public)
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) ||
               capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
               capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
    }
}


