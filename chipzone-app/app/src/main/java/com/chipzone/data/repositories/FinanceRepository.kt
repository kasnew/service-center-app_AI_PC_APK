package com.chipzone.data.repositories

import com.chipzone.data.models.Finance
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FinanceRepository @Inject constructor(
    private val financeDao: FinanceDao
) {
    fun getAllFinance(): Flow<List<Finance>> = financeDao.getAllFinance()
    
    fun getFinanceByType(type: String): Flow<List<Finance>> = financeDao.getFinanceByType(type)
    
    suspend fun getFinanceById(id: Int): Finance? = financeDao.getFinanceById(id)
    
    fun getTotalIncome(): Flow<Double?> = financeDao.getTotalIncome()
    
    fun getTotalExpense(): Flow<Double?> = financeDao.getTotalExpense()
    
    suspend fun insertFinance(finance: Finance): Long = financeDao.insertFinance(finance)
    
    suspend fun updateFinance(finance: Finance) = financeDao.updateFinance(finance)
    
    suspend fun deleteFinance(finance: Finance) = financeDao.deleteFinance(finance)
    
    fun getFinanceByDateRange(type: String, startDate: String, endDate: String): Flow<Double?> =
        financeDao.getFinanceByDateRange(type, startDate, endDate)
}

