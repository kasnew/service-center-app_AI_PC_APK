package com.chipzone.data.repositories

import androidx.room.*
import com.chipzone.data.models.Finance
import kotlinx.coroutines.flow.Flow

@Dao
interface FinanceDao {
    @Query("SELECT * FROM finance ORDER BY createdAt DESC")
    fun getAllFinance(): Flow<List<Finance>>
    
    @Query("SELECT * FROM finance WHERE type = :type ORDER BY createdAt DESC")
    fun getFinanceByType(type: String): Flow<List<Finance>>
    
    @Query("SELECT * FROM finance WHERE id = :id")
    suspend fun getFinanceById(id: Int): Finance?
    
    @Query("SELECT SUM(amount) FROM finance WHERE type = 'income'")
    fun getTotalIncome(): Flow<Double?>
    
    @Query("SELECT SUM(amount) FROM finance WHERE type = 'expense'")
    fun getTotalExpense(): Flow<Double?>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertFinance(finance: Finance): Long
    
    @Update
    suspend fun updateFinance(finance: Finance)
    
    @Delete
    suspend fun deleteFinance(finance: Finance)
    
    @Query("""
        SELECT SUM(amount) FROM finance 
        WHERE type = :type 
        AND createdAt >= :startDate 
        AND createdAt <= :endDate
    """)
    fun getFinanceByDateRange(type: String, startDate: String, endDate: String): Flow<Double?>
}

