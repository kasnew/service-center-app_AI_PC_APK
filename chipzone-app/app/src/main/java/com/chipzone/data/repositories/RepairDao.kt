package com.chipzone.data.repositories

import androidx.room.*
import com.chipzone.data.models.Repair
import kotlinx.coroutines.flow.Flow

@Dao
interface RepairDao {
    @Query("SELECT * FROM repairs ORDER BY createdAt DESC")
    fun getAllRepairs(): Flow<List<Repair>>
    
    @Query("SELECT * FROM repairs WHERE id = :id")
    suspend fun getRepairById(id: Int): Repair?
    
    @Query("SELECT * FROM repairs WHERE clientId = :clientId ORDER BY createdAt DESC")
    fun getRepairsByClient(clientId: Int): Flow<List<Repair>>
    
    @Query("SELECT * FROM repairs WHERE status = :status ORDER BY createdAt DESC")
    fun getRepairsByStatus(status: String): Flow<List<Repair>>
    
    @Query("""
        SELECT * FROM repairs 
        WHERE LOWER(description) LIKE LOWER(:search) 
        OR LOWER(deviceName) LIKE LOWER(:search)
        OR CAST(receiptId AS TEXT) LIKE :search
        OR CAST(totalCost AS TEXT) LIKE :search
        ORDER BY createdAt DESC
    """)
    fun searchRepairs(search: String): Flow<List<Repair>>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRepair(repair: Repair): Long
    
    @Update
    suspend fun updateRepair(repair: Repair)
    
    @Delete
    suspend fun deleteRepair(repair: Repair)
    
    @Query("SELECT COUNT(*) FROM repairs WHERE status = :status")
    fun getRepairCountByStatus(status: String): Flow<Int>
    
    @Query("SELECT MAX(receiptId) FROM repairs WHERE receiptId IS NOT NULL")
    suspend fun getMaxReceiptId(): Int?
}

