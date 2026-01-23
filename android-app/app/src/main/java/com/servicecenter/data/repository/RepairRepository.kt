package com.servicecenter.data.repository

import com.servicecenter.data.api.ApiClient
import com.servicecenter.data.api.ApiService
import com.servicecenter.data.local.dao.RepairDao
import com.servicecenter.data.models.Repair
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flow

class RepairRepository(
    private val apiClient: ApiClient?,
    private val repairDao: RepairDao
) {
    private fun getApiService(serverUrl: String?): ApiService? {
        return if (serverUrl != null && serverUrl.isNotEmpty()) {
            apiClient?.getApiService(serverUrl)
        } else {
            null
        }
    }
    fun getAllRepairs(): Flow<List<Repair>> = repairDao.getAllRepairs()
    
    fun searchRepairs(query: String): Flow<List<Repair>> = repairDao.searchRepairs(query)
    
    fun getRepairsByStatus(status: String): Flow<List<Repair>> = repairDao.getRepairsByStatus(status)
    
    fun searchRepairsByStatus(query: String, status: String): Flow<List<Repair>> = repairDao.searchRepairsByStatus(query, status)
    
    suspend fun getRepairById(id: Int): Repair? = repairDao.getRepairById(id)
    
    suspend fun getNextReceiptId(serverUrl: String? = null): Int? {
        val api = getApiService(serverUrl)
        return try {
            api?.let { service ->
                val response = service.getNextReceiptId()
                if (response.isSuccessful) {
                    response.body()?.data?.nextReceiptId
                } else {
                    android.util.Log.w("RepairRepository", "Failed to get next receipt ID from server: ${response.code()}, using local fallback")
                    // Fallback to local database
                    getNextReceiptIdFromLocal()
                }
            } ?: run {
                // No API available (offline mode), use local database
                android.util.Log.d("RepairRepository", "No API available, using local database for next receipt ID")
                getNextReceiptIdFromLocal()
            }
        } catch (e: Exception) {
            android.util.Log.w("RepairRepository", "Error getting next receipt ID from server: ${e.message}, using local fallback", e)
            // Fallback to local database
            getNextReceiptIdFromLocal()
        }
    }
    
    private suspend fun getNextReceiptIdFromLocal(): Int {
        return try {
            val maxId = repairDao.getMaxReceiptId() ?: 0
            val nextId = maxId + 1
            android.util.Log.d("RepairRepository", "Next receipt ID from local database: $nextId (max was: $maxId)")
            nextId
        } catch (e: Exception) {
            android.util.Log.e("RepairRepository", "Error getting max receipt ID from local database: ${e.message}", e)
            1 // Default to 1 if database is empty or error occurs
        }
    }
    
    suspend fun getExecutors(serverUrl: String? = null): List<com.servicecenter.data.api.Executor> {
        val api = getApiService(serverUrl)
        return try {
            api?.let { service ->
                val response = service.getExecutors()
                if (response.isSuccessful) {
                    response.body()?.data ?: emptyList()
                } else {
                    android.util.Log.e("RepairRepository", "Failed to get executors: ${response.code()}")
                    emptyList()
                }
            } ?: emptyList()
        } catch (e: Exception) {
            android.util.Log.e("RepairRepository", "Error getting executors: ${e.message}", e)
            emptyList()
        }
    }
    
    suspend fun syncRepairs(serverUrl: String? = null) {
        val api = getApiService(serverUrl)
        if (api == null) {
            android.util.Log.w("RepairRepository", "Cannot sync: serverUrl is null or empty")
            return
        }
        
        try {
            android.util.Log.d("RepairRepository", "Starting sync with serverUrl: $serverUrl")
            val response = api.getRepairs(limit = 1000)
            android.util.Log.d("RepairRepository", "Response code: ${response.code()}, isSuccessful: ${response.isSuccessful()}")
            
            if (response.isSuccessful) {
                val body = response.body()
                android.util.Log.d("RepairRepository", "Response body: $body")
                
                body?.data?.let { repairs ->
                    android.util.Log.d("RepairRepository", "Received ${repairs.size} repairs from server")
                    // Get all existing repair IDs from local DB
                    val existingRepairs = repairDao.getAllRepairs().first()
                    val existingIds = existingRepairs.mapNotNull { it.id }.toSet()
                    val serverIds = repairs.mapNotNull { it.id }.toSet()
                    
                    // IMPORTANT: Only delete repairs that:
                    // 1. Have an ID (were synced before)
                    // 2. Exist on server but not in server response (were deleted on server)
                    // DO NOT delete unsynced repairs (those without ID) - they are new local repairs
                    val toDelete = existingRepairs.filter { repair ->
                        repair.id != null && // Has ID (was synced)
                        repair.synced && // Was synced
                        !serverIds.contains(repair.id) // Not in server response
                    }
                    
                    if (toDelete.isNotEmpty()) {
                        android.util.Log.d("RepairRepository", "Deleting ${toDelete.size} repairs that were removed on server")
                        toDelete.forEach { repair ->
                            repairDao.deleteRepair(repair)
                        }
                    }
                    
                    // Insert/update repairs from server
                    // Status is already converted to string by RepairStatusAdapter
                    repairDao.insertRepairs(repairs.map { repair ->
                        repair.copy(synced = true)
                    })
                    android.util.Log.d("RepairRepository", "Inserted/updated ${repairs.size} repairs into local database")
                } ?: android.util.Log.w("RepairRepository", "Response body is null or data is null")
            } else {
                android.util.Log.e("RepairRepository", "Sync failed: ${response.code()} - ${response.message()}")
                android.util.Log.e("RepairRepository", "Error body: ${response.errorBody()?.string()}")
            }
        } catch (e: Exception) {
            android.util.Log.e("RepairRepository", "Sync error: ${e.javaClass.simpleName} - ${e.message}", e)
            e.printStackTrace()
        }
    }
    
    suspend fun createRepair(repair: Repair, serverUrl: String? = null): Result<Repair> {
        return try {
            // Check if repair with same receiptId already exists (unsynced)
            val existingUnsynced = repairDao.getUnsyncedRepairByReceiptId(repair.receiptId)
            if (existingUnsynced != null) {
                android.util.Log.w("RepairRepository", "Repair with receiptId ${repair.receiptId} already exists, skipping duplicate")
                return Result.success(existingUnsynced)
            }
            
            val api = getApiService(serverUrl)
            if (api != null) {
                val response = api.createRepair(repair)
                if (response.isSuccessful) {
                    val createdRepair = repair.copy(
                        id = response.body()?.id,
                        synced = true
                    )
                    repairDao.insertRepair(createdRepair)
                    android.util.Log.d("RepairRepository", "Repair created successfully on server: ${createdRepair.receiptId}")
                    Result.success(createdRepair)
                } else {
                    // Save locally for later sync
                    android.util.Log.w("RepairRepository", "Server response failed, saving locally: ${repair.receiptId}")
                    val localRepair = repair.copy(synced = false)
                    repairDao.insertRepair(localRepair)
                    Result.success(localRepair)
                }
            } else {
                // Offline mode
                android.util.Log.d("RepairRepository", "Offline mode, saving locally: ${repair.receiptId}")
                val localRepair = repair.copy(synced = false)
                repairDao.insertRepair(localRepair)
                Result.success(localRepair)
            }
        } catch (e: Exception) {
            android.util.Log.e("RepairRepository", "Error creating repair: ${e.message}", e)
            // Check again before saving to avoid duplicates on retry
            val existingUnsynced = repairDao.getUnsyncedRepairByReceiptId(repair.receiptId)
            if (existingUnsynced != null) {
                android.util.Log.w("RepairRepository", "Repair already exists after error, returning existing: ${repair.receiptId}")
                return Result.success(existingUnsynced)
            }
            // Save locally for later sync
            val localRepair = repair.copy(synced = false)
            repairDao.insertRepair(localRepair)
            Result.failure(e)
        }
    }
    
    suspend fun updateRepair(repair: Repair, serverUrl: String? = null): Result<Repair> {
        return try {
            repair.id?.let { id ->
                val api = getApiService(serverUrl)
                if (api != null) {
                    val response = api.updateRepair(id, repair)
                    if (response.isSuccessful) {
                        val updatedRepair = repair.copy(synced = true)
                        repairDao.updateRepair(updatedRepair)
                        Result.success(updatedRepair)
                    } else {
                        val localRepair = repair.copy(synced = false)
                        repairDao.updateRepair(localRepair)
                        Result.success(localRepair)
                    }
                } else {
                    val localRepair = repair.copy(synced = false)
                    repairDao.updateRepair(localRepair)
                    Result.success(localRepair)
                }
            } ?: Result.failure(Exception("Repair ID is null"))
        } catch (e: Exception) {
            val localRepair = repair.copy(synced = false)
            repairDao.updateRepair(localRepair)
            Result.failure(e)
        }
    }
    
    suspend fun deleteRepair(repair: Repair, serverUrl: String? = null) {
        try {
            // Always delete from local database first
            repairDao.deleteRepair(repair)
            android.util.Log.d("RepairRepository", "Deleted repair locally: ${repair.receiptId}")
            
            // Try to delete from server if available
            repair.id?.let { id ->
                try {
                    val api = getApiService(serverUrl)
                    api?.let { service ->
                        val response = service.deleteRepair(id)
                        if (response.isSuccessful) {
                            android.util.Log.d("RepairRepository", "Deleted repair on server: $id")
                        } else {
                            android.util.Log.w("RepairRepository", "Failed to delete repair on server: ${response.code()}")
                        }
                    } ?: android.util.Log.d("RepairRepository", "No API available, deleted only locally: ${repair.receiptId}")
                } catch (e: Exception) {
                    android.util.Log.w("RepairRepository", "Error deleting repair on server (offline?): ${e.message}")
                    // Continue - repair is already deleted locally
                }
            } ?: android.util.Log.d("RepairRepository", "Repair has no ID, deleted only locally: ${repair.receiptId}")
        } catch (e: Exception) {
            android.util.Log.e("RepairRepository", "Error deleting repair: ${e.message}", e)
            throw e // Re-throw to let ViewModel handle it
        }
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
        dateEnd: String?,
        serverUrl: String? = null
    ): Result<Boolean> {
        val api = getApiService(serverUrl)
        return try {
            api?.let { service ->
                val request = com.servicecenter.data.api.AddPartToRepairRequest(
                    partId = partId,
                    receiptId = receiptId,
                    priceUah = priceUah,
                    costUah = costUah,
                    supplier = supplier,
                    name = name,
                    isPaid = isPaid,
                    dateEnd = dateEnd
                )
                val response = service.addPartToRepair(repairId, request)
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    android.util.Log.e("RepairRepository", "Failed to add part to repair: ${response.code()}")
                    Result.failure(Exception("Failed to add part to repair"))
                }
            } ?: Result.failure(Exception("No API available"))
        } catch (e: Exception) {
            android.util.Log.e("RepairRepository", "Error adding part to repair: ${e.message}", e)
            Result.failure(e)
        }
    }
    
    suspend fun syncUnsyncedRepairs(serverUrl: String? = null) {
        val unsynced = repairDao.getUnsyncedRepairs()
        val api = getApiService(serverUrl)
        unsynced.forEach { repair ->
            try {
                if (repair.id == null) {
                    // New repair
                    api?.let { service ->
                        val response = service.createRepair(repair)
                        if (response.isSuccessful) {
                            val syncedRepair = repair.copy(
                                id = response.body()?.id,
                                synced = true
                            )
                            repairDao.updateRepair(syncedRepair)
                        }
                    }
                } else {
                    // Update existing
                    api?.let { service ->
                        val response = service.updateRepair(repair.id, repair)
                        if (response.isSuccessful) {
                            val syncedRepair = repair.copy(synced = true)
                            repairDao.updateRepair(syncedRepair)
                        }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    // --- LOCKING METHODS ---

    suspend fun getLock(id: Int, serverUrl: String? = null): com.servicecenter.data.api.LockResponse? {
        val api = getApiService(serverUrl)
        return try {
            api?.getLock(id)?.body()
        } catch (e: Exception) {
            android.util.Log.e("RepairRepository", "Error checking lock for $id: ${e.message}")
            null
        }
    }

    suspend fun setLock(id: Int, device: String, serverUrl: String? = null): Boolean {
        val api = getApiService(serverUrl)
        return try {
            api?.setLock(id, com.servicecenter.data.api.LockRequest(device))?.isSuccessful ?: false
        } catch (e: Exception) {
            android.util.Log.e("RepairRepository", "Error setting lock for $id: ${e.message}")
            false
        }
    }

    suspend fun releaseLock(id: Int, serverUrl: String? = null): Boolean {
        val api = getApiService(serverUrl)
        return try {
            api?.releaseLock(id)?.isSuccessful ?: false
        } catch (e: Exception) {
            android.util.Log.e("RepairRepository", "Error releasing lock for $id: ${e.message}")
            false
        }
    }

    // --- REFUND METHODS ---

    suspend fun processRefund(
        repairId: Int,
        receiptId: Int,
        refundAmount: Double,
        refundType: String,
        returnPartsToWarehouse: Boolean,
        note: String? = null,
        serverUrl: String? = null
    ): Result<Boolean> {
        val api = getApiService(serverUrl)
        return try {
            api?.let { service ->
                val request = com.servicecenter.data.api.RefundRequest(
                    receiptId = receiptId,
                    refundAmount = refundAmount,
                    refundType = refundType,
                    returnPartsToWarehouse = returnPartsToWarehouse,
                    note = note
                )
                val response = service.processRefund(repairId, request)
                if (response.isSuccessful) {
                    val body = response.body()
                    if (body?.success == true) {
                        // Update local repair to reflect refund
                        repairDao.getRepairById(repairId)?.let { repair ->
                            val updatedRepair = repair.copy(
                                isPaid = false,
                                status = "4" // Ready status
                            )
                            repairDao.updateRepair(updatedRepair)
                        }
                        android.util.Log.d("RepairRepository", "Refund processed successfully for repair $repairId")
                        Result.success(true)
                    } else {
                        android.util.Log.e("RepairRepository", "Refund failed: ${body?.error}")
                        Result.failure(Exception(body?.error ?: "Unknown error"))
                    }
                } else {
                    android.util.Log.e("RepairRepository", "Failed to process refund: ${response.code()}")
                    Result.failure(Exception("Failed to process refund: ${response.code()}"))
                }
            } ?: Result.failure(Exception("No API available - refund requires server connection"))
        } catch (e: Exception) {
            android.util.Log.e("RepairRepository", "Error processing refund: ${e.message}", e)
            Result.failure(e)
        }
    }
}


