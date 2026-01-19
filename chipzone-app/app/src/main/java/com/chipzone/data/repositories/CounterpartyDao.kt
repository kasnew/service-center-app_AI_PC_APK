package com.chipzone.data.repositories

import androidx.room.*
import com.chipzone.data.models.Counterparty
import kotlinx.coroutines.flow.Flow

@Dao
interface CounterpartyDao {
    @Query("SELECT * FROM counterparties ORDER BY name ASC")
    fun getAllCounterparties(): Flow<List<Counterparty>>
    
    @Query("SELECT * FROM counterparties WHERE id = :id")
    suspend fun getCounterpartyById(id: Int): Counterparty?
    
    @Query("SELECT * FROM counterparties WHERE name = :name LIMIT 1")
    suspend fun getCounterpartyByName(name: String): Counterparty?
    
    @Query("SELECT COUNT(*) FROM counterparties")
    suspend fun getCounterpartyCount(): Int
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCounterparty(counterparty: Counterparty): Long
    
    @Update
    suspend fun updateCounterparty(counterparty: Counterparty)
    
    @Delete
    suspend fun deleteCounterparty(counterparty: Counterparty)
}

