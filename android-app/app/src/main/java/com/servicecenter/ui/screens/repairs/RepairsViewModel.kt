package com.servicecenter.ui.screens.repairs

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servicecenter.data.local.PreferencesKeys
import com.servicecenter.data.models.Repair
import com.servicecenter.data.models.WarehouseItem
import com.servicecenter.data.repository.RepairRepository
import com.servicecenter.data.repository.WarehouseRepository
import com.servicecenter.data.sync.SyncManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch
import kotlinx.coroutines.ExperimentalCoroutinesApi
import javax.inject.Inject

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class RepairsViewModel @Inject constructor(
    private val repairRepository: RepairRepository,
    private val warehouseRepository: WarehouseRepository,
    private val dataStore: DataStore<Preferences>,
    private val syncManager: SyncManager
) : ViewModel() {
    
    private suspend fun getServerUrl(): String? {
        return dataStore.data.map { preferences ->
            preferences[PreferencesKeys.SERVER_URL]
        }.first()
    }
    
    private val _repairs = MutableStateFlow<List<Repair>>(emptyList())
    val repairs: StateFlow<List<Repair>> = _repairs.asStateFlow()
    
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()
    
    private val _selectedStatus = MutableStateFlow<String?>(null)
    val selectedStatus: StateFlow<String?> = _selectedStatus.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    // Список доступних статусів
    val availableStatuses = listOf(
        "У черзі",
        "У роботі",
        "Очікування",
        "Очікув. відпов./деталі",
        "Готовий",
        "Готовий до видачі",
        "Не додзвонились",
        "Не додзвонилися",
        "Видано",
        "Одеса"
    )
    
    init {
        loadRepairs()
        observeRepairs()
    }
    
    private fun observeRepairs() {
        viewModelScope.launch {
            combine(
                _searchQuery,
                _selectedStatus
            ) { query, status ->
                Pair(query, status)
            }.flatMapLatest { (query, status) ->
                when {
                    status != null && query.isNotEmpty() -> {
                        // Фільтр по статусу та пошуку
                        repairRepository.searchRepairsByStatus(query, status)
                    }
                    status != null -> {
                        // Тільки фільтр по статусу
                        repairRepository.getRepairsByStatus(status)
                    }
                    query.isNotEmpty() -> {
                        // Тільки пошук
                        repairRepository.searchRepairs(query)
                    }
                    else -> {
                        // Всі ремонти
                        repairRepository.getAllRepairs()
                    }
                }
            }.collect { repairs ->
                android.util.Log.d("RepairsViewModel", "Observed ${repairs.size} repairs (status: ${_selectedStatus.value}, query: ${_searchQuery.value})")
                _repairs.value = repairs
            }
        }
    }
    
    fun loadRepairs() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val serverUrl = getServerUrl()
                android.util.Log.d("RepairsViewModel", "Loading repairs, serverUrl: $serverUrl")
                repairRepository.syncRepairs(serverUrl)
                android.util.Log.d("RepairsViewModel", "Sync completed")
            } catch (e: Exception) {
                android.util.Log.e("RepairsViewModel", "Error loading repairs: ${e.message}", e)
                _error.value = e.message
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun search(query: String) {
        _searchQuery.value = query
        // observeRepairs() will automatically update when _searchQuery changes
    }
    
    fun setStatusFilter(status: String?) {
        _selectedStatus.value = status
        // observeRepairs() will automatically update when _selectedStatus changes
    }
    
    fun clearStatusFilter() {
        _selectedStatus.value = null
    }
    
    fun createRepair(repair: Repair, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val serverUrl = getServerUrl()
                val result = repairRepository.createRepair(repair, serverUrl)
                result.onSuccess {
                    onSuccess()
                }.onFailure {
                    onError(it.message ?: "Помилка створення ремонту")
                }
            } catch (e: Exception) {
                onError(e.message ?: "Помилка створення ремонту")
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun updateRepair(repair: Repair, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val serverUrl = getServerUrl()
                val result = repairRepository.updateRepair(repair, serverUrl)
                result.onSuccess {
                    // Refresh repairs list after successful update
                    loadRepairs()
                    onSuccess()
                }.onFailure {
                    onError(it.message ?: "Помилка оновлення ремонту")
                }
            } catch (e: Exception) {
                onError(e.message ?: "Помилка оновлення ремонту")
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun deleteRepair(repair: Repair, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val serverUrl = getServerUrl()
                repairRepository.deleteRepair(repair, serverUrl)
                // Refresh repairs list after successful delete
                loadRepairs()
                onSuccess()
            } catch (e: Exception) {
                android.util.Log.e("RepairsViewModel", "Error deleting repair: ${e.message}", e)
                _error.value = e.message ?: "Помилка видалення ремонту"
                // Still call onSuccess to close dialog even if there was an error
                // The repair is already deleted locally
                onSuccess()
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    suspend fun getNextReceiptId(): Int? {
        val serverUrl = getServerUrl()
        return repairRepository.getNextReceiptId(serverUrl)
    }
    
    suspend fun getRepairById(id: Int): Repair? {
        return repairRepository.getRepairById(id)
    }
    
    suspend fun getExecutors(): List<com.servicecenter.data.api.Executor> {
        val serverUrl = getServerUrl()
        return repairRepository.getExecutors(serverUrl)
    }
    
    suspend fun addPartToRepair(
        repairId: Int,
        receiptId: Int,
        partId: Int?,
        priceUah: Double,
        costUah: Double,
        supplier: String,
        name: String,
        isPaid: Boolean,
        dateEnd: String?
    ): Result<Boolean> {
        val serverUrl = getServerUrl()
        return repairRepository.addPartToRepair(
            repairId = repairId,
            receiptId = receiptId,
            partId = partId,
            priceUah = priceUah,
            costUah = costUah,
            supplier = supplier,
            name = name,
            isPaid = isPaid,
            dateEnd = dateEnd,
            serverUrl = serverUrl
        )
    }
    
    suspend fun getRepairParts(repairId: Int): List<WarehouseItem> {
        val serverUrl = getServerUrl()
        return warehouseRepository.getRepairParts(repairId, serverUrl)
    }
    
    suspend fun removePartFromRepair(repairId: Int, partId: Int): Boolean {
        val serverUrl = getServerUrl()
        return warehouseRepository.removePartFromRepair(repairId, partId, serverUrl)
    }
    
    // Method to notify about repair creation (for blocking sync)
    fun setCreatingRepair(isCreating: Boolean) {
        syncManager.setCreatingRepair(isCreating)
        android.util.Log.d("RepairsViewModel", "setCreatingRepair: $isCreating")
    }

    // --- LOCKING METHODS ---

    suspend fun getLock(id: Int): com.servicecenter.data.api.LockResponse? {
        val serverUrl = getServerUrl()
        return repairRepository.getLock(id, serverUrl)
    }

    fun setLock(id: Int, device: String) {
        viewModelScope.launch {
            val serverUrl = getServerUrl()
            repairRepository.setLock(id, device, serverUrl)
        }
    }

    fun releaseLock(id: Int) {
        viewModelScope.launch {
            val serverUrl = getServerUrl()
            repairRepository.releaseLock(id, serverUrl)
        }
    }
}

