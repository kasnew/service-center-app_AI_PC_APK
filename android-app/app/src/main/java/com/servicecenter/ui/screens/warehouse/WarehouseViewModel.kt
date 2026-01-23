package com.servicecenter.ui.screens.warehouse

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servicecenter.data.local.PreferencesKeys
import com.servicecenter.data.models.WarehouseItem
import com.servicecenter.data.repository.WarehouseRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class WarehouseViewModel @Inject constructor(
    private val warehouseRepository: WarehouseRepository,
    private val dataStore: DataStore<Preferences>
) : ViewModel() {
    
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()
    
    private val _selectedSupplier = MutableStateFlow<String?>(null)
    val selectedSupplier: StateFlow<String?> = _selectedSupplier.asStateFlow()
    
    private val _showInStockOnly = MutableStateFlow(true)
    val showInStockOnly: StateFlow<Boolean> = _showInStockOnly.asStateFlow()
    
    private val _groupByType = MutableStateFlow(true) // По замовчуванню групуємо однотипні товари
    val groupByType: StateFlow<Boolean> = _groupByType.asStateFlow()
    
    private val _warehouseItems = MutableStateFlow<List<WarehouseItem>>(emptyList())
    val warehouseItems: StateFlow<List<WarehouseItem>> = _warehouseItems.asStateFlow()
    
    private val _suppliers = MutableStateFlow<List<String>>(emptyList())
    val suppliers: StateFlow<List<String>> = _suppliers.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    val filteredItems: StateFlow<List<WarehouseItem>> = combine(
        _warehouseItems,
        _searchQuery,
        _selectedSupplier,
        _showInStockOnly,
        _groupByType
    ) { items, query, supplier, inStockOnly, groupBy ->
        android.util.Log.d("WarehouseViewModel", "=== FILTERING START ===")
        android.util.Log.d("WarehouseViewModel", "Total items: ${items.size}, supplier: $supplier, query: '$query', inStockOnly: $inStockOnly, groupBy: $groupBy")
        
        var filtered = items
        
        // Filter by inStock first
        if (inStockOnly) {
            val beforeCount = filtered.size
            filtered = filtered.filter { it.inStock }
            android.util.Log.d("WarehouseViewModel", "After inStock filter: $beforeCount -> ${filtered.size} items")
        }
        
        if (supplier != null && supplier.isNotEmpty()) {
            val beforeCount = filtered.size
            filtered = filtered.filter { it.supplier == supplier }
            android.util.Log.d("WarehouseViewModel", "After supplier filter ($supplier): $beforeCount -> ${filtered.size} items")
        }
        
        if (query.isNotEmpty()) {
            val beforeCount = filtered.size
            val queryLower = query.lowercase()
            filtered = filtered.filter {
                it.name.lowercase().contains(queryLower) ||
                it.productCode?.lowercase()?.contains(queryLower) == true
            }
            android.util.Log.d("WarehouseViewModel", "After search filter ('$query'): $beforeCount -> ${filtered.size} items")
        }
        
        if (groupBy) {
            val beforeCount = filtered.size
            filtered = filtered.groupBy { "${it.name.lowercase()}|${it.supplier?.lowercase() ?: ""}" }
                .map { entry ->
                    val group = entry.value
                    val first = group.first()
                    first.copy(
                        quantity = group.sumOf { it.quantity }
                    )
                }
            android.util.Log.d("WarehouseViewModel", "After grouping: $beforeCount -> ${filtered.size} groups")
        }
        
        android.util.Log.d("WarehouseViewModel", "=== FILTERING END: ${filtered.size} items ===")
        filtered
    }
    .stateIn(
        scope = viewModelScope,
        started = SharingStarted.Eagerly,
        initialValue = emptyList()
    )
    
    init {
        loadSuppliers()
        loadWarehouseItems()
    }
    
    fun setSearchQuery(query: String) {
        android.util.Log.d("WarehouseViewModel", "Setting search query: $query")
        _searchQuery.value = query
        // Force update filtered items by triggering a recomputation
        // The combine flow will automatically update, but we ensure it happens
    }
    
    fun setSelectedSupplier(supplier: String?) {
        android.util.Log.d("WarehouseViewModel", "Setting selected supplier: $supplier")
        _selectedSupplier.value = supplier
        // Force update filtered items by triggering a recomputation
        // The combine flow will automatically update, but we ensure it happens
    }
    
    fun setShowInStockOnly(showInStockOnly: Boolean) {
        android.util.Log.d("WarehouseViewModel", "Setting showInStockOnly: $showInStockOnly")
        _showInStockOnly.value = showInStockOnly
    }
    
    fun setGroupByType(groupBy: Boolean) {
        android.util.Log.d("WarehouseViewModel", "Setting groupByType: $groupBy")
        _groupByType.value = groupBy
    }
    
    private suspend fun getServerUrl(): String? {
        return dataStore.data.first()[PreferencesKeys.SERVER_URL]
    }
    
    fun loadWarehouseItems() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val serverUrl = dataStore.data.first()[PreferencesKeys.SERVER_URL]
                // Load all items without filters - filtering will be done by filteredItems
                val items = warehouseRepository.getWarehouseItems(
                    serverUrl = serverUrl,
                    supplier = null,
                    search = null
                )
                _warehouseItems.value = items
                android.util.Log.d("WarehouseViewModel", "Loaded ${items.size} warehouse items")
            } catch (e: Exception) {
                android.util.Log.e("WarehouseViewModel", "Error loading warehouse items: ${e.message}", e)
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun syncWarehouseItems() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val serverUrl = dataStore.data.first()[PreferencesKeys.SERVER_URL]
                warehouseRepository.syncWarehouseItems(serverUrl)
                loadWarehouseItems()
            } catch (e: Exception) {
                android.util.Log.e("WarehouseViewModel", "Error syncing warehouse items: ${e.message}", e)
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun loadSuppliers() {
        viewModelScope.launch {
            try {
                val serverUrl = dataStore.data.first()[PreferencesKeys.SERVER_URL]
                android.util.Log.d("WarehouseViewModel", "Loading suppliers from: $serverUrl")
                val suppliersList = warehouseRepository.getWarehouseSuppliers(serverUrl)
                android.util.Log.d("WarehouseViewModel", "Loaded ${suppliersList.size} suppliers: $suppliersList")
                _suppliers.value = suppliersList
            } catch (e: Exception) {
                android.util.Log.e("WarehouseViewModel", "Error loading suppliers: ${e.message}", e)
            }
        }
    }
    
    fun getItemById(id: Int): WarehouseItem? {
        return _warehouseItems.value.find { it.id == id }
    }
    
    fun updateBarcode(itemId: Int, barcode: String?) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                // Check if item exists and is in stock
                val item = warehouseRepository.getItemById(itemId)
                if (item == null) {
                    android.util.Log.e("WarehouseViewModel", "Item $itemId not found")
                    _isLoading.value = false
                    return@launch
                }
                
                if (!item.inStock) {
                    android.util.Log.w("WarehouseViewModel", "Cannot assign barcode to item $itemId: item is not in stock")
                    _isLoading.value = false
                    return@launch
                }
                
                val serverUrl = getServerUrl()
                val success = warehouseRepository.updateWarehouseItemBarcode(itemId, barcode, serverUrl)
                if (success) {
                    // Reload items to reflect changes
                    loadWarehouseItems()
                }
            } catch (e: Exception) {
                android.util.Log.e("WarehouseViewModel", "Error updating barcode: ${e.message}", e)
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun deleteBarcode(itemId: Int) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val serverUrl = getServerUrl()
                val success = warehouseRepository.deleteWarehouseItemBarcode(itemId, serverUrl)
                if (success) {
                    // Reload items to reflect changes
                    loadWarehouseItems()
                }
            } catch (e: Exception) {
                android.util.Log.e("WarehouseViewModel", "Error deleting barcode: ${e.message}", e)
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    suspend fun checkBarcodeUnique(barcode: String, currentItemId: Int): Boolean {
        return try {
            val serverUrl = getServerUrl()
            // Check if barcode exists for another item
            val existingItem = warehouseRepository.getWarehouseItemByBarcode(barcode, serverUrl)
            // Barcode is unique if:
            // 1. No item found with this barcode, OR
            // 2. The item found is the same item we're editing (allowing to keep the same barcode)
            existingItem == null || existingItem.id == currentItemId
        } catch (e: Exception) {
            android.util.Log.e("WarehouseViewModel", "Error checking barcode uniqueness: ${e.message}", e)
            // On error, allow the barcode (better to allow than block)
            true
        }
    }
    
    suspend fun findItemByBarcode(barcode: String): WarehouseItem? {
        return try {
            val serverUrl = getServerUrl()
            warehouseRepository.getWarehouseItemByBarcode(barcode, serverUrl)
        } catch (e: Exception) {
            android.util.Log.e("WarehouseViewModel", "Error finding item by barcode: ${e.message}", e)
            null
        }
    }
}

