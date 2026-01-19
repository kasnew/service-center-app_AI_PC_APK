package com.servicecenter.data.local.dao

import androidx.room.*
import com.servicecenter.data.models.Transaction
import kotlinx.coroutines.flow.Flow

@Dao
interface TransactionDao {
    @Query("SELECT * FROM transactions ORDER BY dateExecuted DESC")
    fun getAllTransactions(): Flow<List<Transaction>>
    
    @Query("SELECT * FROM transactions WHERE dateExecuted BETWEEN :startDate AND :endDate ORDER BY dateExecuted DESC")
    fun getTransactionsByDateRange(startDate: String, endDate: String): Flow<List<Transaction>>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTransaction(transaction: Transaction): Long
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTransactions(transactions: List<Transaction>)
    
    @Query("DELETE FROM transactions")
    suspend fun deleteAll()
}


