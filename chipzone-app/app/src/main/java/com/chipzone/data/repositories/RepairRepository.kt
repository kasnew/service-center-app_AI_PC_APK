package com.chipzone.data.repositories

import com.chipzone.data.models.Repair
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RepairRepository @Inject constructor(
    private val repairDao: RepairDao
) {
    fun getAllRepairs(): Flow<List<Repair>> = repairDao.getAllRepairs()
    
    suspend fun getRepairById(id: Int): Repair? = repairDao.getRepairById(id)
    
    fun getRepairsByClient(clientId: Int): Flow<List<Repair>> = repairDao.getRepairsByClient(clientId)
    
    fun getRepairsByStatus(status: String): Flow<List<Repair>> = repairDao.getRepairsByStatus(status)
    
    fun searchRepairs(search: String): Flow<List<Repair>> {
        // Add wildcards for LIKE query and make case-insensitive
        val searchPattern = "%${search.lowercase()}%"
        return repairDao.searchRepairs(searchPattern)
    }
    
    suspend fun insertRepair(repair: Repair): Long = repairDao.insertRepair(repair)
    
    suspend fun updateRepair(repair: Repair) = repairDao.updateRepair(repair)
    
    suspend fun deleteRepair(repair: Repair) = repairDao.deleteRepair(repair)
    
    fun getRepairCountByStatus(status: String): Flow<Int> = repairDao.getRepairCountByStatus(status)
    
    suspend fun getNextReceiptId(): Int {
        val maxId = repairDao.getMaxReceiptId() ?: 0
        return maxId + 1
    }
}

