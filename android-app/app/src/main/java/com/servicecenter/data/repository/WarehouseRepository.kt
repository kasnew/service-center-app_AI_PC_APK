package com.servicecenter.data.repository

import com.servicecenter.data.api.ApiClient
import com.servicecenter.data.api.ApiService
import com.servicecenter.data.local.dao.WarehouseItemDao
import com.servicecenter.data.models.WarehouseItem
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

class WarehouseRepository(
    private val apiClient: ApiClient?,
    private val warehouseDao: WarehouseItemDao
) {
    private fun getApiService(serverUrl: String?): ApiService? {
        return if (serverUrl != null && serverUrl.isNotEmpty()) {
            apiClient?.getApiService(serverUrl)
        } else {
            null
        }
    }
    
    fun getInStockItems(): Flow<List<WarehouseItem>> = warehouseDao.getInStockItems()
    
    fun searchItems(query: String): Flow<List<WarehouseItem>> = warehouseDao.searchItems(query)
    
    suspend fun getItemById(id: Int): WarehouseItem? = warehouseDao.getItemById(id)
    
    suspend fun syncWarehouseItems(serverUrl: String? = null) {
        val api = getApiService(serverUrl)
        if (api == null) {
            android.util.Log.w("WarehouseRepository", "Cannot sync: serverUrl is null or empty")
            return
        }
        
        try {
            android.util.Log.d("WarehouseRepository", "Starting warehouse sync with serverUrl: $serverUrl")
            val response = api.getWarehouseItems(
                inStock = true,
                stockFilter = "inStock",
                supplier = null,
                search = null
            )
            
            if (response.isSuccessful) {
                val body = response.body()
                android.util.Log.d("WarehouseRepository", "Response body: $body")
                
                body?.data?.let { items ->
                    android.util.Log.d("WarehouseRepository", "Received ${items.size} warehouse items from server")
                    warehouseDao.insertItems(items)
                    android.util.Log.d("WarehouseRepository", "Inserted ${items.size} warehouse items into local database")
                    
                    // Sync local barcode changes to server
                    syncLocalBarcodesToServer(serverUrl)
                } ?: android.util.Log.w("WarehouseRepository", "Response body is null or data is null")
            } else {
                android.util.Log.e("WarehouseRepository", "Sync failed: ${response.code()} - ${response.message()}")
            }
        } catch (e: Exception) {
            android.util.Log.e("WarehouseRepository", "Sync error: ${e.javaClass.simpleName} - ${e.message}", e)
            e.printStackTrace()
        }
    }
    
    /**
     * Sync local barcode changes to server
     * Gets all local items with barcodes and tries to update them on server
     */
    private suspend fun syncLocalBarcodesToServer(serverUrl: String?) {
        val api = getApiService(serverUrl) ?: return
        
        try {
            // Get all local items with barcodes
            val localItems = warehouseDao.getInStockItems().first()
                .filter { it.barcode != null && it.barcode!!.isNotEmpty() }
            
            android.util.Log.d("WarehouseRepository", "Syncing ${localItems.size} local barcodes to server")
            
            var syncedCount = 0
            var failedCount = 0
            
            for (item in localItems) {
                try {
                    val response = api.updateWarehouseItemBarcode(
                        item.id,
                        com.servicecenter.data.api.UpdateBarcodeRequest(item.barcode)
                    )
                    if (response.isSuccessful && response.body()?.get("success") == true) {
                        syncedCount++
                    } else {
                        failedCount++
                        android.util.Log.w("WarehouseRepository", "Failed to sync barcode for item ${item.id}: ${response.code()}")
                    }
                } catch (e: Exception) {
                    failedCount++
                    android.util.Log.w("WarehouseRepository", "Error syncing barcode for item ${item.id}: ${e.message}")
                }
            }
            
            android.util.Log.d("WarehouseRepository", "Barcode sync completed: $syncedCount synced, $failedCount failed")
        } catch (e: Exception) {
            android.util.Log.e("WarehouseRepository", "Error syncing local barcodes: ${e.message}", e)
        }
    }
    
    suspend fun getWarehouseItems(
        serverUrl: String? = null,
        supplier: String? = null,
        search: String? = null
    ): List<WarehouseItem> {
        val api = getApiService(serverUrl)
        return try {
            api?.let { service ->
                val response = service.getWarehouseItems(
                    inStock = true,
                    stockFilter = "inStock",
                    supplier = supplier,
                    search = search
                )
                if (response.isSuccessful) {
                    response.body()?.data ?: emptyList()
                } else {
                    android.util.Log.e("WarehouseRepository", "Failed to get warehouse items: ${response.code()}")
                    // Fallback to local database
                    getLocalWarehouseItems(supplier, search)
                }
            } ?: getLocalWarehouseItems(supplier, search)
        } catch (e: Exception) {
            android.util.Log.e("WarehouseRepository", "Error getting warehouse items: ${e.message}", e)
            // Fallback to local database
            getLocalWarehouseItems(supplier, search)
        }
    }
    
    private suspend fun getLocalWarehouseItems(supplier: String?, search: String?): List<WarehouseItem> {
        return try {
            val allItems = warehouseDao.getInStockItems().first()
            var filtered = allItems
            
            if (supplier != null && supplier.isNotEmpty()) {
                filtered = filtered.filter { it.supplier == supplier }
            }
            
            if (search != null && search.isNotEmpty()) {
                val searchLower = search.lowercase()
                filtered = filtered.filter {
                    it.name.lowercase().contains(searchLower) ||
                    it.productCode?.lowercase()?.contains(searchLower) == true
                }
            }
            
            filtered
        } catch (e: Exception) {
            android.util.Log.e("WarehouseRepository", "Error getting local warehouse items: ${e.message}", e)
            emptyList()
        }
    }
    
    suspend fun getWarehouseSuppliers(serverUrl: String? = null): List<String> {
        val api = getApiService(serverUrl)
        return try {
            api?.let { service ->
                val response = service.getWarehouseSuppliers()
                if (response.isSuccessful) {
                    response.body()?.data ?: emptyList()
                } else {
                    android.util.Log.e("WarehouseRepository", "Failed to get warehouse suppliers: ${response.code()}")
                    getLocalSuppliers()
                }
            } ?: getLocalSuppliers()
        } catch (e: Exception) {
            android.util.Log.e("WarehouseRepository", "Error getting warehouse suppliers: ${e.message}", e)
            getLocalSuppliers()
        }
    }
    
    private suspend fun getLocalSuppliers(): List<String> {
        return try {
            val items = warehouseDao.getInStockItems().first()
            items.mapNotNull { it.supplier }
                .distinct()
                .sorted()
        } catch (e: Exception) {
            android.util.Log.e("WarehouseRepository", "Error getting local suppliers: ${e.message}", e)
            emptyList()
        }
    }
    
    suspend fun getRepairParts(repairId: Int, serverUrl: String? = null): List<WarehouseItem> {
        val api = getApiService(serverUrl)
        return try {
            api?.let { service ->
                val response = service.getRepairParts(repairId)
                if (response.isSuccessful) {
                    response.body()?.data ?: emptyList()
                } else {
                    android.util.Log.e("WarehouseRepository", "Failed to get repair parts: ${response.code()}")
                    emptyList()
                }
            } ?: emptyList()
        } catch (e: Exception) {
            android.util.Log.e("WarehouseRepository", "Error getting repair parts: ${e.message}", e)
            emptyList()
        }
    }
    
    suspend fun removePartFromRepair(repairId: Int, partId: Int, serverUrl: String? = null): Boolean {
        val api = getApiService(serverUrl)
        return try {
            api?.let { service ->
                val response = service.removePartFromRepair(repairId, partId)
                if (response.isSuccessful) {
                    response.body()?.get("success") == true
                } else {
                    android.util.Log.e("WarehouseRepository", "Failed to remove part: ${response.code()}")
                    false
                }
            } ?: false
        } catch (e: Exception) {
            android.util.Log.e("WarehouseRepository", "Error removing part: ${e.message}", e)
            false
        }
    }
    
    suspend fun getWarehouseItemByBarcode(barcode: String, serverUrl: String? = null): WarehouseItem? {
        return try {
            // First, try to find locally
            val localItem = warehouseDao.getItemByBarcode(barcode)
            if (localItem != null) {
                android.util.Log.d("WarehouseRepository", "Found item locally by barcode: ${localItem.name}")
                return localItem
            }
            
            // If not found locally, try server
            val api = getApiService(serverUrl)
            val serverItem = api?.let { service ->
                try {
                    val response = service.getWarehouseItemByBarcode(barcode)
                    if (response.isSuccessful) {
                        response.body()?.data?.also { item ->
                            // Save to local database
                            warehouseDao.insertItem(item)
                            android.util.Log.d("WarehouseRepository", "Found item on server and saved locally: ${item.name}")
                        }
                    } else {
                        android.util.Log.d("WarehouseRepository", "Item not found on server: ${response.code()}")
                        null
                    }
                } catch (e: Exception) {
                    android.util.Log.w("WarehouseRepository", "Error getting item from server: ${e.message}", e)
                    null
                }
            }
            
            serverItem ?: null
        } catch (e: Exception) {
            android.util.Log.e("WarehouseRepository", "Error getting item by barcode: ${e.message}", e)
            null
        }
    }
    
    suspend fun updateWarehouseItemBarcode(itemId: Int, barcode: String?, serverUrl: String? = null): Boolean {
        return try {
            // Check if item exists and is in stock
            val item = warehouseDao.getItemById(itemId)
            if (item == null) {
                android.util.Log.e("WarehouseRepository", "Item $itemId not found")
                return false
            }
            
            if (!item.inStock) {
                android.util.Log.w("WarehouseRepository", "Cannot assign barcode to item $itemId: item is not in stock")
                return false
            }
            
            // First, update locally
            warehouseDao.updateBarcode(itemId, barcode)
            android.util.Log.d("WarehouseRepository", "Barcode updated locally for item $itemId: $barcode")
            
            // Then try to sync with server if available
            val api = getApiService(serverUrl)
            api?.let { service ->
                try {
                    val response = service.updateWarehouseItemBarcode(
                        itemId,
                        com.servicecenter.data.api.UpdateBarcodeRequest(barcode)
                    )
                    if (response.isSuccessful) {
                        val success = response.body()?.get("success") == true
                        if (success) {
                            android.util.Log.d("WarehouseRepository", "Barcode synced with server for item $itemId")
                        } else {
                            android.util.Log.w("WarehouseRepository", "Server returned false for barcode update")
                        }
                        // Return true anyway because local update succeeded
                        return true
                    } else {
                        android.util.Log.w("WarehouseRepository", "Failed to sync barcode with server: ${response.code()}, but saved locally")
                        // Still return true because local update succeeded
                        return true
                    }
                } catch (e: Exception) {
                    android.util.Log.w("WarehouseRepository", "Error syncing barcode with server: ${e.message}, but saved locally", e)
                    // Still return true because local update succeeded
                    return true
                }
            } ?: run {
                android.util.Log.d("WarehouseRepository", "No server connection, barcode saved locally only")
                // Return true because local update succeeded
                return true
            }
        } catch (e: Exception) {
            android.util.Log.e("WarehouseRepository", "Error updating barcode locally: ${e.message}", e)
            false
        }
    }
    
    suspend fun deleteWarehouseItemBarcode(itemId: Int, serverUrl: String? = null): Boolean {
        val api = getApiService(serverUrl)
        return try {
            api?.let { service ->
                val response = service.deleteWarehouseItemBarcode(itemId)
                if (response.isSuccessful) {
                    response.body()?.get("success") == true
                } else {
                    android.util.Log.e("WarehouseRepository", "Failed to delete barcode: ${response.code()}")
                    false
                }
            } ?: false
        } catch (e: Exception) {
            android.util.Log.e("WarehouseRepository", "Error deleting barcode: ${e.message}", e)
            false
        }
    }
    
    suspend fun sellItem(item: WarehouseItem, price: Double, paymentType: String, serverUrl: String? = null): Boolean {
        val api = getApiService(serverUrl)
        return try {
            api?.let { service ->
                // Get next receipt ID
                val receiptIdResponse = service.getNextReceiptId()
                if (!receiptIdResponse.isSuccessful) {
                    android.util.Log.e("WarehouseRepository", "Failed to get next receipt ID: ${receiptIdResponse.code()}")
                    return false
                }
                
                val nextReceiptId = receiptIdResponse.body()?.data?.nextReceiptId
                    ?: run {
                        android.util.Log.e("WarehouseRepository", "Next receipt ID is null")
                        return false
                    }
                
                // Create repair (receipt)
                val now = java.time.Instant.now().toString()
                // Status "Видано" = 6 (will be converted on server)
                val repair = com.servicecenter.data.models.Repair(
                    id = null,
                    receiptId = nextReceiptId,
                    deviceName = item.name,
                    faultDesc = "",
                    workDone = "",
                    costLabor = 0.0,
                    totalCost = price,
                    isPaid = true, // Mark as paid immediately
                    status = "Видано", // Server will convert to 6
                    clientName = "",
                    clientPhone = "",
                    profit = price - (item.costUah ?: 0.0),
                    dateStart = now,
                    dateEnd = now,
                    note = "",
                    shouldCall = false,
                    executor = "",
                    paymentType = paymentType
                )
                
                val createRepairResponse = service.createRepair(repair)
                if (!createRepairResponse.isSuccessful) {
                    android.util.Log.e("WarehouseRepository", "Failed to create repair: ${createRepairResponse.code()}")
                    return false
                }
                
                val repairId = createRepairResponse.body()?.id
                    ?: run {
                        android.util.Log.e("WarehouseRepository", "Repair ID is null")
                        return false
                    }
                
                // Add item to repair
                val addPartRequest = com.servicecenter.data.api.AddPartToRepairRequest(
                    partId = item.id,
                    receiptId = nextReceiptId,
                    priceUah = price,
                    costUah = item.costUah ?: 0.0,
                    supplier = item.supplier ?: "",
                    name = item.name,
                    isPaid = true,
                    dateEnd = now
                )
                
                val addPartResponse = service.addPartToRepair(repairId, addPartRequest)
                if (!addPartResponse.isSuccessful) {
                    android.util.Log.e("WarehouseRepository", "Failed to add part to repair: ${addPartResponse.code()}")
                    return false
                }
                
                true
            } ?: false
        } catch (e: Exception) {
            android.util.Log.e("WarehouseRepository", "Error selling item: ${e.message}", e)
            false
        }
    }
}

