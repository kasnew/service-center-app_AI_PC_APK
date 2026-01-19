package com.servicecenter.data.local.dao

import androidx.room.*
import com.servicecenter.data.models.Repair
import kotlinx.coroutines.flow.Flow

@Dao
interface RepairDao {
    @Query("SELECT * FROM repairs ORDER BY receiptId DESC")
    fun getAllRepairs(): Flow<List<Repair>>
    
    @Query("SELECT * FROM repairs WHERE id = :id")
    suspend fun getRepairById(id: Int): Repair?
    
    @Query("SELECT * FROM repairs WHERE synced = 0")
    suspend fun getUnsyncedRepairs(): List<Repair>
    
    @Query("SELECT * FROM repairs WHERE clientName LIKE '%' || :query || '%' OR clientPhone LIKE '%' || :query || '%' OR deviceName LIKE '%' || :query || '%' OR CAST(receiptId AS TEXT) LIKE '%' || :query || '%'")
    fun searchRepairs(query: String): Flow<List<Repair>>
    
    @Query("SELECT * FROM repairs WHERE status = :status ORDER BY receiptId DESC")
    fun getRepairsByStatus(status: String): Flow<List<Repair>>
    
    @Query("SELECT * FROM repairs WHERE status = :status AND (clientName LIKE '%' || :query || '%' OR clientPhone LIKE '%' || :query || '%' OR deviceName LIKE '%' || :query || '%' OR CAST(receiptId AS TEXT) LIKE '%' || :query || '%')")
    fun searchRepairsByStatus(query: String, status: String): Flow<List<Repair>>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRepair(repair: Repair): Long
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRepairs(repairs: List<Repair>)
    
    @Update
    suspend fun updateRepair(repair: Repair)
    
    @Delete
    suspend fun deleteRepair(repair: Repair)
    
    @Query("DELETE FROM repairs")
    suspend fun deleteAll()
    
    @Query("SELECT MAX(receiptId) FROM repairs")
    suspend fun getMaxReceiptId(): Int?
    
    @Query("SELECT * FROM repairs WHERE receiptId = :receiptId AND synced = 0 LIMIT 1")
    suspend fun getUnsyncedRepairByReceiptId(receiptId: Int): Repair?
}


