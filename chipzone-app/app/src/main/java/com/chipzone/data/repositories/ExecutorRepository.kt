package com.chipzone.data.repositories

import com.chipzone.data.models.Executor
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ExecutorRepository @Inject constructor(
    private val executorDao: ExecutorDao
) {
    fun getAllExecutors(): Flow<List<Executor>> = executorDao.getAllExecutors()
    
    suspend fun getExecutorById(id: Int): Executor? = executorDao.getExecutorById(id)
    
    suspend fun getExecutorByName(name: String): Executor? = executorDao.getExecutorByName(name)
    
    suspend fun insertExecutor(executor: Executor): Long = executorDao.insertExecutor(executor)
    
    suspend fun updateExecutor(executor: Executor) = executorDao.updateExecutor(executor)
    
    suspend fun deleteExecutor(executor: Executor) = executorDao.deleteExecutor(executor)
}

