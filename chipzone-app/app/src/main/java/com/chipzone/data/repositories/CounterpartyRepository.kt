package com.chipzone.data.repositories

import com.chipzone.data.models.Counterparty
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CounterpartyRepository @Inject constructor(
    private val counterpartyDao: CounterpartyDao
) {
    fun getAllCounterparties(): Flow<List<Counterparty>> = counterpartyDao.getAllCounterparties()
    
    suspend fun getCounterpartyById(id: Int): Counterparty? = counterpartyDao.getCounterpartyById(id)
    
    suspend fun getCounterpartyByName(name: String): Counterparty? = counterpartyDao.getCounterpartyByName(name)
    
    suspend fun insertCounterparty(counterparty: Counterparty): Long = counterpartyDao.insertCounterparty(counterparty)
    
    suspend fun updateCounterparty(counterparty: Counterparty) = counterpartyDao.updateCounterparty(counterparty)
    
    suspend fun deleteCounterparty(counterparty: Counterparty) = counterpartyDao.deleteCounterparty(counterparty)
}

