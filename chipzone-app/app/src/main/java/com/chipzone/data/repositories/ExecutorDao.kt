package com.chipzone.data.repositories

import androidx.room.*
import com.chipzone.data.models.Executor
import kotlinx.coroutines.flow.Flow

@Dao
interface ExecutorDao {
    @Query("SELECT * FROM executors ORDER BY name ASC")
    fun getAllExecutors(): Flow<List<Executor>>
    
    @Query("SELECT * FROM executors WHERE id = :id")
    suspend fun getExecutorById(id: Int): Executor?
    
    @Query("SELECT * FROM executors WHERE name = :name LIMIT 1")
    suspend fun getExecutorByName(name: String): Executor?
    
    @Query("SELECT COUNT(*) FROM executors")
    suspend fun getExecutorCount(): Int
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertExecutor(executor: Executor): Long
    
    @Update
    suspend fun updateExecutor(executor: Executor)
    
    @Delete
    suspend fun deleteExecutor(executor: Executor)
}

